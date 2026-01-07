// Prompt Engine - Mode-to-behavior mappings for AI responses
// Natural conversational style while being mode-appropriate

export class PromptEngine {
    // Mode configurations with natural conversational output
    static MODE_CONFIG = {
        help: {
            name: 'help',
            systemPrompt: `You are a helpful interview assistant. The user is in a live interview and needs quick guidance.

Provide practical, actionable advice. Be conversational and supportive. You can:
- Give strategic tips and key points to mention
- Suggest how to structure an answer
- Remind them of important concepts
- Offer talking points they can expand on

Keep your response focused and practical - they need to use this in real-time.`,
            temperature: 0.5,
            maxTokens: 300
        },

        explain: {
            name: 'explain',
            systemPrompt: `You are a helpful interview assistant. The user needs help understanding what the interviewer is really asking.

Break down the question:
- What concept or skill are they testing?
- What are the key parts of the question?
- What does a good answer need to cover?
- What are they really looking for?

Be clear and educational. Help them understand so they can answer confidently.`,
            temperature: 0.4,
            maxTokens: 350
        },

        code: {
            name: 'code',
            systemPrompt: `You are a helpful coding assistant for interviews. Provide clean, working code solutions.

When writing code:
- Use clear variable names and good structure
- Add brief comments explaining key parts
- Choose the most appropriate language/approach for the problem
- Focus on correctness and clarity over optimization
- Include the complete solution they can reference

Feel free to briefly explain your approach before or after the code.`,
            temperature: 0.3,
            maxTokens: 600
        },

        answer: {
            name: 'answer',
            systemPrompt: `You are a helpful interview coach. Provide a complete, well-structured answer the user can deliver or adapt.

For technical questions:
- Give a clear, thorough explanation
- Include examples if helpful
- Cover the key points an interviewer expects

For behavioral questions:
- Use the STAR format (Situation, Task, Action, Result)
- Make it specific and compelling
- Show impact and learning

Write naturally as if you were helping a friend prepare. The answer should be ready to deliver with minor personalization.`,
            temperature: 0.5,
            maxTokens: 500
        },

        custom: {
            name: 'custom',
            systemPrompt: `You are a helpful interview assistant. The user is in a live interview and has a specific question.

Be helpful, clear, and conversational. Provide whatever assistance they need - explanations, advice, code, examples, or answers.

Focus on being practical and useful for their interview context.`,
            temperature: 0.5,
            maxTokens: 400
        }
    };

    /**
     * Build prompt for AI request based on mode
     * @param {string} mode - help, explain, code, answer, or custom
     * @param {object} context - Interview context from InterviewContextManager
     * @param {string} customPrompt - Optional custom prompt for 'custom' mode
     */
    static buildPrompt(mode, context, customPrompt = null) {
        const config = this.MODE_CONFIG[mode] || this.MODE_CONFIG.help;

        // Build rich context string from all interview metadata
        const contextParts = [];

        // Role and experience
        if (context.role && context.role.trim()) {
            contextParts.push(`Role: ${context.role}`);
        }
        if (context.experienceLevel) {
            const levelLabels = {
                'junior': 'Junior (0-2 years)',
                'mid': 'Mid-level (2-5 years)',
                'senior': 'Senior (5+ years)'
            };
            contextParts.push(`Level: ${levelLabels[context.experienceLevel] || context.experienceLevel}`);
        }

        // Technical details
        if (context.techStack && context.techStack !== 'general' && context.techStack.trim()) {
            contextParts.push(`Tech Stack: ${context.techStack}`);
        }
        if (context.interviewType) {
            const typeLabels = {
                'technical': 'Technical Interview',
                'behavioral': 'Behavioral Interview',
                'system-design': 'System Design Interview',
                'hr': 'HR/Culture Fit'
            };
            contextParts.push(`Type: ${typeLabels[context.interviewType] || context.interviewType}`);
        }

        // Company context
        if (context.companyType) {
            const companyLabels = {
                'startup': 'Startup',
                'mid-size': 'Mid-size Company',
                'enterprise': 'Enterprise',
                'faang': 'FAANG/Big Tech'
            };
            contextParts.push(`Company: ${companyLabels[context.companyType] || context.companyType}`);
        }

        // Build the system prompt with interview context
        let enrichedSystemPrompt = config.systemPrompt;

        // Add context-aware tailoring
        if (context.experienceLevel === 'senior') {
            enrichedSystemPrompt += '\n\nNote: This is a senior-level candidate. Expect and provide depth, architectural thinking, and leadership examples.';
        } else if (context.experienceLevel === 'junior') {
            enrichedSystemPrompt += '\n\nNote: This is a junior-level candidate. Focus on fundamentals and learning potential rather than extensive experience.';
        }

        if (context.companyType === 'faang') {
            enrichedSystemPrompt += '\n\nNote: This is for a FAANG/Big Tech interview. Include time/space complexity analysis and scalability considerations.';
        }

        if (context.weakAreas && context.weakAreas.trim()) {
            enrichedSystemPrompt += `\n\nNote: The candidate mentioned weak areas in: ${context.weakAreas}. Be especially helpful in these topics.`;
        }

        // Apply response style preference
        if (context.responseStyle === 'short') {
            enrichedSystemPrompt += '\n\nIMPORTANT: Keep responses very concise - bullet points preferred, maximum 2-3 sentences per point.';
        } else if (context.responseStyle === 'detailed') {
            enrichedSystemPrompt += '\n\nIMPORTANT: Provide thorough, detailed responses with examples and explanations.';
        }

        // Build the user prompt
        let userPrompt = '';

        // Add context header if we have interview metadata
        if (contextParts.length > 0) {
            userPrompt += `[Interview Context: ${contextParts.join(' | ')}]\n\n`;
        }

        // Add latest question if detected
        if (context.latestQuestion) {
            userPrompt += `The interviewer asked: "${context.latestQuestion}"\n\n`;
        }

        // Add rolling context
        if (context.recentTranscript) {
            // Truncate if too long (keep last ~800 chars for more context)
            const transcript = context.recentTranscript.length > 800
                ? '...' + context.recentTranscript.slice(-800)
                : context.recentTranscript;
            userPrompt += `Recent conversation:\n"${transcript}"\n\n`;
        }

        // Add the actual request
        if (mode === 'custom' && customPrompt) {
            userPrompt += `My question: ${customPrompt}`;
        } else {
            const actions = {
                help: 'Please give me helpful guidance for responding to this.',
                explain: 'Please help me understand what they\'re really asking.',
                code: 'Please help me with the code for this.',
                answer: 'Please give me a complete answer I can use.'
            };
            userPrompt += actions[mode] || 'Please help me with this.';
        }

        return {
            systemMessage: enrichedSystemPrompt,
            userPrompt,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
            mode: config.name
        };
    }

    /**
     * Format AI response (light cleanup only)
     * Keeps natural conversational style
     */
    static formatResponse(text, mode) {
        if (!text) return text;

        let formatted = text.trim();

        // Only remove obvious filler phrases at the start
        const fillerPhrases = [
            /^(Sure thing[!,.]?\s*)/i,
            /^(Of course[!,.]?\s*)/i,
            /^(Absolutely[!,.]?\s*)/i,
            /^(Great question[!,.]?\s*)/i,
        ];

        for (const pattern of fillerPhrases) {
            formatted = formatted.replace(pattern, '');
        }

        return formatted.trim();
    }
}
