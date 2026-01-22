// Response Validator - Quality gates, grounding, and stealth enforcement
// Ensures responses meet interview-ready standards

export class ResponseValidator {
    // Banned phrases (AI markers)
    static BANNED_PHRASES = [
        /as an AI/gi,
        /I cannot/gi,
        /I can't/gi,
        /here is the solution/gi,
        /here's the solution/gi,
        /I'm happy to/gi,
        /I'd be glad to/gi,
        /certainly!/gi,
        /absolutely!/gi,
        /let me help/gi,
        /I'll help/gi,
        /great question/gi,
        /good question/gi,
        /sure thing/gi,
        /of course!/gi
    ];

    // Robotic patterns to remove
    static ROBOTIC_PATTERNS = [
        /^Step \d+[:.]/gmi,
        /^First,\s*/gi,
        /^Second,\s*/gi,
        /^Third,\s*/gi,
        /^Finally,\s*/gi,
        /^In conclusion,\s*/gi,
        /^To summarize,\s*/gi
    ];

    /**
     * Validate and clean response
     * @param {string} response - Raw LLM response
     * @param {string} mode - Request mode (code, explain, help, answer)
     * @param {object} source - Original OCR/context for grounding
     * @returns {object} Validated response with metrics
     */
    static validate(response, mode, source = {}) {
        if (!response) {
            return { text: '', valid: false, issues: ['Empty response'] };
        }

        let text = response.trim();
        const issues = [];
        const metrics = {
            bannedPhraseHits: 0,
            lineCount: 0,
            languageMatch: true
        };

        // 1. Strip internal reasoning (<thinking> blocks) - STEALTH ENFORCEMENT
        const thinkingMatch = text.match(/<thinking>[\s\S]*?<\/thinking>/);
        if (thinkingMatch) {
            // Log reasoning for debug but remove from user output
            // console.log('[Validator] Internal Reasoning:', thinkingMatch[0]);
            text = text.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
        }

        // 1b. Strip banned phrases
        for (const pattern of this.BANNED_PHRASES) {
            if (pattern.test(text)) {
                metrics.bannedPhraseHits++;
                text = text.replace(pattern, '').trim();
            }
        }

        // 2. Remove robotic patterns (except in code mode)
        if (mode !== 'code') {
            for (const pattern of this.ROBOTIC_PATTERNS) {
                text = text.replace(pattern, '').trim();
            }
        }

        // 3. Remove emojis (except in code comments)
        if (mode !== 'code') {
            text = this.removeEmojis(text);
        }

        // 4. Remove markdown headers in explain mode
        if (mode === 'explain') {
            text = text.replace(/^#{1,3}\s+.*/gm, '').trim();
        }

        // 5. Mode-specific enforcement
        if (mode === 'code') {
            text = this.enforceCodeMode(text);
        } else if (mode === 'explain') {
            text = this.enforceExplainMode(text, issues);
        } else if (mode === 'help') {
            text = this.enforceHelpMode(text);
        }

        // 6. Line count check
        metrics.lineCount = text.split('\n').filter(l => l.trim()).length;
        if (mode === 'explain' && metrics.lineCount > 7) {
            issues.push('Exceeds 7 line limit for explain mode');
        }

        // 7. Grounding check (if source provided)
        if (source.ocrText) {
            const groundingIssues = this.groundingCheck(text, source.ocrText);
            issues.push(...groundingIssues);
        }

        // Clean up multiple newlines
        text = text.replace(/\n{3,}/g, '\n\n').trim();

        return {
            text,
            valid: issues.length === 0,
            issues,
            metrics
        };
    }

    /**
     * Grounding check - ensure response doesn't hallucinate
     */
    static groundingCheck(response, sourceText) {
        const issues = [];

        // Extract function names from source
        const sourceFunctions = this.extractFunctionNames(sourceText);
        const responseFunctions = this.extractFunctionNames(response);

        // Check for new function names not in source
        for (const fn of responseFunctions) {
            if (sourceFunctions.length > 0 && !sourceFunctions.includes(fn)) {
                // Allow common helper names
                const commonHelpers = ['helper', 'solve', 'main', 'solution', 'dfs', 'bfs'];
                if (!commonHelpers.includes(fn.toLowerCase())) {
                    issues.push(`New function name not in source: ${fn}`);
                }
            }
        }

        return issues;
    }

    /**
     * Extract function names from text
     */
    static extractFunctionNames(text) {
        const patterns = [
            /def\s+(\w+)\s*\(/g,           // Python
            /function\s+(\w+)\s*\(/g,      // JavaScript
            /const\s+(\w+)\s*=\s*\(/g,     // JS arrow
            /public\s+\w+\s+(\w+)\s*\(/g,  // Java
            /void\s+(\w+)\s*\(/g           // C/C++
        ];

        const names = new Set();
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                names.add(match[1]);
            }
        }
        return [...names];
    }

    /**
     * Enforce CODE mode rules
     */
    static enforceCodeMode(text) {
        // Remove prose before code
        const codeStart = text.search(/^(def |function |class |public |const |let |var |import )/m);
        if (codeStart > 0) {
            const beforeCode = text.substring(0, codeStart);
            // Only keep if it's less than 50 chars (might be important)
            if (beforeCode.length > 50) {
                text = text.substring(codeStart);
            }
        }

        // Remove markdown fences if present
        text = text.replace(/```\w*\n?/g, '').trim();

        // Basic Syntax Logic Check (Brace/Paren Matching)
        // This is a heuristic to detect cut-off code
        const openBraces = (text.match(/{/g) || []).length;
        const closeBraces = (text.match(/}/g) || []).length;
        const openParens = (text.match(/\(/g) || []).length;
        const closeParens = (text.match(/\)/g) || []).length;

        if (openBraces !== closeBraces || openParens !== closeParens) {
            // Heuristic detection of incomplete code
            // We append a warning if it looks broken, or we could trigger a retry logic
            // For now, we append a stealth comment
            text += '\n\n// Warning: Output may be truncated. Check syntax.';
        }

        return text;
    }

    /**
     * Enforce EXPLAIN mode rules
     */
    static enforceExplainMode(text, issues) {
        // Check for code blocks (not allowed in explain)
        if (/```[\s\S]*?```/.test(text)) {
            text = text.replace(/```[\s\S]*?```/g, '[code snippet removed]');
            issues.push('Code removed from explain mode');
        }

        // Ensure bullet format
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length > 5) {
            text = lines.slice(0, 5).join('\n');
        }

        return text;
    }

    /**
     * Enforce HELP mode rules
     */
    static enforceHelpMode(text) {
        // Convert direct answers to hints
        text = text.replace(/The answer is/gi, 'Consider that');
        text = text.replace(/You should use/gi, 'You might explore');
        text = text.replace(/The solution is/gi, 'One approach could be');

        return text;
    }

    /**
     * Remove emojis from text
     */
    static removeEmojis(text) {
        return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    }
}
