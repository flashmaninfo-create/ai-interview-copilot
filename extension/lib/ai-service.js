// AI Service - Real LLM Integration with Mode-Specific Prompts
// Uses PromptEngine for strict behavior control per button mode
// Ntro-level accuracy with router, validator, and metrics

import { supabaseREST } from './supabase-config.js';
import { PromptEngine } from './prompt-engine.js';
import { getVisionPreprocessor } from './vision-preprocessor.js';
import { LLMRouter } from './llm-router.js';
import { ResponseValidator } from './response-validator.js';
import { LanguageResolver } from './language-resolver.js';
import { IntentClassifier } from './intent-classifier.js';
import { getMetricsLogger } from './metrics-logger.js';

export class AIService {
    constructor() {
        this.cachedConfig = null;
        this.configCacheTime = 0;
        this.CONFIG_CACHE_TTL = 60 * 1000; // 1 minute - shorter TTL for faster admin updates
        this.contextManager = null; // Set externally by BackgroundService
        this.visionPreprocessor = getVisionPreprocessor();
    }

    /**
     * Set the InterviewContextManager reference for cached context
     */
    setContextManager(manager) {
        this.contextManager = manager;
    }

    /**
     * Pre-warm the LLM config cache (call on session start)
     */
    async warmup() {
        try {
            await this.getLLMConfig();
            console.log('[AIService] Config pre-warmed');
        } catch (e) {
            console.log('[AIService] Warmup failed:', e.message);
        }
    }

    async getHint(context) {
        let configError = null;

        try {
            // Get LLM configuration from database (cached)
            const configResult = await this.getLLMConfigWithError();

            if (!configResult.config) {
                console.log('[AIService] No LLM configured, using fallback. Reason:', configResult.error);
                return this.generateFallbackHint(context, configResult.error);
            }

            const config = configResult.config;

            // Handle code_from_screenshots request (from "Code for Me" button)
            if (context.requestType === 'code_from_screenshots' && context.screenshots?.length > 0) {
                console.log('[AIService] Processing screenshots for code generation:', context.screenshots.length);
                return await this.generateCodeFromScreenshots(config, context);
            }

            // Handle live screen frame from background (Screen Sharing Context)
            if (context.screenFrame) {
                console.log('[AIService] Processing live screen frame context...');
                try {
                    // Treat as a high-priority "screenshot" for context extraction
                    const processed = await this.visionPreprocessor.processScreenshots([
                        { id: 'live_frame', imageUrl: context.screenFrame, order: 0 }
                    ]);

                    // Attach the processed visual context (code, text, problem statement)
                    // This will be used by PromptEngine to enrich the prompt
                    context.visualContext = processed;

                    console.log('[AIService] Visual context extracted. Code found:', !!processed.code, 'Problem found:', !!processed.problemStatement);
                } catch (err) {
                    console.error('[AIService] Failed to process live screen frame:', err);
                }
            }
            // FALLBACK: Process saved screenshots if no live screenFrame
            else if (context.screenshots?.length > 0) {
                console.log('[AIService] Processing saved screenshots for context:', context.screenshots.length);
                try {
                    // Filter to selected screenshots if specified
                    let screenshotsToProcess = context.screenshots;
                    if (context.selectedScreenshotIds?.length > 0) {
                        screenshotsToProcess = context.screenshots.filter(s =>
                            context.selectedScreenshotIds.includes(s.id)
                        );
                    }

                    // Take most recent screenshots (limit to 3 for performance)
                    const recentScreenshots = screenshotsToProcess.slice(-3);

                    if (recentScreenshots.length > 0) {
                        const processed = await this.visionPreprocessor.processScreenshots(
                            recentScreenshots.map((s, i) => ({
                                id: s.id,
                                imageUrl: s.image_url || s.imageUrl,
                                order: i
                            }))
                        );

                        context.visualContext = processed;
                        console.log('[AIService] Screenshot context extracted. Code found:', !!processed.code, 'Problem found:', !!processed.problemStatement);
                    }
                } catch (err) {
                    console.error('[AIService] Failed to process screenshots:', err);
                }
            }

            // Build the prompt using PromptEngine
            const prompt = this.buildPrompt(context);

            // Track timing for metrics
            const startTime = Date.now();

            // Call the appropriate LLM API with mode-specific settings
            const response = await this.callLLM(config, prompt, context);

            const responseTime = Date.now() - startTime;

            // Apply quality validation and stealth formatting
            const validated = ResponseValidator.validate(
                response,
                context.requestType || 'help',
                { ocrText: context.visualContext?.extractedTexts?.join(' ') || '' }
            );

            // Log metrics
            const metrics = getMetricsLogger();
            metrics.log({
                mode: context.requestType || 'help',
                provider: config.provider.slug,
                model: config.model.model_id,
                responseTime,
                languageMatch: true, // TODO: implement language match check
                bannedPhraseHits: validated.metrics?.bannedPhraseHits || 0,
                success: validated.valid
            });

            return {
                hint: validated.text,
                type: context.requestType || 'hint',
                timestamp: new Date().toISOString(),
                model: config.model.model_id,
                provider: config.provider.slug,
                validationIssues: validated.issues
            };
        } catch (error) {
            console.error('[AIService] Error getting hint:', error);
            // Fall back to simulated hints on error
            return this.generateFallbackHint(context, error.message);
        }
    }

