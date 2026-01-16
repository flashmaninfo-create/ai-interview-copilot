// Language Resolver - Multi-signal language detection
// Priority: editor > signature > OCR > session > default

export class LanguageResolver {
    // Common language patterns
    static LANGUAGE_PATTERNS = {
        python: {
            keywords: ['def ', 'import ', 'from ', 'elif ', 'self.', 'print(', '__init__', 'lambda '],
            extensions: ['.py'],
            signatures: /def\s+\w+\s*\(/
        },
        javascript: {
            keywords: ['const ', 'let ', 'var ', 'function ', '=>', 'console.log', 'require(', 'export '],
            extensions: ['.js', '.jsx', '.mjs'],
            signatures: /function\s+\w+\s*\(|const\s+\w+\s*=\s*\(/
        },
        typescript: {
            keywords: ['interface ', ': string', ': number', ': boolean', '<T>', 'type ', 'as '],
            extensions: ['.ts', '.tsx'],
            signatures: /:\s*(string|number|boolean|void)/
        },
        java: {
            keywords: ['public class', 'private ', 'protected ', 'void ', 'String[]', 'System.out', 'new '],
            extensions: ['.java'],
            signatures: /public\s+(static\s+)?\w+\s+\w+\s*\(/
        },
        cpp: {
            keywords: ['#include', 'std::', 'cout', 'cin', 'vector<', 'int main', '::'],
            extensions: ['.cpp', '.cc', '.cxx', '.h'],
            signatures: /int\s+main\s*\(|#include\s*</
        },
        c: {
            keywords: ['#include', 'printf', 'scanf', 'malloc', 'sizeof', 'NULL'],
            extensions: ['.c', '.h'],
            signatures: /int\s+main\s*\(|#include\s*</
        },
        sql: {
            keywords: ['SELECT ', 'FROM ', 'WHERE ', 'INSERT ', 'UPDATE ', 'DELETE ', 'JOIN ', 'GROUP BY'],
            extensions: ['.sql'],
            signatures: /SELECT\s+.+\s+FROM/i
        },
        go: {
            keywords: ['package ', 'func ', 'import (', 'fmt.', ':= ', 'go func'],
            extensions: ['.go'],
            signatures: /func\s+\w+\s*\(/
        },
        rust: {
            keywords: ['fn ', 'let mut', 'impl ', 'pub fn', '-> ', 'use ', 'mod '],
            extensions: ['.rs'],
            signatures: /fn\s+\w+\s*\(/
        }
    };

    // SQL dialect patterns
    static SQL_DIALECTS = {
        mysql: ['AUTO_INCREMENT', 'LIMIT', 'ENGINE=', 'TINYINT'],
        postgresql: ['SERIAL', 'RETURNING', '::text', 'ILIKE'],
        sqlserver: ['TOP ', 'IDENTITY', 'NVARCHAR', 'GETDATE()']
    };

    /**
     * Resolve language from multiple signals
     * @param {object} signals - Language signals
     * @returns {string} Detected language
     */
    static resolve(signals = {}) {
        const { editorLang, signatureLang, ocrText, sessionLang, userPreference } = signals;

        // Priority 1: Editor metadata (most reliable)
        if (editorLang && this.isValidLanguage(editorLang)) {
            return this.normalize(editorLang);
        }

        // Priority 2: Function signature detection
        if (signatureLang && this.isValidLanguage(signatureLang)) {
            return this.normalize(signatureLang);
        }

        // Priority 3: OCR text analysis
        if (ocrText) {
            const detected = this.detectFromText(ocrText);
            if (detected) return detected;
        }

        // Priority 4: Session history
        if (sessionLang && this.isValidLanguage(sessionLang)) {
            return this.normalize(sessionLang);
        }

        // Priority 5: User preference
        if (userPreference && this.isValidLanguage(userPreference)) {
            return this.normalize(userPreference);
        }

        // Default fallback
        return 'python';
    }

    /**
     * Detect language from text content
     */
    static detectFromText(text) {
        if (!text) return null;

        const scores = {};

        for (const [lang, patterns] of Object.entries(this.LANGUAGE_PATTERNS)) {
            scores[lang] = 0;

            // Check keywords
            for (const keyword of patterns.keywords) {
                if (text.includes(keyword)) {
                    scores[lang] += 2;
                }
            }

            // Check signature patterns
            if (patterns.signatures && patterns.signatures.test(text)) {
                scores[lang] += 5;
            }
        }

        // Find highest scoring language
        let maxScore = 0;
        let detected = null;

        for (const [lang, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detected = lang;
            }
        }

        // Require minimum confidence
        return maxScore >= 4 ? detected : null;
    }

    /**
     * Detect SQL dialect
     */
    static detectSQLDialect(text) {
        if (!text) return 'mysql'; // Default

        for (const [dialect, patterns] of Object.entries(this.SQL_DIALECTS)) {
            for (const pattern of patterns) {
                if (text.toUpperCase().includes(pattern.toUpperCase())) {
                    return dialect;
                }
            }
        }

        return 'mysql';
    }

    /**
     * Normalize language name
     */
    static normalize(lang) {
        const map = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'c++': 'cpp',
            'c#': 'csharp'
        };
        return map[lang.toLowerCase()] || lang.toLowerCase();
    }

    /**
     * Check if language is valid
     */
    static isValidLanguage(lang) {
        if (!lang) return false;
        const normalized = this.normalize(lang);
        return Object.keys(this.LANGUAGE_PATTERNS).includes(normalized);
    }

    /**
     * Get language confidence score
     */
    static getConfidence(text, expectedLang) {
        const detected = this.detectFromText(text);
        if (!detected) return 0;
        return detected === expectedLang ? 1 : 0.3;
    }
}
