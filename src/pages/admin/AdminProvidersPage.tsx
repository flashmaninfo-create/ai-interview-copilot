
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { llmService } from '../../lib/services/llmService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { Database } from '../../types/database.types';
import { Cpu, Zap, Sparkles, Box, Check, ExternalLink } from 'lucide-react';

type LLMProvider = Database['public']['Tables']['llm_providers']['Row'];

export function AdminProvidersPage() {
    const navigate = useNavigate();
    const [providers, setProviders] = useState<LLMProvider[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);

    useEffect(() => {
        loadProviders();
    }, []);

    async function loadProviders() {
        setLoading(true);
        const { data, error } = await llmService.getProviders();
        if (error) {
            setError(error.message);
        } else {
            setProviders(data);
        }
        setLoading(false);
    }

    const handleEnable = async (id: string) => {
        setToggling(id);
        try {
            await llmService.enableProvider(id);
            // Reload to reflect all others disabled
            await loadProviders();
        } catch (err) {
            console.error('Failed to enable provider:', err);
            alert('Failed to enable provider');
        } finally {
            setToggling(null);
        }
    };

    const getIcon = (slug: string) => {
        if (slug.includes('openai')) return <Sparkles className="w-8 h-8 text-green-600" />;
        if (slug.includes('anthropic')) return <Box className="w-8 h-8 text-purple-600" />;
        if (slug.includes('google') || slug.includes('gemini')) return <Zap className="w-8 h-8 text-blue-600" />;
        return <Cpu className="w-8 h-8 text-slate-600" />;
    };

    if (loading && providers.length === 0) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">LLM Providers</h1>
                    <p className="text-slate-500 mt-1">Select the active AI provider for the platform.</p>
                </div>
                <button
                    onClick={() => navigate('/admin/providers/new')}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                >
                    <ExternalLink className="w-4 h-4" />
                    Add Custom Provider
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providers.map((provider) => {
                    const isActive = provider.enabled;
                    return (
                        <div
                            key={provider.id}
                            className={`relative group bg-white rounded-xl border-2 transition-all duration-200 ${isActive
                                    ? 'border-primary shadow-md ring-2 ring-primary/10'
                                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                }`}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${isActive ? 'bg-primary/5' : 'bg-slate-50'}`}>
                                        {getIcon(provider.slug)}
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={isActive || false}
                                                onChange={() => !isActive && handleEnable(provider.id)}
                                                disabled={isActive || toggling !== null} // Prevent disabling the only active one directly (must enable another to switch) or clicking while loading
                                            />
                                            <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isActive ? 'peer-checked:bg-primary' : ''
                                                }`}></div>
                                        </label>
                                        <span className={`text-xs font-medium mt-1 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                                            {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-slate-900 mb-1">{provider.name}</h3>
                                <div className="text-sm text-slate-500 font-mono mb-4">{provider.slug}</div>

                                {/* Quick Config Area */}
                                <div className="pt-4 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-slate-600 flex items-center gap-1">
                                            {/* Could show model count here if we fetched it */}
                                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                            Configured
                                        </div>
                                        <button
                                            onClick={() => navigate(`/admin/providers/${provider.id}`)}
                                            className="text-sm font-medium text-slate-600 hover:text-primary transition-colors flex items-center gap-1 group-hover:underline"
                                        >
                                            Configure Keys &rarr;
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Loading Overlay */}
                            {toggling === provider.id && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                                    <LoadingSpinner size="sm" />
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Empty State / Add New Card */}
                <button
                    onClick={() => navigate('/admin/providers/new')}
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all group min-h-[240px]"
                >
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-white text-slate-400 group-hover:text-primary transition-colors shadow-sm">
                        <ExternalLink className="w-6 h-6" />
                    </div>
                    <span className="font-medium text-slate-600 group-hover:text-slate-900">Add Another Provider</span>
                </button>
            </div>
        </div>
    );
}
