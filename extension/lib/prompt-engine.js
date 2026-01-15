// Prompt Engine - Mode-to-behavior mappings for AI responses
// Expert interview assistant that listens in real-time

export class PromptEngine {
    // Mode configurations - designed to feel like an expert listening in real-time
    static MODE_CONFIG = {
        help: {
            name: 'help',
            systemPrompt: `Expert interview coach. Give PRECISE, CONCISE guidance for THIS question.

RULES:
- NO fluff, NO filler, NO "Great question" or "Sure"
- ONLY actionable points - 2-3 bullet points max
- Reference EXACT concepts from the question
- Every word must add value
- Keep total response under 100 words`,
            temperature: 0.5,
            maxTokens: 200
        },

        explain: {
            name: 'explain',
            systemPrompt: `Expert decoder. Explain WHAT interviewer is really testing.

RULES:
- NO fluff - straight to the point
- State the CORE concept being tested
- 1-2 traps to avoid
- What makes a GREAT answer (one line)
- Total: under 80 words`,
            temperature: 0.4,
            maxTokens: 150
        },

        code: {
            name: 'code',
            systemPrompt: `Expert coder. Provide WORKING CODE ONLY.

RULES:
- Code ONLY - minimal comments
- Optimal solution first
- NO explanations before code
- Time: O(?) Space: O(?) at the END (one line)
- NO fluff, NO "Here's the solution"
- Just code the user can copy-paste`,
            temperature: 0.3,
            maxTokens: 500
        },

        answer: {
            name: 'answer',
            systemPrompt: `Expert answer provider. Give DIRECT answers ONLY.

RULES:
- Start with the actual answer - NO lead-in
- Technical: accurate, clear, to-the-point
- Behavioral: STAR format, 3-4 sentences max
- NO "Sure", NO "Great question"
- Every word must add value
- Total: under 150 words`,
            temperature: 0.5,
            maxTokens: 300
        },

        custom: {
            name: 'custom',
            systemPrompt: `Expert assistant. Answer the specific question DIRECTLY.

RULES:
- Answer what was asked - nothing more
- NO filler, NO "Sure", NO lead-ins
- Be specific and actionable
- Keep under 100 words unless code is needed`,
            temperature: 0.5,
            maxTokens: 300
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

        // Add visual context from screen sharing (LIVE CONTEXT)
        if (context.visualContext) {
            const vc = context.visualContext;
            userPrompt += `🖥️ [LIVE SCREEN CONTEXT - The candidate is looking at this right now]:\n`;

            if (vc.problemStatement) {
                userPrompt += `> Problem Description:\n"${vc.problemStatement.trim()}"\n\n`;
            }

            if (vc.code) {
                userPrompt += `> Code Editor State:\n\`\`\`\n${vc.code.trim()}\n\`\`\`\n\n`;
            }

            // Fallback: If no structured code/problem found but we have text
            if (!vc.problemStatement && !vc.code && vc.extractedTexts && vc.extractedTexts.length > 0) {
                const text = vc.extractedTexts.join('\n');
                userPrompt += `> Visible Screen Text:\n"${text.substring(0, 800)}${text.length > 800 ? '...' : ''}"\n\n`;
            }

            userPrompt += `(End of screen context)\n\n`;
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
