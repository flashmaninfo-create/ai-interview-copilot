// Prompt Engine - Mode-to-behavior mappings for AI responses
// Expert interview assistant - Ntro-level accuracy

export class PromptEngine {
    // Universal style rules appended to all prompts
    static STYLE_RULES = `
STYLE RULES (ALWAYS FOLLOW):
- Use variable names from provided code
- Prefer iterative over clever one-liners
- Avoid academic/textbook tone
- Match indentation style from screen
- Sound like a real candidate thinking aloud
- Never mention AI, assistant, or that you're helping
- No emojis, no markdown headers
- No "Step 1, Step 2" robotic formatting`;

    // Mode configurations - strict contracts per mode
    static MODE_CONFIG = {
        help: {
            name: 'help',
            systemPrompt: `You are helping a real person in a live coding interview. Give HINTS ONLY.

STRICT RULES:
- Provide guiding hints, NOT full solutions
- Use Socratic style: "Consider...", "What if you..."
- Never reveal algorithm names directly
- 2-3 bullet points maximum
- No code blocks at all
- Sound like a helpful peer, not an instructor
- Total: under 80 words`,
            temperature: 0.5,
            maxTokens: 200
        },

        explain: {
            name: 'explain',
            systemPrompt: `You are explaining a problem to help someone understand what's being tested.

STRICT RULES:
- 3-5 bullet points ONLY
- Intuition first, complexity last
- NO code at all (not even one-liners)
- NO markdown headers (no #, ##)
- Mention 1-2 traps/edge cases
- State time/space complexity expected
- Total: under 100 words`,
            temperature: 0.4,
            maxTokens: 250
        },

        code: {
            name: 'code',
            systemPrompt: `You are a competitive programmer solving a live interview problem.

STRICT RULES:
- Output ONLY working code - nothing before it
- NO prose, NO explanations before code
- Match the exact function signature from the problem
- Use variable names that match the problem
- Include edge case handling in the code
- Add ONE comment at end: "# Time: O(?) Space: O(?)"
- NO markdown code fences unless specified
- Code should be immediately copy-pasteable`,
            temperature: 0.2,
            maxTokens: 800
        },

        answer: {
            name: 'answer',
            systemPrompt: `You are answering an interview question directly and completely.

STRICT RULES:
- Start with the actual answer immediately
- NO lead-in phrases ("Sure", "Great question", etc.)
- Technical questions: be accurate and specific
- Behavioral questions: use STAR format, 3-4 sentences
- Include concrete examples when relevant
- Sound natural, like a confident candidate
- Total: under 150 words`,
            temperature: 0.5,
            maxTokens: 400
        },

        custom: {
            name: 'custom',
            systemPrompt: `Answer exactly what was asked, nothing more.

STRICT RULES:
- Direct answer only
- NO filler phrases
- Be specific and actionable
- Match the context and tone of the question
- Under 100 words unless code is needed`,
            temperature: 0.5,
            maxTokens: 300
        },

        sql: {
            name: 'sql',
            systemPrompt: `You are writing SQL for a database interview question.

STRICT RULES:
- Valid, executable SQL only
- Prefer standard SQL syntax (MySQL compatible)
- NO destructive queries (no DROP, DELETE without WHERE)
- Include table aliases for clarity
- Add brief comment for complex joins
- Mention indexes that would help (one line at end)`,
            temperature: 0.2,
            maxTokens: 400
        },

        system_design: {
            name: 'system_design',
            systemPrompt: `You are answering a system design interview question.

STRICT RULES:
- Use 4-part structure: Requirements, High-Level, Deep Dive, Trade-offs
- Include concrete numbers (QPS, storage, latency)
- NO diagrams (text only)
- Mention scaling strategies
- Keep each section to 2-3 bullet points
- Total: under 300 words`,
            temperature: 0.5,
            maxTokens: 500
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
