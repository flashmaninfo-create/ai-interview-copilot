/**
 * Admin Providers Page (Settings Style)
 *
 * Unified settings page for AI provider configuration.
 * - Left: Radio selection for active provider
 * - Right: Model selection per provider
 * - Bottom: API Keys
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService, type LLMProvider } from '../../lib/services/adminService';
import {
    ArrowLeft,
    Key,
    Save,
    CheckCircle,
    AlertCircle,
    ChevronDown,
    Eye,
    EyeOff
} from 'lucide-react';

interface ProviderConfig {
    id: string;
    name: string;
    description: string;
    models: { id: string; name: string }[];
    defaultModel: string;
}

// Predefined provider configurations
const PROVIDER_CONFIGS: ProviderConfig[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        description: 'Use GPT models (recommended for rich, conversational feedback).',
        models: [
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
            { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
            { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        ],
        defaultModel: 'gpt-4o-mini'
    },
    {
        id: 'google',
        name: 'Google Gemini',
        description: 'Use Gemini models for multilingual and Google-aligned responses.',
        models: [
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
        ],
        defaultModel: 'gemini-2.5-flash'
    },
    {
        id: 'deepseek',
        name: 'DeepSeek',
        description: 'Use DeepSeek for efficient and cost-effective interview analysis.',
        models: [
            { id: 'deepseek-chat', name: 'DeepSeek Chat' },
            { id: 'deepseek-coder', name: 'DeepSeek Coder' },
        ],
        defaultModel: 'deepseek-chat'
    },
    {
        id: 'anthropic',
        name: 'Anthropic Claude',
        description: 'Use Claude models for nuanced, safety-focused responses.',
        models: [
            { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus' },
            { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
        ],
        defaultModel: 'claude-3-5-sonnet'
    }
];

export function AdminProvidersPage() {
    const [activeProvider, setActiveProvider] = useState<string>('openai');
    const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
    const [customModels, setCustomModels] = useState<Record<string, string>>({});
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            // Load providers from DB
            const providers = await adminService.getProviders();

            // Find active provider (Must be in PROVIDER_CONFIGS to be considered an "LLM" provider)
            const active = providers.find(p => p.enabled && PROVIDER_CONFIGS.some(c => c.id === p.provider));
            if (active) {
                setActiveProvider(active.provider);
            }

            // Build API keys map
            const keys: Record<string, string> = {};
            providers.forEach(p => {
                keys[p.provider] = p.apiKey || '';
            });
            setApiKeys(keys);

            // Load saved model selections from app config
            const savedModels = await adminService.getAppConfig('selected_models');
            if (savedModels) {
                setSelectedModels(savedModels);
            } else {
                // Set defaults
                const defaults: Record<string, string> = {};
                PROVIDER_CONFIGS.forEach(p => {
                    defaults[p.id] = p.defaultModel;
                });
                defaults['deepgram'] = 'nova-2'; // Default for Deepgram
                setSelectedModels(defaults);
            }

            const savedCustomModels = await adminService.getAppConfig('custom_models');
            if (savedCustomModels) {
                setCustomModels(savedCustomModels);
            }

        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Get all providers
            const providers = await adminService.getProviders();

            // 1. Update LLM Providers
            for (const config of PROVIDER_CONFIGS) {
                const existingProvider = providers.find(p => p.provider === config.id);

                const providerData: LLMProvider = {
                    id: existingProvider?.id || crypto.randomUUID(),
                    name: config.name,
                    provider: config.id,
                    apiKey: apiKeys[config.id] || '',
                    enabled: activeProvider === config.id,
                    isCustom: false,
                    baseUrl: undefined
                };

                await adminService.saveProvider(providerData);

                // Sync models for this provider (Ensures DB table is populated so RPC works)
                await adminService.syncProviderModels(providerData.id, config.models);
            }

            // 2. Update Deepgram Provider
            const existingDeepgram = providers.find(p => p.provider === 'deepgram');
            const deepgramData: LLMProvider = {
                id: existingDeepgram?.id || crypto.randomUUID(),
                name: 'Deepgram',
                provider: 'deepgram',
                apiKey: apiKeys['deepgram'] || '',
                enabled: true, // Always enabled if configured
                isCustom: false,
                baseUrl: undefined
            };
            await adminService.saveProvider(deepgramData);

            // Save model selections
            await adminService.setAppConfig('selected_models', selectedModels);
            await adminService.setAppConfig('custom_models', customModels);

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

        } catch (err) {
            console.error('Failed to save settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link
                            to="/admin/dashboard"
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">AI Provider Settings</h1>
                    </div>
                    <p className="text-slate-400 ml-11">Configure AI providers and model selection</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : saved ? (
                        <>
                            <CheckCircle className="w-4 h-4" />
                            Saved!
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Settings
                        </>
                    )}
                </button>
            </div>

            {/* Main Content - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Provider Selection */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-2">AI Provider</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Select one provider below. The selected card becomes the system default.
                    </p>

                    <div className="space-y-3">
                        {PROVIDER_CONFIGS.map((config) => (
                            <label
                                key={config.id}
                                className={`
                                    block p-4 rounded-xl border-2 cursor-pointer transition-all
                                    ${activeProvider === config.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                                    }
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="provider"
                                        value={config.id}
                                        checked={activeProvider === config.id}
                                        onChange={(e) => setActiveProvider(e.target.value)}
                                        className="mt-1 w-4 h-4 text-primary border-slate-600 focus:ring-primary/50 bg-slate-800"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-white">{config.name}</p>
                                        <p className="text-sm text-slate-400 mt-0.5">{config.description}</p>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Right Column - Model Selection */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-white mb-2">Model Selection</h2>
                    <p className="text-sm text-slate-400 mb-6">
                        Choose the model to use for each provider or provide a custom identifier.
                    </p>

                    <div className="space-y-6">
                        {PROVIDER_CONFIGS.map((config) => (
                            <div key={config.id}>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {config.name} Model
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="relative">
                                        <select
                                            value={selectedModels[config.id] || config.defaultModel}
                                            onChange={(e) => setSelectedModels(prev => ({
                                                ...prev,
                                                [config.id]: e.target.value
                                            }))}
                                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                                        >
                                            {config.models.map(model => (
                                                <option key={model.id} value={model.id}>
                                                    {model.name}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={`Custom ${config.name} model`}
                                        value={customModels[config.id] || ''}
                                        onChange={(e) => setCustomModels(prev => ({
                                            ...prev,
                                            [config.id]: e.target.value
                                        }))}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1.5">
                                    Custom entry overrides the dropdown value.
                                </p>
                            </div>
                        ))}

                        {/* Deepgram Model */}
                        <div className="pt-4 border-t border-slate-800">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1 bg-purple-500/20 rounded">
                                    <svg className="w-3 h-3 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                        <line x1="12" y1="19" x2="12" y2="23" />
                                        <line x1="8" y1="23" x2="16" y2="23" />
                                    </svg>
                                </div>
                                <label className="text-sm font-medium text-slate-300">Deepgram Model (Speech)</label>
                            </div>
                            <div className="relative">
                                <select
                                    value={selectedModels['deepgram'] || 'nova-2'}
                                    onChange={(e) => setSelectedModels(prev => ({
                                        ...prev,
                                        ['deepgram']: e.target.value
                                    }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                                >
                                    <option value="nova-2">Nova 2 (Recommended)</option>
                                    <option value="nova">Nova</option>
                                    <option value="enhanced">Enhanced</option>
                                    <option value="base">Base</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Keys Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-2">
                    <Key className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-white">API Keys</h2>
                </div>
                <p className="text-sm text-slate-400 mb-6">
                    Enter API keys for each provider you wish to use. Keys are stored securely.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {PROVIDER_CONFIGS.map((config) => (
                        <div key={config.id}>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {config.name} API Key
                            </label>
                            <div className="relative">
                                <input
                                    type={visibleKeys[config.id] ? 'text' : 'password'}
                                    placeholder={`Enter ${config.name} API key...`}
                                    value={apiKeys[config.id] || ''}
                                    onChange={(e) => setApiKeys(prev => ({
                                        ...prev,
                                        [config.id]: e.target.value
                                    }))}
                                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary font-mono text-sm pr-20"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setVisibleKeys(prev => ({ ...prev, [config.id]: !prev[config.id] }))}
                                        className="text-slate-500 hover:text-white"
                                        title={visibleKeys[config.id] ? "Hide Key" : "Show Key"}
                                    >
                                        {visibleKeys[config.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                    {apiKeys[config.id] ? (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 text-slate-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Deepgram Key */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <label className="block text-sm font-medium text-slate-300">Deepgram API Key</label>
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">Speech</span>
                        </div>
                        <div className="relative">
                            <input
                                type={visibleKeys['deepgram'] ? 'text' : 'password'}
                                placeholder="Enter Deepgram API Key..."
                                value={apiKeys['deepgram'] || ''}
                                onChange={(e) => setApiKeys(prev => ({
                                    ...prev,
                                    ['deepgram']: e.target.value
                                }))}
                                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary font-mono text-sm pr-20"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setVisibleKeys(prev => ({ ...prev, 'deepgram': !prev['deepgram'] }))}
                                    className="text-slate-500 hover:text-white"
                                    title={visibleKeys['deepgram'] ? "Hide Key" : "Show Key"}
                                >
                                    {visibleKeys['deepgram'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                {apiKeys['deepgram'] ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-slate-500" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminProvidersPage;
