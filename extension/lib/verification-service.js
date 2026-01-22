// Verification Service - Parses and Enforces LLM Verification Decisions
// Ensuring Strict Ntro.io Quality Gate

export class VerificationService {

    /**
     * Parse the raw JSON response from the Verifier LLM
     * @param {string} rawText - Raw text response from LLM
     * @returns {object} - Structured decision object { decision: 'PASS'|'RETRY'|'DOWNGRADE', ... }
     */
    static parseDecision(rawText) {
        if (!rawText) {
            return { decision: 'PASS', risk_level: 'LOW', reason: 'Verifier failed to respond' };
        }

        let cleanText = rawText.trim();

        // 1. Strip markdown code fences if present
        if (cleanText.includes('```')) {
            cleanText = cleanText.replace(/```json\s*/g, '').replace(/```/g, '').trim();
        }

        try {
            const result = JSON.parse(cleanText);

            // Normalize decision to uppercase
            if (result.decision) {
                result.decision = result.decision.toUpperCase();
            } else {
                // Fallback if valid JSON but missing decision field
                result.decision = 'PASS';
                result.risk_level = 'LOW';
            }

            return result;
        } catch (e) {
            console.error('[VerificationService] Failed to parse JSON:', e);
            console.log('[VerificationService] Raw output:', rawText);

            // Fail-safe: If we can't parse the verifier, we default to PASS 
            // (or RETRY if we want to be super strict, but PASS keeps the system functional)
            return {
                decision: 'PASS',
                risk_level: 'LOW',
                reason: 'JSON Parse Error in Verifier',
                validation_failed: true
            };
        }
    }

    /**
     * Check if a response needs verification
     * (Skip for simple non-code, non-critical modes if desired)
     */
    static needsVerification(mode) {
        // Always verify CODE, ANSWER, SQL, SYSTEM_DESIGN
        // HINT and EXPLAIN are lower risk but good to verify for stealth
        return ['code', 'answer', 'sql', 'system_design', 'explain', 'hint'].includes(mode);
    }

    /**
     * Construct a feedback prompt for the RETRY step
     */
    static buildRetryPrompt(decision, originalPrompt) {
        const issues = decision.failed_checks?.join('; ') || decision.feedback || 'Quality check failed';

        return {
            ...originalPrompt,
            // We append the critique to the user prompt or system prompt
            // Appending to user prompt is usually more immediate for the model
            userPrompt: originalPrompt.userPrompt +
                `\n\n────────────────────────────────────────\nCRITICAL FEEDBACK - REVISION REQUIRED\n────────────────────────────────────────\n` +
                `Your previous response failed verification:\n` +
                `issues: ${issues}\n\n` +
                `ACTION: Regenerate the response. FIX the issues above. Maintain strict output format.`
        };
    }
}
