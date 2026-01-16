// Vision Preprocessor - OCR and text extraction from screenshots
// This module extracts structured text from coding problem screenshots
// to reduce token usage and improve AI code generation accuracy

/**
 * VisionPreprocessor handles:
 * 1. OCR text extraction from screenshot images
 * 2. Structured parsing of coding problems (constraints, examples, existing code)
 * 3. Fallback to raw images when OCR fails
 */
export class VisionPreprocessor {
    constructor(options = {}) {
        // Use browser's built-in OCR if available, or external service
        this.useNativeOCR = options.useNativeOCR ?? true;
        this.ocrEndpoint = options.ocrEndpoint || null; // Optional external OCR API
    }

    /**
     * Extract text from a single screenshot
     * @param {string} imageData - Base64 data URL of the image
     * @returns {Promise<{text: string, confidence: number, error?: string}>}
     */
    async extractText(imageData) {
        try {
            // Try native browser OCR first (Tesseract.js or similar)
            if (this.useNativeOCR) {
                return await this.nativeOCR(imageData);
            }

            // Fallback to external OCR service
            if (this.ocrEndpoint) {
                return await this.externalOCR(imageData);
            }

            return { text: '', confidence: 0, error: 'No OCR method available' };
        } catch (error) {
            console.error('[VisionPreprocessor] OCR error:', error);
            return { text: '', confidence: 0, error: error.message };
        }
    }

    /**
     * Clean OCR output - removes noise and artifacts
     */
    cleanOCRText(text) {
        if (!text) return '';

        let cleaned = text;

        // 1. Remove line numbers (e.g., "1 |", "23:", "  5  ")
        cleaned = cleaned.replace(/^\s*\d+[\s|:]+/gm, '');

        // 2. Remove UI artifacts (buttons, timestamps, usernames)
        cleaned = cleaned.replace(/\b(Submit|Run|Test|Copy|Share)\b/gi, '');
        cleaned = cleaned.replace(/\d{1,2}:\d{2}\s*(AM|PM)?/gi, ''); // Timestamps
        cleaned = cleaned.replace(/@\w+/g, ''); // Usernames

        // 3. Remove common LeetCode/HackerRank UI text
        cleaned = cleaned.replace(/\b(Accepted|Wrong Answer|Runtime Error|Time Limit|Memory Limit)\b/gi, '');
        cleaned = cleaned.replace(/\b(Easy|Medium|Hard)\b/gi, '');

        // 4. Clean up extra whitespace
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/[ \t]+/g, ' ');

