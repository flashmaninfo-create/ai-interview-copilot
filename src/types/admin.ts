export interface LLMModel {
    id: string;
    provider_id: string;
    name: string;
    enabled: boolean;
}

export interface LLMProvider {
    id: string;
    name: string;
    enabled: boolean;
    api_key_set: boolean;
    models: LLMModel[];
}

export interface AdminSettings {
    providers: LLMProvider[];
}

// Mock data for development
export const mockProviders: LLMProvider[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        enabled: true,
        api_key_set: true,
        models: [
            { id: 'gpt-4', provider_id: 'openai', name: 'GPT-4', enabled: true },
            { id: 'gpt-4-turbo', provider_id: 'openai', name: 'GPT-4 Turbo', enabled: true },
            { id: 'gpt-3.5-turbo', provider_id: 'openai', name: 'GPT-3.5 Turbo', enabled: false },
        ],
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        enabled: true,
        api_key_set: true,
        models: [
            { id: 'claude-3-opus', provider_id: 'anthropic', name: 'Claude 3 Opus', enabled: true },
            { id: 'claude-3-sonnet', provider_id: 'anthropic', name: 'Claude 3 Sonnet', enabled: true },
        ],
    },
    {
        id: 'google',
        name: 'Google AI',
        enabled: false,
        api_key_set: false,
        models: [
            { id: 'gemini-pro', provider_id: 'google', name: 'Gemini Pro', enabled: false },
        ],
    },
];
