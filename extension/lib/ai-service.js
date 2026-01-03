// AI Service - Real LLM Integration
// Calls OpenAI/Anthropic APIs using admin-configured provider from Supabase

import { supabaseREST } from './supabase-config.js';

export class AIService {
    constructor() {
        this.cachedConfig = null;
        this.configCacheTime = 0;
        this.CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }

    async getHint(context) {
        try {
            // Get LLM configuration from database
            const config = await this.getLLMConfig();

            if (!config) {
                console.log('[AIService] No LLM configured, using fallback');
                return this.generateFallbackHint(context);
            }

            // Build the prompt
            const prompt = this.buildPrompt(context);

            // Call the appropriate LLM API
            const response = await this.callLLM(config, prompt);

            return {
                hint: response,
                type: context.requestType || 'hint',
                timestamp: new Date().toISOString(),
                model: config.model.model_id,
                provider: config.provider.slug
            };
        } catch (error) {
            console.error('[AIService] Error getting hint:', error);
            // Fall back to simulated hints on error
            return this.generateFallbackHint(context);
        }
    }

    async getLLMConfig() {
        // Check cache first
        if (this.cachedConfig && Date.now() - this.configCacheTime < this.CONFIG_CACHE_TTL) {
            return this.cachedConfig;
        }

        try {
            const result = await supabaseREST.getLLMConfig();

            if (result.success) {
                this.cachedConfig = result;
                this.configCacheTime = Date.now();
                console.log('[AIService] Loaded LLM config:', result.provider?.name, result.model?.model_id);
                return result;
            } else {
                console.warn('[AIService] Failed to get LLM config:', result.error);
                return null;
            }
        } catch (error) {
            console.error('[AIService] Error fetching LLM config:', error);
            return null;
        }
    }

    buildPrompt(context) {
        const { interviewContext = {}, requestType, transcripts, customPrompt } = context;
        const {
            role = 'Software Engineer',
            experienceLevel = 'mid',
            interviewType = 'technical',
            techStack = 'general'
        } = interviewContext;

        // Get recent transcript for context
        const recentText = transcripts?.slice(-5).map(t => t.text).join(' ') || '';

        // System message for interview assistant
        const systemMessage = `You are an AI interview assistant helping a ${experienceLevel}-level ${role} candidate during a ${interviewType} interview. 
Your responses should be:
- Concise (max 2-3 sentences for hints, more for code)
- Directly actionable
- Tailored to ${techStack} technology stack
- Professional but encouraging

DO NOT provide full answers - give hints and guidance that help the candidate think through the problem themselves.`;

        // Build user prompt based on request type
        let userPrompt = '';

        if (requestType === 'custom' && customPrompt) {
            userPrompt = `The candidate asks: "${customPrompt}"

Recent interview context: "${recentText}"

Provide helpful guidance.`;
        } else if (requestType === 'code') {
            userPrompt = `The candidate needs help with code. 
Recent discussion: "${recentText}"

Provide a code snippet or pseudocode that helps them understand the approach. Include brief comments.`;
        } else if (requestType === 'explain') {
            userPrompt = `The candidate needs an explanation.
Topic from discussion: "${recentText}"

Provide a clear, concise explanation suitable for an interview setting.`;
        } else {
            // Default: smart hint
            userPrompt = `The candidate needs a hint.
Current discussion: "${recentText}"

Provide a strategic hint that helps them think through the problem without giving away the full answer.`;
        }

        return { systemMessage, userPrompt };
    }

    async callLLM(config, prompt) {
        const { provider, model } = config;
        const apiKey = provider.api_key;

        if (!apiKey) {
            throw new Error('No API key configured for provider');
        }

        switch (provider.slug) {
            case 'openai':
                return await this.callOpenAI(apiKey, model.model_id, prompt, model.max_tokens);
            case 'anthropic':
                return await this.callAnthropic(apiKey, model.model_id, prompt, model.max_tokens);
            case 'google':
                return await this.callGoogle(apiKey, model.model_id, prompt, model.max_tokens);
            default:
                throw new Error(`Unsupported provider: ${provider.slug}`);
        }
    }

    async callOpenAI(apiKey, modelId, prompt, maxTokens = 500) {
        console.log('[AIService] Calling OpenAI:', modelId);

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
                temperature: 0.7
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

    async callAnthropic(apiKey, modelId, prompt, maxTokens = 500) {
        console.log('[AIService] Calling Anthropic:', modelId);

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

    async callGoogle(apiKey, modelId, prompt, maxTokens = 500) {
        console.log('[AIService] Calling Google AI:', modelId);

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
                    temperature: 0.7
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
    generateFallbackHint(context) {
        const { requestType, transcripts, customPrompt } = context;
        const recentText = transcripts?.slice(-4).map(t => t.text).join(' ').toLowerCase() || '';

        let hint = '';

        if (requestType === 'custom' && customPrompt) {
            hint = `I received your question: "${customPrompt}". Please configure an LLM provider in the admin panel to get AI-powered responses.`;
        } else if (requestType === 'code') {
            hint = `// Code generation requires an LLM provider
// Please configure OpenAI or Anthropic in the admin panel
// Steps:
// 1. Go to Admin > LLM Providers
// 2. Add your API key
// 3. Enable the provider`;
        } else if (requestType === 'explain') {
            hint = 'Explanation feature requires an LLM provider. Please configure one in the admin panel.';
        } else {
            // Smart fallback hints based on keywords
            if (recentText.includes('complexity') || recentText.includes('big o')) {
                hint = "Tip: Mention time vs space tradeoffs. If using a hash map, it's O(1) time but O(n) space.";
            } else if (recentText.includes('scale')) {
                hint = "Tip: Focus on horizontal scaling - Load Balancers, Caching (Redis), Database Sharding.";
            } else {
                hint = "💡 Hint: Clarify the problem first. Ask: 'Just to make sure I understand, the goal is to...' This buys thinking time.";
            }
        }

        return {
            hint,
            type: requestType || 'hint',
            timestamp: new Date().toISOString(),
            fallback: true
        };
    }
}
