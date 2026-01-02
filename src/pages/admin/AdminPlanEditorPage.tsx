
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { planService } from '../../lib/services/planService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export function AdminPlanEditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = id && id !== 'new';

    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        price_monthly: 0,
        credits_monthly: 0,
        features: '' as string, // We'll manage as newline separated string
        is_active: true
    });

    useEffect(() => {
        if (isEditing) {
            loadPlan(id!);
        }
    }, [id]);

    async function loadPlan(planId: string) {
        const { data, error } = await planService.getPlan(planId);
        if (error || !data) {
            setError(error?.message || 'Plan not found');
            setLoading(false);
            return;
        }

        setFormData({
            name: data.name,
            slug: data.slug,
            price_monthly: data.price_monthly / 100, // Convert cents to dollars for input
            credits_monthly: data.credits_monthly,
            features: Array.isArray(data.features) ? data.features.join('\n') : '',
            is_active: data.is_active ?? true
        });
        setLoading(false);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const payload = {
            name: formData.name,
            slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
            price_monthly: Math.round(formData.price_monthly * 100), // Convert to cents
            credits_monthly: Number(formData.credits_monthly),
            features: formData.features.split('\n').filter(f => f.trim().length > 0),
            is_active: formData.is_active
        };

        const { error } = isEditing
            ? await planService.updatePlan(id!, payload)
            : await planService.createPlan(payload);

        setSaving(false);

        if (error) {
            setError(error.message);
        } else {
            navigate('/admin/plans');
        }
    }

    if (loading) return <div className="flex justify-center p-12"><LoadingSpinner /></div>;

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">
                {isEditing ? 'Edit Plan' : 'Create New Plan'}
            </h1>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border border-slate-200 space-y-6">

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name</label>
                    <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                {/* Slug */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL friendly)</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary"
                        value={formData.slug}
                        onChange={e => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="e.g. pro-plan"
                    />
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Price (Monthly $)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary"
                            value={formData.price_monthly}
                            onChange={e => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Credits (Monthly)</label>
                        <input
                            type="number"
                            min="0"
                            required
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary"
                            value={formData.credits_monthly}
                            onChange={e => setFormData({ ...formData, credits_monthly: Number(e.target.value) })}
                        />
                    </div>
                </div>

                {/* Features */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Features (One per line)</label>
                    <textarea
                        rows={5}
                        className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-primary focus:border-primary font-mono text-sm"
                        value={formData.features}
                        onChange={e => setFormData({ ...formData, features: e.target.value })}
                        placeholder="Access to GPT-4&#10;Unlimited History&#10;Priority Support"
                    />
                </div>

                {/* Status */}
                <div className="flex items-center">
                    <input
                        type="checkbox"
                        id="is_active"
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        checked={formData.is_active}
                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-slate-900">
                        Active (Visible to users)
                    </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/plans')}
                        className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Plan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
