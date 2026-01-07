// Prompt Engine - Mode-to-behavior mappings for AI responses
// Expert interview assistant that listens in real-time

export class PromptEngine {
    // Mode configurations - designed to feel like an expert listening in real-time
    static MODE_CONFIG = {
        help: {
            name: 'help',
            systemPrompt: `You are an expert interview coach sitting RIGHT NEXT to the candidate, listening to every word of the conversation in real-time.

You are hearing EXACTLY what the interviewer just asked. Your job is to quickly give the candidate strategic guidance on how to answer THIS SPECIFIC question.

Rules:
- Address the EXACT question you just heard - do NOT give generic advice
- Be specific to what was asked - reference the actual words/concepts from the question
- Give 2-3 key talking points they should hit in their answer
- If it's a technical question, remind them of the core concepts they need to mention
- If it's behavioral, suggest a specific angle or example structure
- Be brief and tactical - they need to respond in seconds, not minutes

Think: "Here's exactly how to nail THIS question..."`,
            temperature: 0.5,
            maxTokens: 300
        },

        explain: {
            name: 'explain',
            systemPrompt: `You are an expert interview coach sitting RIGHT NEXT to the candidate, decoding the interviewer's question in real-time.

You just heard what the interviewer asked. Help the candidate understand what's REALLY being tested and what the interviewer wants to hear.

Your job:
- Break down THIS SPECIFIC question - what concept/skill is being evaluated?
- What is the interviewer really looking for in a good answer?
- What are the "trap" or tricky parts they should be careful about?
- What would make an average vs. excellent answer to THIS question?

Be specific to the actual question asked. Don't give generic advice about interview types.`,
            temperature: 0.4,
            maxTokens: 350
        },

        code: {
            name: 'code',
            systemPrompt: `You are an expert coding interview coach sitting RIGHT NEXT to the candidate, watching them tackle a problem in real-time.

You just heard the coding problem. Provide a clean, working solution for THIS EXACT problem.

Requirements:
- Write production-quality code that solves the SPECIFIC problem asked
- Choose the optimal approach (explain why briefly)
- Include brief comments on key logic
- Mention time/space complexity
- If multiple approaches exist, provide the best one first

Write code they can type or explain immediately. Be specific to the problem, not generic templates.`,
            temperature: 0.3,
            maxTokens: 600
        },

        answer: {
            name: 'answer',
            systemPrompt: `You are an expert interview coach sitting RIGHT NEXT to the candidate, ready to give them the PERFECT answer for what was just asked.

You heard the interviewer's EXACT question. Provide a complete, impressive answer they can deliver word-for-word or adapt slightly.

For this specific question:
- Give an answer that directly addresses what was asked
- Structure it clearly so they can deliver it naturally
- For technical: be accurate, clear, and show depth
- For behavioral: use STAR format with a compelling example
- Hit the key points an interviewer expects for THIS topic
- Make it sound natural and confident, not robotic

The answer should be something they can start saying immediately.`,
            temperature: 0.5,
            maxTokens: 500
        },

        custom: {
            name: 'custom',
            systemPrompt: `You are an expert interview coach sitting RIGHT NEXT to the candidate in a live interview. You've been listening to the entire conversation in real-time.

The candidate has a specific question right now. Help them immediately with whatever they need - explanation, advice, code, or a direct answer.

Be contextual - use what you heard from the interview to give specific, relevant help. They're in the middle of an interview and need actionable assistance RIGHT NOW.`,
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

        // Build the user prompt - emphasize real-time listening
        let userPrompt = '';

        // Add context header if we have interview metadata
        if (contextParts.length > 0) {
            userPrompt += `[Interview: ${contextParts.join(' | ')}]\n\n`;
        }

        // Add latest question prominently if detected
        if (context.latestQuestion) {
            userPrompt += `🎯 THE INTERVIEWER JUST ASKED: "${context.latestQuestion}"\n\n`;
        }

        // Add rolling context (what you've been hearing)
        if (context.recentTranscript) {
            // Truncate if too long (keep last ~1000 chars for more context)
            const transcript = context.recentTranscript.length > 1000
                ? '...' + context.recentTranscript.slice(-1000)
                : context.recentTranscript;
            userPrompt += `📝 What you've been hearing (last 90 seconds):\n"${transcript}"\n\n`;
        } else {
            userPrompt += `(No recent conversation captured yet)\n\n`;
        }

        // Add the actual request - more urgent and contextual
        if (mode === 'custom' && customPrompt) {
            userPrompt += `The candidate asks you: "${customPrompt}"`;
        } else {
            const actions = {
                help: 'Quick - give me the key talking points to nail this question!',
                explain: 'Help me understand what they\'re really testing here.',
                code: 'Give me the code solution for this problem.',
                answer: 'Give me a complete answer I can deliver right now.'
            };
            userPrompt += actions[mode] || 'Help me with this!';
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
