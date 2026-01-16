// Intent Classifier - Detect follow-up intent for context-aware responses

export class IntentClassifier {
    // Intent patterns
    static INTENTS = {
        refine: {
            patterns: [
                /can you (make it |be )?(more |less )?(.+)/i,
                /refine/i,
                /improve/i,
                /clean(er)? up/i,
                /simplify/i,
                /make it better/i
            ]
        },
        optimize: {
            patterns: [
                /optimi[sz]e/i,
                /faster/i,
                /more efficient/i,
                /reduce (time|space|complexity)/i,
                /O\(n\)/i,
                /better complexity/i,
                /can we do better/i
            ]
        },
        debug: {
            patterns: [
                /debug/i,
                /what('s| is) wrong/i,
                /fix (this|the|my)/i,
                /error/i,
                /doesn't work/i,
                /not working/i,
                /bug/i,
                /issue/i
            ]
        },
        explain_more: {
            patterns: [
                /explain (more|again|further)/i,
                /what do you mean/i,
                /can you clarify/i,
                /I don't understand/i,
                /elaborate/i,
                /why (does|is|did)/i,
                /how does/i
            ]
        },
        constraint_change: {
            patterns: [
                /what if/i,
                /but now/i,
                /changed? to/i,
                /instead of/i,
                /new constraint/i,
                /updated/i,
                /different/i
            ]
        },
        new_question: {
            patterns: [
                /new question/i,
                /next (question|problem)/i,
                /moving on/i,
                /another one/i
            ]
        }
    };

    /**
     * Classify user intent from input
     * @param {string} input - User message or context
     * @param {object} history - Session history
     * @returns {object} Intent classification
     */
    static classify(input, history = []) {
        if (!input) {
            return { intent: 'new_question', confidence: 0.5, isFollowUp: false };
        }

        const normalizedInput = input.toLowerCase().trim();
        let bestIntent = 'new_question';
        let bestScore = 0;

        // Check each intent
        for (const [intent, config] of Object.entries(this.INTENTS)) {
            for (const pattern of config.patterns) {
                if (pattern.test(normalizedInput)) {
                    const score = this.calculateScore(normalizedInput, pattern);
                    if (score > bestScore) {
                        bestScore = score;
                        bestIntent = intent;
                    }
                }
            }
        }

        // Check if this is a follow-up based on history
        const isFollowUp = this.isFollowUp(input, history);

        return {
            intent: bestIntent,
            confidence: Math.min(bestScore / 10, 1),
            isFollowUp,
            requiresContext: isFollowUp || bestIntent !== 'new_question'
        };
    }

    /**
     * Calculate match score
     */
    static calculateScore(input, pattern) {
        const match = input.match(pattern);
        if (!match) return 0;
        // Longer matches are more specific
        return match[0].length;
    }

    /**
     * Determine if this is a follow-up to previous question
     */
    static isFollowUp(input, history) {
        if (!history || history.length === 0) return false;

        const normalizedInput = input.toLowerCase();

        // Short inputs are likely follow-ups
        if (input.split(' ').length < 5) return true;

        // References to previous response
        const followUpIndicators = [
            /^(and|but|also|or|what about|how about)/i,
            /this (code|solution|approach)/i,
            /you (said|mentioned|showed)/i,
            /the (same|previous)/i
        ];

        for (const pattern of followUpIndicators) {
            if (pattern.test(normalizedInput)) return true;
        }

        return false;
    }

    /**
     * Get prompt modifier based on intent
     */
    static getPromptModifier(intent) {
        const modifiers = {
            refine: 'Improve upon the previous solution while maintaining correctness.',
            optimize: 'Provide a more efficient solution with better time/space complexity.',
            debug: 'Identify and fix the issue. Explain what was wrong.',
            explain_more: 'Provide more detailed explanation of the concept.',
            constraint_change: 'Adapt the solution to the new constraint.',
            new_question: ''
        };

        return modifiers[intent] || '';
    }
}