    /**
     * Generate code from captured screenshots
     */
    async generateCodeFromScreenshots(config, context) {
        const { screenshots } = context;
        const interviewContext = this.contextManager?.getContext() || {};

        // Process screenshots to extract text
        const processedData = await this.visionPreprocessor.processScreenshots(screenshots);

        // Build optimized prompt
        const promptData = this.visionPreprocessor.buildCodePrompt(processedData, {
            preferredLanguage: interviewContext.preferredLanguage || context.preferredLanguage || 'python',
            codingPlatform: interviewContext.codingPlatform || context.codingPlatform || 'unknown'
        });

        // Create prompt structure for LLM
        const prompt = {
            systemMessage: `You are an expert competitive programmer and coding interview assistant. Generate clean, efficient, working code. Be concise but complete.`,
            userPrompt: promptData.textPrompt,
            maxTokens: 1500,  // More tokens for code generation
            temperature: 0.2  // Lower temp for more consistent code
        };

        // If vision is required, add image context note
        if (promptData.requiresImages) {
            prompt.userPrompt += `\n\n[Note: Screenshots are attached. Please analyze them visually to understand the complete problem.]`;
            // TODO: For vision models, pass images directly
        }

        // Call the LLM
        const response = await this.callLLM(config, prompt);

        return {
            hint: response,
            type: 'code_from_screenshots',
            timestamp: new Date().toISOString(),
            model: config.model.model_id,
            provider: config.provider.slug,
            screenshotCount: screenshots.length
        };
    }

    async getLLMConfigWithError() {
        // Check cache first (1 minute TTL for quicker updates after admin changes)
        if (this.cachedConfig && Date.now() - this.configCacheTime < this.CONFIG_CACHE_TTL) {
            console.log('[AIService] Using cached LLM config');
            return { config: this.cachedConfig, error: null };
        }

        try {
            console.log('[AIService] Fetching fresh LLM config from database...');
            const result = await supabaseREST.getLLMConfig();

            console.log('[AIService] LLM config result:', JSON.stringify(result));

            // The RPC returns { success: true/false, provider: {...}, model: {...}, error: '...' }
            if (result && result.success === true && result.provider && result.model) {
                this.cachedConfig = result;
                this.configCacheTime = Date.now();
                console.log('[AIService] ✅ Loaded LLM config:', result.provider?.name, result.model?.model_id);
                return { config: result, error: null };
            } else {
                // Clear cache on failure so next request tries again
                this.cachedConfig = null;
                this.configCacheTime = 0;
                const errorMsg = result?.error || 'NO_PROVIDER_ENABLED';
                console.warn('[AIService] ❌ LLM config not available:', errorMsg);
                return { config: null, error: errorMsg };
            }
        } catch (error) {
            // Clear cache on error
            this.cachedConfig = null;
            this.configCacheTime = 0;
            console.error('[AIService] ❌ Error fetching LLM config:', error);
            return { config: null, error: error.message };
        }
    }