        return cleaned.trim();
    }

    /**
     * Remove duplicate text blocks from merged screenshots
     */
    removeDuplicates(texts) {
        const seen = new Set();
        const unique = [];

        for (const text of texts) {
            // Normalize for comparison
            const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
            if (normalized.length > 20 && !seen.has(normalized)) {
                seen.add(normalized);
                unique.push(text);
            }
        }

        return unique;
    }

    /**
     * Detect constraints from text (e.g., "1 <= n <= 10^5")
     */
    detectConstraints(text) {
        const constraints = [];
        const patterns = [
            /\d+\s*[<≤]\s*\w+\s*[<≤]\s*\d+(\^\d+)?/g,  // Range constraints
            /\w+\.length\s*[<≤]\s*\d+/g,               // Array length
            /\-?\d+\s*[<≤]\s*\w+\[i\]/g,               // Element bounds
            /O\([^)]+\)/g                               // Complexity hints
        ];

        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches) {
                constraints.push(...matches);
            }
        }

        return [...new Set(constraints)];
    }

    /**
     * Detect function signature from code
     */
    detectFunctionSignature(text) {
        const patterns = [
            /def\s+(\w+)\s*\([^)]*\)\s*(->.*)?:/,           // Python
            /function\s+(\w+)\s*\([^)]*\)/,                  // JavaScript
            /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/,           // Arrow function
            /public\s+\w+\s+(\w+)\s*\([^)]*\)/,             // Java
            /\w+\s+(\w+)\s*\([^)]*\)\s*{/                    // C/C++
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0];
            }
        }

        return null;
    }

    /**
     * Extract text using browser-based OCR (simulated)
     * In production, integrate with Tesseract.js or similar
     */
    async nativeOCR(imageData) {
        // For now, we'll rely on the AI's vision capabilities
        // This method can be enhanced with Tesseract.js for actual OCR
        return {
            text: '',
            confidence: 0,
            requiresVision: true, // Indicates AI should use vision model
            imageData: imageData
        };
    }

    /**
     * External OCR service call (e.g., Google Cloud Vision, AWS Textract)
     */
    async externalOCR(imageData) {
        try {
            const response = await fetch(this.ocrEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            });

            if (!response.ok) throw new Error(`OCR API error: ${response.status}`);

            const result = await response.json();
            return {
                text: result.text || '',
                confidence: result.confidence || 0.5
            };
        } catch (error) {
            return { text: '', confidence: 0, error: error.message };
        }
    }

    /**
     * Process multiple screenshots and extract structured problem data
     * @param {Array<{id: string, imageUrl: string, order: number}>} screenshots
     * @returns {Promise<{problemStatement: string, constraints: string[], examples: string[], code: string, rawImages: string[]}>}
     */
    async processScreenshots(screenshots) {
        const result = {
            problemStatement: '',
            constraints: [],
            examples: [],
            code: '',
            rawImages: [],
            extractedTexts: [],
            requiresVision: false
        };

        // Sort by order
        const sorted = [...screenshots].sort((a, b) => a.order - b.order);

        for (const screenshot of sorted) {
            const extracted = await this.extractText(screenshot.imageUrl);

            if (extracted.requiresVision) {
                result.requiresVision = true;
                result.rawImages.push(screenshot.imageUrl);
            } else if (extracted.text) {
                result.extractedTexts.push(extracted.text);

                // Try to categorize the text
                const parsed = this.parseCodeProblem(extracted.text);
                if (parsed.problemStatement) {
                    result.problemStatement += (result.problemStatement ? '\n' : '') + parsed.problemStatement;
                }
                if (parsed.constraints.length) {
                    result.constraints.push(...parsed.constraints);
                }
                if (parsed.examples.length) {
                    result.examples.push(...parsed.examples);
                }
                if (parsed.code) {
                    result.code += (result.code ? '\n' : '') + parsed.code;
                }
            }
        }

        return result;
    }

    /**
     * Parse extracted text to identify problem components
     */
    parseCodeProblem(text) {
        const result = {
            problemStatement: '',
            constraints: [],
            examples: [],
            code: ''
        };

        // Common patterns for coding problems
        const lines = text.split('\n');
        let currentSection = 'problem';

        for (const line of lines) {
            const lowerLine = line.toLowerCase().trim();

            // Detect section headers
            if (lowerLine.includes('constraint') || lowerLine.includes('note:')) {
                currentSection = 'constraints';
                continue;
            }
            if (lowerLine.includes('example') || lowerLine.includes('input:') || lowerLine.includes('output:')) {
                currentSection = 'examples';
            }
            if (lowerLine.match(/^(class|function|def |const |let |var |public |private )/)) {
                currentSection = 'code';
            }

            // Categorize line
            switch (currentSection) {
                case 'problem':
                    result.problemStatement += line + '\n';
                    break;
                case 'constraints':
                    if (line.trim()) result.constraints.push(line.trim());
                    break;
                case 'examples':
                    result.examples.push(line);
                    break;
                case 'code':
                    result.code += line + '\n';
                    break;
            }
        }

        return result;
    }

    /**
     * Build optimized prompt for AI code generation
     * @param {Object} processedData - Output from processScreenshots
     * @param {Object} context - Interview context (language, platform, etc.)
     */
    buildCodePrompt(processedData, context = {}) {
        const { preferredLanguage = 'python', codingPlatform = 'unknown' } = context;

        let prompt = '';

        // Add extracted text context
        if (processedData.problemStatement) {
            prompt += `## Problem Statement\n${processedData.problemStatement.trim()}\n\n`;
        }

        if (processedData.constraints.length) {
            prompt += `## Constraints\n`;
            processedData.constraints.forEach(c => {
                prompt += `- ${c}\n`;
            });
            prompt += '\n';
        }

        if (processedData.examples.length) {
            prompt += `## Examples\n`;
            prompt += processedData.examples.join('\n');
            prompt += '\n\n';
        }

        if (processedData.code) {
            prompt += `## Existing Code\n\`\`\`\n${processedData.code.trim()}\n\`\`\`\n\n`;
        }

        // Add instruction
        prompt += `## Task\n`;
        prompt += `Generate a complete, working solution in **${preferredLanguage.toUpperCase()}**.\n`;
        prompt += `Platform: ${codingPlatform}\n\n`;
        prompt += `Requirements:\n`;
        prompt += `1. Include all necessary imports\n`;
        prompt += `2. Handle edge cases\n`;
        prompt += `3. Optimize for time/space complexity\n`;
        prompt += `4. Add brief comments explaining the approach\n`;

        return {
            textPrompt: prompt,
            requiresImages: processedData.requiresVision,
            images: processedData.rawImages
        };
    }
}

// Singleton instance
let preprocessorInstance = null;

export function getVisionPreprocessor(options = {}) {
    if (!preprocessorInstance) {
        preprocessorInstance = new VisionPreprocessor(options);
    }
    return preprocessorInstance;
}
