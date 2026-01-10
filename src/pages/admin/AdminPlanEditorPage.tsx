/**
 * Admin Plan Editor Page
 *
 * Create or edit credit packages.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminService, type CreditPlan } from '../../lib/services/adminService';
import { 
    ArrowLeft, 
    Save, 
    CreditCard, 
    Plus, 
    X,
    CheckCircle
} from 'lucide-react';

export function AdminPlanEditorPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id;

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    
    // Price per credit settings from global config
    const [pricePerCredit, setPricePerCredit] = useState<number>(10);
    const [autoCalculate, setAutoCalculate] = useState<boolean>(true);
    
    const [plan, setPlan] = useState<CreditPlan>({
        id: crypto.randomUUID(),
        name: '',
        credits: 100,
        price: 1000,
        currency: 'INR',
        active: true,
        popular: false,
        features: ['Standard Support', 'All Interview Modes']
    });

    // Calculate price based on credits
    const calculatePrice = useCallback((credits: number) => {
        return Math.round(credits * pricePerCredit);
    }, [pricePerCredit]);

    // Load price settings from app config
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedPrice = await adminService.getAppConfig('price_per_credit');
                const savedCurrency = await adminService.getAppConfig('credit_currency');
                if (savedPrice) setPricePerCredit(Number(savedPrice));
                if (savedCurrency && isNew) {
                    setPlan(p => ({ ...p, currency: String(savedCurrency) }));
                }
            } catch (err) {
                console.error('Failed to load price settings:', err);
            }
        };
        loadSettings();
    }, [isNew]);

    useEffect(() => {
        if (!isNew && id) {
            loadPlan(id);
        }
    }, [id, isNew]);

    // Auto-calculate price when credits change (only if auto-calculate is on)
    useEffect(() => {
        if (autoCalculate && isNew) {
            setPlan(p => ({ ...p, price: calculatePrice(p.credits) }));
        }
    }, [plan.credits, autoCalculate, calculatePrice, isNew]);

    const loadPlan = async (planId: string) => {
        try {
            const data = await adminService.getCreditPlan(planId);
            if (data) {
                setPlan(data);
                // When editing, don't auto-calculate by default
                setAutoCalculate(false);
            } else {
                navigate('/admin/plans');
            }
        } catch (err) {
            console.error('Failed to load plan:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await adminService.saveCreditPlan(plan);
            navigate('/admin/plans');
        } catch (err) {
            console.error('Failed to save plan:', err);
            alert('Failed to save plan');
        } finally {
            setSaving(false);
        }
    };

    const addFeature = () => {
        setPlan(prev => ({
            ...prev,
            features: [...prev.features, 'New Feature']
        }));
    };

    const updateFeature = (index: number, value: string) => {
        const newFeatures = [...plan.features];
        newFeatures[index] = value;
        setPlan(prev => ({ ...prev, features: newFeatures }));
    };

    const removeFeature = (index: number) => {
        setPlan(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link 
                            to="/admin/plans" 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">
                            {isNew ? 'Create Credit Plan' : 'Edit Plan'}
                        </h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Plan Name</label>
                        <input
                            type="text"
                            value={plan.name}
                            onChange={e => setPlan(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Starter Pack"
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Credits</label>
                            <input
                                type="number"
                                value={plan.credits}
                                onChange={e => {
                                    const credits = parseInt(e.target.value) || 0;
                                    setPlan(p => ({
                                        ...p,
                                        credits,
                                        price: autoCalculate ? calculatePrice(credits) : p.price
                                    }));
                                }}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-300">Price (₹ INR)</label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoCalculate}
                                        onChange={e => {
                                            setAutoCalculate(e.target.checked);
                                            if (e.target.checked) {
                                                setPlan(p => ({ ...p, price: calculatePrice(p.credits) }));
                                            }
                                        }}
                                        className="rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/50"
                                    />
                                    <span className="text-xs text-slate-400">Auto</span>
                                </label>
                            </div>
                            <input
                                type="number"
                                step="1"
                                value={plan.price}
                                onChange={e => setPlan(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
                                disabled={autoCalculate}
                                className={`w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-primary ${autoCalculate ? 'opacity-60' : ''}`}
                            />
                            {autoCalculate && (
                                <p className="text-xs text-emerald-400 mt-1">
                                    Auto-calculated: {plan.credits} credits × ₹{pricePerCredit} = ₹{plan.price}
                                </p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Features List</label>
                        <div className="space-y-3">
                            {plan.features.map((feature, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={feature}
                                        onChange={e => updateFeature(i, e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
                                    />
                                    <button
                                        onClick={() => removeFeature(i)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={addFeature}
                                className="w-full py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-sm border border-dashed border-slate-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Feature
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={plan.active}
                                onChange={e => setPlan(p => ({ ...p, active: e.target.checked }))}
                                className="rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/50"
                            />
                            <span className="text-sm text-slate-300">Active</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={plan.popular}
                                onChange={e => setPlan(p => ({ ...p, popular: e.target.checked }))}
                                className="rounded border-slate-700 bg-slate-800 text-primary focus:ring-primary/50"
                            />
                            <span className="text-sm text-slate-300">Mark as Popular</span>
                        </label>
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Plan
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Preview</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative group hover:border-primary/50 transition-all max-w-sm mx-auto shadow-2xl">
                        {plan.popular && (
                            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                POPULAR
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">{plan.name || 'Plan Name'}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-bold text-white">
                                        ₹{plan.price}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                <CreditCard className="w-6 h-6" />
                            </div>
                        </div>

                        <div className="mb-6 p-4 bg-slate-800/50 rounded-xl text-center border border-slate-800">
                             <div className="text-4xl font-bold text-primary mb-1">
                                {plan.credits}
                             </div>
                             <div className="text-xs text-slate-400 font-bold tracking-widest uppercase">
                                CREDITS
                             </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            {plan.features.map((feature, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm text-slate-300">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                            {plan.features.length === 0 && (
                                <p className="text-slate-500 text-center text-sm italic">Add features to see them listed here</p>
                            )}
                        </div>

                        <button className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-200 transition-colors">
                            Buy Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminPlanEditorPage;