    // Legacy method for backward compatibility
    async getLLMConfig() {
        const result = await this.getLLMConfigWithError();
        return result.config;
    }

    /**
     * Force refresh the LLM config cache
     */
    clearConfigCache() {
        this.cachedConfig = null;
        this.configCacheTime = 0;
        console.log('[AIService] Config cache cleared');
    }

    buildPrompt(context) {
        const { requestType = 'help', customPrompt } = context;

        // Get cached interview context from InterviewContextManager
        const cachedContext = this.contextManager?.getContext() || {};

        // Merge with any context passed directly
        const mergedContext = {
            ...cachedContext,
            role: context.interviewContext?.role || cachedContext.role,
            experienceLevel: context.interviewContext?.experienceLevel || cachedContext.experienceLevel,
            interviewType: context.interviewContext?.interviewType || cachedContext.interviewType,
            techStack: context.interviewContext?.techStack || cachedContext.techStack
        };

        // Use PromptEngine for strict mode-based prompts
        return PromptEngine.buildPrompt(requestType, mergedContext, customPrompt);
    }

    async callLLM(config, prompt, context = {}) {
        const { provider, model } = config;
        const apiKey = provider.api_key;

        // Log that we're using the admin-configured provider exclusively
        console.log(`[AIService] ✅ Using admin-configured provider: ${provider.slug} (model: ${model.model_id})`);

        if (!apiKey) {
            throw new Error('No API key configured for provider');
        }

        // Use prompt's temperature and maxTokens (mode-specific)
        const temperature = prompt.temperature || 0.3;
        const maxTokens = prompt.maxTokens || 200;

        // Check if we have a screenshot for vision analysis
        const hasScreenshot = context.currentScreenshot && context.currentScreenshot.startsWith('data:image');

        // DeepSeek doesn't support vision - warn user
        if (hasScreenshot && provider.slug === 'deepseek') {
            console.warn('[AIService] DeepSeek does not support vision/image analysis');
            console.warn('[AIService] For screen analysis, please enable OpenAI (GPT-4o), Anthropic (Claude 3), or Google (Gemini 1.5) in Admin Panel');
            // Clear the screenshot so we don't try to send it
            context.currentScreenshot = null;
            // Modify the prompt to explain the limitation
            prompt.userPrompt = prompt.userPrompt + '\n\n[Note: Screen capture is active but your current LLM provider (DeepSeek) does not support image analysis. For screen-based code assistance, please enable OpenAI GPT-4o, Anthropic Claude 3, or Google Gemini in Admin Panel → Providers.]';
        }

        if (hasScreenshot && provider.slug !== 'deepseek') {
            console.log('[AIService] Screenshot detected - using vision API');
        }

        switch (provider.slug) {
            case 'openai':
                return await this.callOpenAI(apiKey, model.model_id, prompt, maxTokens, temperature, context);
            case 'anthropic':
                return await this.callAnthropic(apiKey, model.model_id, prompt, maxTokens, temperature, context);
            case 'google':
                return await this.callGoogle(apiKey, model.model_id, prompt, maxTokens, temperature, context);
            case 'deepseek':
                return await this.callDeepSeek(apiKey, model.model_id, prompt, maxTokens, temperature);
            default:
                throw new Error(`Unsupported provider: ${provider.slug}`);
        }
    }


