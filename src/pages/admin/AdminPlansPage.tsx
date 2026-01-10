/**
 * Admin Plans Page
 *
 * Manage credit packages and pricing.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminService, type CreditPlan } from '../../lib/services/adminService';
import { 
    CreditCard, 
    Plus, 
    Edit2, 
    Trash2, 
    ArrowLeft,
    Check,
    DollarSign,
    Save,
    Info
} from 'lucide-react';

export function AdminPlansPage() {
    const navigate = useNavigate();
    const [plans, setPlans] = useState<CreditPlan[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Price per credit settings
    const [pricePerCredit, setPricePerCredit] = useState<string>('10');
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSaved, setSettingsSaved] = useState(false);

    useEffect(() => {
        loadPlans();
        loadPriceSettings();
    }, []);

    const loadPlans = async () => {
        try {
            setLoading(true);
            const data = await adminService.getCreditPlans();
            setPlans(data);
        } catch (err) {
            console.error('Failed to load plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadPriceSettings = async () => {
        try {
            const savedPrice = await adminService.getAppConfig('price_per_credit');
            if (savedPrice) setPricePerCredit(String(savedPrice));
        } catch (err) {
            console.error('Failed to load price settings:', err);
        }
    };

    const handleSavePriceSettings = async () => {
        try {
            setSavingSettings(true);
            const priceValue = parseFloat(pricePerCredit) || 10;
            
            // Save the price per credit setting
            await adminService.setAppConfig('price_per_credit', priceValue);
            await adminService.setAppConfig('credit_currency', 'INR');
            
            // Recalculate all plan prices based on the new price per credit
            if (plans.length > 0) {
                for (const plan of plans) {
                    const newPrice = Math.round(plan.credits * priceValue);
                    await adminService.saveCreditPlan({
                        ...plan,
                        price: newPrice,
                        currency: 'INR'
                    });
                }
                
                // Reload plans to show updated prices
                await loadPlans();
            }
            
            setSettingsSaved(true);
            setTimeout(() => setSettingsSaved(false), 2000);
        } catch (err) {
            console.error('Failed to save price settings:', err);
            alert('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!window.confirm('Are you sure you want to delete this plan?')) return;
        
        try {
            await adminService.deleteCreditPlan(planId);
            setPlans(prev => prev.filter(p => p.id !== planId));
        } catch (err) {
            console.error('Failed to delete plan:', err);
            alert('Failed to delete plan');
        }
    };

    // Calculate suggested price for a given credit amount
    const getSuggestedPrice = (credits: number) => {
        return (credits * parseFloat(pricePerCredit || '0')).toFixed(0);
    };

    return (
        <div className="space-y-6">
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
                        <h1 className="text-2xl font-bold text-white">Credit Plans</h1>
                    </div>
                    <p className="text-slate-400 ml-11">Manage credit packages and pricing</p>
                </div>
                <button
                    onClick={() => navigate('/admin/plans/new')}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Plan
                </button>
            </div>

            {/* Price per Credit Setting */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Price per Credit</h2>
                        <p className="text-slate-400 text-sm">Set the base price for 1 credit. Plan prices will be calculated automatically.</p>
                    </div>
                </div>

                <div className="flex items-end gap-4 flex-wrap">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Price per Credit (₹ INR)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pricePerCredit}
                                onChange={(e) => setPricePerCredit(e.target.value)}
                                className="w-32 pl-8 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSavePriceSettings}
                        disabled={savingSettings}
                        className={`px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                            settingsSaved
                                ? 'bg-green-500 text-white'
                                : 'bg-primary text-white hover:bg-primary/90'
                        } disabled:opacity-50`}
                    >
                        <Save className="w-4 h-4" />
                        {savingSettings ? 'Saving & Updating...' : settingsSaved ? 'Saved!' : 'Save & Update All Prices'}
                    </button>
                </div>

                {/* Preview */}
                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-300">
                        <span className="font-medium">Preview:</span> At ₹{pricePerCredit}/credit, 
                        a plan with <strong>100 credits</strong> = <strong>₹{getSuggestedPrice(100)}</strong>, 
                        <strong> 200 credits</strong> = <strong>₹{getSuggestedPrice(200)}</strong>
                    </div>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative group hover:border-slate-700 transition-all"
                    >
                        {plan.popular && (
                            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                POPULAR
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">
                                        ₹{plan.price}
                                    </span>
                                    <span className="text-slate-500 text-sm">/ pack</span>
                                </div>
                            </div>
                            <div className={`p-2 rounded-lg ${plan.active ? 'bg-green-500/10 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                                <CreditCard className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="mb-4">
                             <div className="text-3xl font-bold text-primary mb-1">
                                {plan.credits}
                             </div>
                             <div className="text-sm text-slate-400 font-medium">
                                CREDITS
                             </div>
                        </div>

                        <div className="space-y-2 mb-6 min-h-[100px]">
                            {plan.features.slice(0, 4).map((feature, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                            <button
                                onClick={() => navigate(`/admin/plans/${plan.id}`)}
                                className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(plan.id)}
                                className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {plans.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium text-slate-400">No credit plans found</p>
                        <p className="text-sm mb-4">Create your first credit package to start selling.</p>
                        <button
                            onClick={() => navigate('/admin/plans/new')}
                            className="text-primary hover:underline"
                        >
                            Create Plan
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminPlansPage;
