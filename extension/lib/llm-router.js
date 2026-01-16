// LLM Router - Mode-specific settings for AI requests
// Uses ONLY the admin-configured provider (no multi-provider routing)

export class LLMRouter {
    // Mode-specific settings (temperature, tokens, etc.)
    // Provider is determined by admin panel, not by mode
    static MODE_SETTINGS = {
        code: {
            temperature: 0.2,
            maxTokens: 800,
            retryOnFail: true
        },
        explain: {
            temperature: 0.4,
            maxTokens: 300,
            retryOnFail: true
        },
        help: {
            temperature: 0.5,
            maxTokens: 200,
            retryOnFail: false
        },
        answer: {
            temperature: 0.5,
            maxTokens: 400,
            retryOnFail: true
        },
        system_design: {
            temperature: 0.5,
            maxTokens: 500,
            retryOnFail: true
        },
        sql: {
            temperature: 0.2,
            maxTokens: 400,
            retryOnFail: true
        },
        custom: {
            temperature: 0.5,
            maxTokens: 300,
            retryOnFail: false
        },
        code_from_screenshots: {
            temperature: 0.2,
            maxTokens: 1500,
            retryOnFail: true
        }
    };

    /**
     * Get mode-specific settings for the configured provider
     * The provider comes from admin panel config, not from this router
     * 
     * @param {string} mode - Request mode (code, explain, help, etc.)
     * @param {string} configuredProvider - The provider slug from admin config
     * @returns {object} Settings for this mode
     */
    static getSettingsForProvider(mode, configuredProvider) {
        const settings = this.MODE_SETTINGS[mode] || this.MODE_SETTINGS.help;

        console.log(`[LLMRouter] Using admin-configured provider: ${configuredProvider} for mode: ${mode}`);

        return {
            provider: configuredProvider,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            retryOnFail: settings.retryOnFail
        };
    }

    /**
     * Temperature adjustment per language (for determinism)
     */
    static adjustTemperature(baseTemp, language) {
        // Lower temp for statically typed languages (more deterministic)
        const staticLangs = ['java', 'c++', 'c', 'go', 'rust', 'typescript'];
        if (staticLangs.includes(language?.toLowerCase())) {
            return Math.max(0.1, baseTemp - 0.1);
        }
        return baseTemp;
    }
}
