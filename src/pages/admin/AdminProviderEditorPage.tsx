
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { llmService } from '../../lib/services/llmService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Database } from '../../types/database.types';

type LLMProvider = Database['public']['Tables']['llm_providers']['Row'];
type LLMModel = Database['public']['Tables']['llm_models']['Row'];

export function AdminProviderEditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id && id !== 'new';

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Provider State
    const [providerData, setProviderData] = useState<Partial<LLMProvider>>({
        name: '',
        slug: '',
        api_key_encrypted: '',
        enabled: true,
        config: {}
    });

    // Models State
    const [models, setModels] = useState<LLMModel[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);

    useEffect(() => {
        if (isEditing) {
            loadData(id!);
        }
    }, [id]);

    async function loadData(providerId: string) {
        setLoading(true);
        // Load Provider
        const { data: prov, error: provErr } = await llmService.getProvider(providerId);
        if (provErr || !prov) {
            setError(provErr?.message || 'Provider not found');
            setLoading(false);
            return;
        }
        setProviderData(prov);

        // Load Models
        setLoadingModels(true);
        const { data: mods, error: modErr } = await llmService.getModels(providerId);
        if (modErr) {
            console.error("Failed to load models", modErr);
        } else {
            setModels(mods);
        }
        setLoadingModels(false);
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        // If editing and key is empty, explicit null or keep existing?
        // UI shows empty string... user might mean "no change" or "clear".
        // To support "no change", we need to know if it was masked.
        // Simple approach: If empty string, DO NOT send api_key in update?
        // But upsertProvider takes the whole object.
        // Let's refine the payload.

        const payload: any = { ...providerData };
        if (isEditing && payload.api_key_encrypted === '') {
            delete payload.api_key_encrypted; // Don't wipe key if not provided
            // If user leaves it empty, they don't want to change it.
            // If they type something, we send it.
        }

        const { error } = await llmService.upsertProvider(payload as any);

        setSaving(false);

        if (error) {
            setError(error.message);
        } else if (!isEditing) {
            // New provider created, navigate to list likely
            navigate('/admin/providers');
        } else {
            // Stay on page and show success?
            alert('Provider updated');
        }
    }

    // Model handlers
    const handleAddModel = async () => {
        if (!isEditing) return alert('Save provider first');
        const name = prompt('Model Name (e.g. GPT-4)');
        if (!name) return;
        const modelId = prompt('Model ID (e.g. gpt-4)');
        if (!modelId) return;

        await llmService.upsertModel({
            provider_id: id!,
            name,
            model_id: modelId,
            enabled: true,
            cost_per_token: 0
        });
        loadData(id!);
    };

    const handleDeleteModel = async (modelId: string) => {
        if (!confirm('Delete this model?')) return;
        await llmService.deleteModel(modelId);
        loadData(id!);
    };

    const handleToggleModel = async (model: LLMModel) => {
        await llmService.upsertModel({
            ...model,
            enabled: !model.enabled
        });
        loadData(id!);
    };

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">
                {isEditing ? 'Edit Provider' : 'Add LLM Provider'}
            </h1>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Provider Form */}
                <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">Provider Details</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary"
                                value={providerData.name}
                                onChange={e => setProviderData({ ...providerData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary"
                                value={providerData.slug}
                                onChange={e => setProviderData({ ...providerData, slug: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                            <input
                                type="password"
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary"
                                value={providerData.api_key_encrypted || ''}
                                onChange={e => setProviderData({ ...providerData, api_key_encrypted: e.target.value })}
                                placeholder={isEditing ? "(Unchanged)" : "sk-..."}
                            />
                        </div>
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="prov_enabled"
                                className="h-4 w-4 text-primary rounded"
                                checked={providerData.enabled ?? true}
                                onChange={e => setProviderData({ ...providerData, enabled: e.target.checked })}
                            />
                            <label htmlFor="prov_enabled" className="ml-2 text-sm text-slate-900">Enabled</label>
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/providers')}
                                className="px-4 py-2 mr-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                            >
                                {saving ? 'Save Provider' : 'Save Details'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Models List (Only if editing) */}
                {isEditing && (
                    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Models</h2>
                            <button
                                onClick={handleAddModel}
                                className="text-sm bg-slate-100 px-3 py-1 rounded hover:bg-slate-200 text-slate-800"
                            >
                                + Add Model
                            </button>
                        </div>

                        {loadingModels ? (
                            <LoadingSpinner size="sm" />
                        ) : (
                            <div className="space-y-3">
                                {models.map(model => (
                                    <div key={model.id} className="flex justify-between items-center p-3 border border-slate-100 rounded bg-slate-50">
                                        <div>
                                            <div className="font-medium text-slate-900">{model.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">{model.model_id}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleModel(model)}
                                                className={`text-xs px-2 py-1 rounded ${model.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                                            >
                                                {model.enabled ? 'ON' : 'OFF'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteModel(model.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {models.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-4">No models. Add one to enable this provider.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
