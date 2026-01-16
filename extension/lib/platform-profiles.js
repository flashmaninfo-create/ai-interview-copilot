// Platform Profiles - Platform-specific code formatting rules

export class PlatformProfiles {
    static PROFILES = {
        leetcode: {
            name: 'LeetCode',
            noMain: true,
            classWrapper: false,
            functionOnly: true,
            typedSignatures: true,
            imports: 'minimal',
            style: {
                indent: 4,
                naming: 'snake_case',  // for Python
                jsNaming: 'camelCase'
            }
        },
        hackerrank: {
            name: 'HackerRank',
            mainRequired: true,
            inputParsing: true,
            outputFormat: 'print',
            imports: 'allowed',
            style: {
                indent: 4,
                naming: 'snake_case'
            }
        },
        codility: {
            name: 'Codility',
            functionOnly: true,
            classWrapper: false,
            returnValue: true,
            imports: 'minimal',
            style: {
                indent: 4,
                naming: 'camelCase'
            }
        },
        codesignal: {
            name: 'CodeSignal',
            functionOnly: true,
            noClass: true,
            imports: 'allowed',
            style: {
                indent: 2,
                naming: 'camelCase'
            }
        },
        frontend: {
            name: 'Frontend/Browser',
            snippetOnly: true,
            noImports: true,
            esModules: false,
            console: true,
            style: {
                indent: 2,
                naming: 'camelCase'
            }
        },
        default: {
            name: 'Generic',
            mainRequired: false,
            imports: 'allowed',
            style: {
                indent: 4,
                naming: 'snake_case'
            }
        }
    };

    /**
     * Get platform profile
     */
    static getProfile(platform) {
        const normalized = platform?.toLowerCase().replace(/[^a-z]/g, '');
        return this.PROFILES[normalized] || this.PROFILES.default;
    }

    /**
     * Detect platform from URL or OCR
     */
    static detect(url, ocrText) {
        if (url) {
            const urlLower = url.toLowerCase();
            if (urlLower.includes('leetcode')) return 'leetcode';
            if (urlLower.includes('hackerrank')) return 'hackerrank';
            if (urlLower.includes('codility')) return 'codility';
            if (urlLower.includes('codesignal')) return 'codesignal';
        }

        if (ocrText) {
            const text = ocrText.toLowerCase();
            if (text.includes('leetcode')) return 'leetcode';
            if (text.includes('hackerrank')) return 'hackerrank';
            if (text.includes('codility')) return 'codility';
        }

        return 'default';
    }

    /**
     * Format code for platform
     */
    static formatCode(code, platform, language) {
        const profile = this.getProfile(platform);
        let formatted = code;

        // Remove main function if not needed
        if (profile.noMain && language === 'python') {
            formatted = formatted.replace(/if __name__ == ['"]__main__['"]:\s*\n.*$/gm, '').trim();
        }

        // Remove class wrapper if function only
        if (profile.functionOnly && language === 'java') {
            // Keep just the method
            const methodMatch = formatted.match(/public\s+(static\s+)?\w+\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/);
            if (methodMatch) {
                formatted = methodMatch[0];
            }
        }

        // Apply indentation
        formatted = this.applyIndentation(formatted, profile.style.indent);

        return formatted;
    }

    /**
     * Apply consistent indentation
     */
    static applyIndentation(code, spaces) {
        const lines = code.split('\n');
        return lines.map(line => {
            const match = line.match(/^(\s*)/);
            if (match) {
                const currentIndent = match[1].length;
                const tabCount = Math.round(currentIndent / 4);
                return ' '.repeat(tabCount * spaces) + line.trimStart();
            }
            return line;
        }).join('\n');
    }

    /**
     * Get code template for platform
     */
    static getTemplate(platform, language, functionName = 'solution') {
        const profile = this.getProfile(platform);

        if (language === 'python') {
            if (profile.mainRequired) {
                return `def ${functionName}():\n    pass\n\nif __name__ == "__main__":\n    ${functionName}()`;
            }
            return `def ${functionName}():\n    pass`;
        }

        if (language === 'javascript') {
            if (profile.functionOnly) {
                return `function ${functionName}() {\n    \n}`;
            }
            return `const ${functionName} = () => {\n    \n};`;
        }

        return '';
    }
}
