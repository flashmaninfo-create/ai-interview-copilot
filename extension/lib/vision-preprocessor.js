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
