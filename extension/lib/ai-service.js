// AI Service - Real LLM Integration with Mode-Specific Prompts
// Uses PromptEngine for strict behavior control per button mode

import { supabaseREST } from './supabase-config.js';
import { PromptEngine } from './prompt-engine.js';

export class AIService {
    constructor() {
        this.cachedConfig = null;
        this.configCacheTime = 0;
        this.CONFIG_CACHE_TTL = 60 * 1000; // 1 minute - shorter TTL for faster admin updates
        this.contextManager = null; // Set externally by BackgroundService
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

            // Build the prompt using PromptEngine
            const prompt = this.buildPrompt(context);

            // Call the appropriate LLM API with mode-specific settings
            const response = await this.callLLM(config, prompt);

            // Apply stealth formatting
            const formattedResponse = PromptEngine.formatResponse(
                response,
                context.requestType || 'help'
            );

            return {
                hint: formattedResponse,
                type: context.requestType || 'hint',
                timestamp: new Date().toISOString(),
                model: config.model.model_id,
                provider: config.provider.slug
            };
        } catch (error) {
            console.error('[AIService] Error getting hint:', error);
            // Fall back to simulated hints on error
            return this.generateFallbackHint(context, error.message);
        }
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

    async callLLM(config, prompt) {
        const { provider, model } = config;
        const apiKey = provider.api_key;

        if (!apiKey) {
            throw new Error('No API key configured for provider');
        }

        // Use prompt's temperature and maxTokens (mode-specific)
        const temperature = prompt.temperature || 0.3;
        const maxTokens = prompt.maxTokens || 200;

        switch (provider.slug) {
            case 'openai':
                return await this.callOpenAI(apiKey, model.model_id, prompt, maxTokens, temperature);
            case 'anthropic':
                return await this.callAnthropic(apiKey, model.model_id, prompt, maxTokens, temperature);
            case 'google':
                return await this.callGoogle(apiKey, model.model_id, prompt, maxTokens, temperature);
            default:
                throw new Error(`Unsupported provider: ${provider.slug}`);
        }
    }

    async callOpenAI(apiKey, modelId, prompt, maxTokens = 200, temperature = 0.3) {
        console.log('[AIService] Calling OpenAI:', modelId, 'temp:', temperature, 'tokens:', maxTokens);

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
                    { role: 'user', content: prompt.userPrompt }
                ],
                max_tokens: maxTokens,
                temperature: temperature
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AIService] OpenAI error:', error);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
    }

    async callAnthropic(apiKey, modelId, prompt, maxTokens = 200, temperature = 0.3) {
        console.log('[AIService] Calling Anthropic:', modelId, 'temp:', temperature, 'tokens:', maxTokens);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId,
                max_tokens: maxTokens,
                system: prompt.systemMessage,
                messages: [
                    { role: 'user', content: prompt.userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AIService] Anthropic error:', error);
            throw new Error(`Anthropic API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || 'No response generated';
    }

    async callGoogle(apiKey, modelId, prompt, maxTokens = 200, temperature = 0.3) {
        console.log('[AIService] Calling Google AI:', modelId, 'temp:', temperature, 'tokens:', maxTokens);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${prompt.systemMessage}\n\n${prompt.userPrompt}`
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature: temperature
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('[AIService] Google AI error:', error);
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