    async callDeepSeek(apiKey, modelId, prompt, maxTokens = 200, temperature = 0.3) {
        console.log('[AIService] Calling DeepSeek:', modelId, 'temp:', temperature, 'tokens:', maxTokens);

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId, // e.g., 'deepseek-chat' or 'deepseek-reasoner'
                messages: [
                    { role: 'system', content: prompt.systemMessage },
                    { role: 'user', content: prompt.userPrompt }
                ],
                max_tokens: maxTokens,
                temperature: temperature
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AIService] DeepSeek error:', error);

            if (response.status === 429) {
                throw new Error('DeepSeek Rate Limit (429). Please check your DeepSeek account credits.');
            }

            throw new Error(`DeepSeek API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }

    async callOpenAI(apiKey, modelId, prompt, maxTokens = 200, temperature = 0.3, context = {}) {
        console.log('[AIService] Calling OpenAI:', modelId, 'temp:', temperature, 'tokens:', maxTokens);

        // Check if we have a screenshot for vision
        const hasScreenshot = context.currentScreenshot && context.currentScreenshot.startsWith('data:image');
        
        // Build messages - include image if present
        let userContent;
        if (hasScreenshot) {
            console.log('[AIService] Using OpenAI Vision mode with screenshot');
            // For vision models, use array content with image
            userContent = [
                { type: 'text', text: prompt.userPrompt + '\n\nAnalyze the screenshot above and provide the answer to the coding question shown.' },
                { 
                    type: 'image_url', 
                    image_url: { 
                        url: context.currentScreenshot,
                        detail: 'high' 
                    } 
                }
            ];
            // Use a vision-capable model
            if (!modelId.includes('vision') && !modelId.includes('gpt-4o') && !modelId.includes('gpt-4-turbo')) {
                modelId = 'gpt-4o'; // Fallback to gpt-4o for vision
            }
        } else {
            userContent = prompt.userPrompt;
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: prompt.systemMessage },
                    { role: 'user', content: userContent }
                ],
                max_tokens: hasScreenshot ? 1000 : maxTokens, // More tokens for code answers
                temperature: temperature
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AIService] OpenAI error:', error);

            if (response.status === 429) {
                throw new Error('OpenAI Rate Limit (429). Please check your OpenAI account credits/billing.');
            }

            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }

    async callAnthropic(apiKey, modelId, prompt, maxTokens = 200, temperature = 0.3, context = {}) {
        console.log('[AIService] Calling Anthropic:', modelId, 'temp:', temperature, 'tokens:', maxTokens);

        // Check if we have a screenshot for vision
        const hasScreenshot = context.currentScreenshot && context.currentScreenshot.startsWith('data:image');
        
        // Build content - include image if present
        let userContent;
        if (hasScreenshot) {
            console.log('[AIService] Using Anthropic Vision mode with screenshot');
            // Extract base64 data from data URL
            const base64Data = context.currentScreenshot.split(',')[1];
            const mimeType = context.currentScreenshot.split(';')[0].split(':')[1];
            
            userContent = [
                {
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: mimeType,
                        data: base64Data
                    }
                },
                {
                    type: 'text',
                    text: prompt.userPrompt + '\n\nAnalyze the screenshot above and provide the answer to the coding question shown.'
                }
            ];
        } else {
            userContent = prompt.userPrompt;
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId,
                max_tokens: hasScreenshot ? 1000 : maxTokens,
                system: prompt.systemMessage,
                messages: [
                    { role: 'user', content: userContent }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AIService] Anthropic error:', error);

            if (response.status === 429) {
                throw new Error('Anthropic Rate Limit (429). Please check your Anthropic account credits.');
            }

            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || 'No response generated';
    }

    async callGoogle(apiKey, modelId, prompt, maxTokens = 200, temperature = 0.3, context = {}) {
        console.log('[AIService] Calling Google AI:', modelId, 'temp:', temperature, 'tokens:', maxTokens);

        // Check if we have a screenshot for vision
        const hasScreenshot = context.currentScreenshot && context.currentScreenshot.startsWith('data:image');
        
        // Build parts - include image if present
        let parts = [];
        if (hasScreenshot) {
            console.log('[AIService] Using Google Vision mode with screenshot');
            // Extract base64 data from data URL
            const base64Data = context.currentScreenshot.split(',')[1];
            const mimeType = context.currentScreenshot.split(';')[0].split(':')[1];
            
            parts = [
                { text: `${prompt.systemMessage}\n\n${prompt.userPrompt}\n\nAnalyze the screenshot and provide the answer to the coding question shown.` },
                { 
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                }
            ];
            // Use a vision-capable model
            if (!modelId.includes('vision') && !modelId.includes('gemini-1.5') && !modelId.includes('gemini-2.0')) {
                modelId = 'gemini-1.5-flash'; // Fallback to vision-capable model
            }
        } else {
            parts = [{ text: `${prompt.systemMessage}\n\n${prompt.userPrompt}` }];
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                    maxOutputTokens: hasScreenshot ? 1000 : maxTokens,
                    temperature: temperature
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AIService] Google AI error:', error);

            if (response.status === 429) {
                throw new Error('Google AI Rate Limit (429). Please check your Google Cloud quota.');
            }

            throw new Error(`Google AI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
    }

