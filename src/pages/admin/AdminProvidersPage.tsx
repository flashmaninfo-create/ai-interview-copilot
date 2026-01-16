/**
 * AI Providers Configuration Page
 *
 * Manage connections to AI models (OpenAI, Anthropic, Gemini).
 * Allows setting API keys, enabling providers, and configuring default models.
 */

import { useState, useEffect } from 'react';
import { adminService, type LLMProvider } from '../../lib/services/adminService';
import { Cpu, Save, Key, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LLMModel {
    id: string;
    name: string;
    model_id: string;
    enabled: boolean;
}

interface ProviderModelConfig {
    selectedModel: string;
    customModel: string;
}

export function AdminProvidersPage() {
    const [providers, setProviders] = useState<LLMProvider[]>([]);
    const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
    
    // Store models available for each provider: { 'openai': [models], 'anthropic': [models] }
    const [allProviderModels, setAllProviderModels] = useState<Record<string, LLMModel[]>>({});
    
    // Store selected config for each provider: { 'openai': { selectedModel: 'gpt-4', customModel: '' } }
    const [modelConfigs, setModelConfigs] = useState<Record<string, ProviderModelConfig>>({});
    
    // Local state for API keys and visibility
    const [apiKeyEdits, setApiKeyEdits] = useState<Record<string, string>>({});
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const fetchedProviders = await adminService.getProviders();
            setProviders(fetchedProviders);
            
            // 1. Determine active provider
            const active = fetchedProviders.find(p => p.enabled && p.provider !== 'deepgram');
            if (active) {
                setActiveProviderId(active.id);
            } else {
                const firstLLM = fetchedProviders.find(p => p.provider !== 'deepgram');
                if (firstLLM) setActiveProviderId(firstLLM.id);
            }

            // 2. Initialize API Keys
            const initialKeys: Record<string, string> = {};
            fetchedProviders.forEach(p => {
                initialKeys[p.id] = p.apiKey || ''; 
            });
            setApiKeyEdits(initialKeys);

            // 3. Load models and configs for ALL LLM providers
            const llmProviders = fetchedProviders.filter(p => p.provider !== 'deepgram');
            const modelsMap: Record<string, LLMModel[]> = {};
            const configsMap: Record<string, ProviderModelConfig> = {};

            await Promise.all(llmProviders.map(async (p) => {
                // Fetch available models
                try {
                    const models = await adminService.getModels(p.id);
                    modelsMap[p.id] = models as unknown as LLMModel[];
                } catch (e) {
                    console.error(`Failed to load models for ${p.name}`, e);
                    modelsMap[p.id] = [];
                }

                // Fetch saved config (default model) from app_config
                // Key format: "{provider_slug}_model" and "{provider_slug}_custom_model"
                try {
                    const savedModel = await adminService.getAppConfig(`${p.provider}_model`);
                    const savedCustom = await adminService.getAppConfig(`${p.provider}_custom_model`);
                    
                    configsMap[p.id] = {
                        selectedModel: String(savedModel || ''),
                        customModel: String(savedCustom || '')
                    };
                } catch (e) {
                     configsMap[p.id] = { selectedModel: '', customModel: '' };
                }
            }));

            setAllProviderModels(modelsMap);
            setModelConfigs(configsMap);

        } catch (err) {
            console.error('Failed to load provider config:', err);
            setMessage({ type: 'error', text: 'Failed to load configuration' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);

            // 1. Save Providers (Active Status & API Keys)
            for (const provider of providers) {
                let isEnabled = provider.id === activeProviderId;
                if (provider.provider === 'deepgram') {
                    isEnabled = provider.enabled; // Preserve Deepgram state
                }

                const updatedKey = apiKeyEdits[provider.id];
                
                if (provider.enabled !== isEnabled || (updatedKey !== undefined && updatedKey !== provider.apiKey)) {
                     await adminService.saveProvider({
                        ...provider,
                        enabled: isEnabled,
                        apiKey: updatedKey
                    });
                }
            }

            // 2. Save Model Configs
            const llmProviders = providers.filter(p => p.provider !== 'deepgram');
            for (const p of llmProviders) {
                const config = modelConfigs[p.id];
                if (config) {
                     await adminService.setAppConfig(`${p.provider}_model`, config.selectedModel);
                     await adminService.setAppConfig(`${p.provider}_custom_model`, config.customModel);
                }
            }
            
            // Refresh
            const updatedProviders = await adminService.getProviders();
            setProviders(updatedProviders);

            setMessage({ type: 'success', text: 'Configuration saved successfully' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err: any) {
            console.error('Failed to save config:', err);
            setMessage({ type: 'error', text: err.message || 'Failed to save changes' });
        } finally {
            setSaving(false);
        }
    };

    const toggleKeyVisibility = (id: string) => {
        setVisibleKeys(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const updateModelConfig = (providerId: string, updates: Partial<ProviderModelConfig>) => {
        setModelConfigs(prev => ({
            ...prev,
            [providerId]: { ...prev[providerId], ...updates }
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const llmProviders = providers.filter(p => p.provider !== 'deepgram');

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                         <Link 
                            to="/admin/dashboard" 
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">AI Providers</h1>
                    </div>
                    <p className="text-muted-foreground ml-11">Configure LLM providers and API connections</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                    {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    message.type === 'success' 
                        ? 'bg-green-500/10 border-green-500/20 text-green-600' 
                        : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    {message.text}
                </div>
            )}

            {/* Main Content - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Provider Selection */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-primary" />
                        AI Provider
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Select one provider below. The selected card becomes the system default.
                    </p>

                    <div className="space-y-4">
                        {llmProviders.map((provider) => (
                            <label
                                key={provider.id}
                                className={`
                                    block p-4 rounded-xl border-2 cursor-pointer transition-all
                                    ${activeProviderId === provider.id
                                        ? 'border-primary bg-primary/5 shadow-md shadow-primary/5'
                                        : 'border-border hover:border-muted-foreground/30 bg-muted/30'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <input
                                        type="radio"
                                        name="provider"
                                        value={provider.id}
                                        checked={activeProviderId === provider.id}
                                        onChange={() => setActiveProviderId(provider.id)}
                                        className="w-5 h-5 text-primary border-muted-foreground focus:ring-primary bg-background"
                                    />
                                    <div>
                                        <div className="font-semibold text-foreground flex items-center gap-2">
                                            {provider.name}
                                            {activeProviderId === provider.id && (
                                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Active</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                                            Use {provider.name} models for interview analysis.
                                        </p>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Right Column - Model Selection */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Model Selection</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Choose the model to use for each provider or provide a custom identifier.
                    </p>

                    <div className="space-y-8">
                        {llmProviders.map((provider) => {
                             const models = allProviderModels[provider.id] || [];
                             const config = modelConfigs[provider.id] || { selectedModel: '', customModel: '' };

                             return (
                                <div key={provider.id} className="space-y-3">
                                    <label className="block text-sm font-medium text-foreground">
                                        {provider.name} Model
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <select
                                            value={config.selectedModel}
                                            onChange={(e) => updateModelConfig(provider.id, { selectedModel: e.target.value })}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="">Select a model...</option>
                                            {models.map(m => (
                                                <option key={m.id} value={m.model_id}>{m.name}</option>
                                            ))}
                                        </select>
                                        
                                        <input
                                            type="text"
                                            value={config.customModel}
                                            onChange={(e) => updateModelConfig(provider.id, { customModel: e.target.value })}
                                            placeholder={`Custom ${provider.name} model`}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Custom entry overrides the dropdown value if supported by the system.
                                    </p>
                                </div>
                             );
                        })}
                    </div>
                </div>
            </div>

            {/* API Keys Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Key className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {providers.map((provider) => (
                        <div key={provider.id}>
                            <label className="block text-sm font-medium text-foreground mb-1">{provider.name} API Key</label>
                            <div className="relative">
                                <input
                                    type={visibleKeys[provider.id] ? 'text' : 'password'}
                                    value={apiKeyEdits[provider.id] || ''}
                                    onChange={(e) => setApiKeyEdits(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 pr-10 text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                                    placeholder={`Enter ${provider.name} API Key...`}
                                />
                                <button
                                    type="button"
                                    onClick={() => toggleKeyVisibility(provider.id)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {visibleKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <p className="text-sm text-muted-foreground mt-6 bg-muted/50 p-4 rounded-lg">
                    <AlertCircle className="w-4 h-4 inline mr-2 -mt-0.5" />
                    Keys are stored securely. You may revert a key to empty to remove it.
                </p>
            </div>
        </div>
    );
}

export default AdminProvidersPage;