    // Fallback hints when no LLM is configured or on error
    generateFallbackHint(context, errorReason = null) {
        const { requestType, customPrompt } = context;
        const cachedContext = this.contextManager?.getContext() || {};
        const recentText = cachedContext.recentTranscript?.toLowerCase() || '';

        let hint = '';

        // If we have a specific error reason, include it
        if (errorReason) {
            if (errorReason === 'NO_PROVIDER_ENABLED') {
                hint = '⚠️ No LLM provider is enabled.\n\nGo to Admin Panel → Providers and enable OpenAI, Anthropic, or Google.';
            } else if (errorReason === 'NO_MODEL_AVAILABLE') {
                hint = '⚠️ Provider enabled but no model selected.\n\nGo to Admin Panel → Providers, expand the provider, and enable at least one model.';
            } else if (errorReason === 'UNAUTHORIZED') {
                hint = '⚠️ Please log in to use AI assistance.';
            } else if (errorReason.includes('API')) {
                hint = `⚠️ API Error: ${errorReason}\n\nCheck your API key in Admin Panel → Providers.`;
            } else {
                hint = `⚠️ ${errorReason}`;
            }
        } else if (requestType === 'custom' && customPrompt) {
            hint = `⚠️ LLM not configured.\n\nGo to Admin Panel → Providers to enable an LLM.`;
        } else if (requestType === 'code') {
            hint = `// ⚠️ LLM not configured
// Go to Admin Panel → Providers
// Enable OpenAI or Anthropic with an API key`;
        } else if (requestType === 'explain') {
            hint = '⚠️ LLM not configured.\n\nEnable a provider in Admin Panel to get explanations.';
        } else if (requestType === 'answer') {
            hint = '⚠️ LLM not configured.\n\nEnable a provider in Admin Panel to get answers.';
        } else {
            // Smart fallback hints based on keywords (when no error, just no config)
            if (recentText.includes('complexity') || recentText.includes('big o')) {
                hint = "• Hash map: O(1) lookup\n• Array: O(n) search\n• Mention space trade-offs";
            } else if (recentText.includes('scale') || recentText.includes('system')) {
                hint = "• Horizontal scaling\n• Load balancers\n• Caching (Redis)\n• DB sharding";
            } else if (recentText.includes('react') || recentText.includes('component')) {
                hint = "• useState/useEffect\n• Props vs State\n• Memoization";
            } else {
                hint = "⚠️ LLM not configured.\n\nGo to Admin Panel → Providers to enable AI assistance.";
            }
        }

        return {
            hint,
            type: requestType || 'hint',
            timestamp: new Date().toISOString(),
            fallback: true,
            error: errorReason
        };
    }
}
