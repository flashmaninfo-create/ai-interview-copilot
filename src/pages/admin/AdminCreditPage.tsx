/**
 * Admin Credit Pricing Page
 *
 * Configure credit pricing at /admin/credit.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Save, ArrowLeft, Info } from 'lucide-react';

export function AdminCreditPage() {
    const [creditPrice, setCreditPrice] = useState<string>('0.10');
    const [savingPrice, setSavingPrice] = useState(false);
    const [priceSaved, setPriceSaved] = useState(false);

    useEffect(() => {
        // Load saved credit price
        const savedPrice = localStorage.getItem('admin_credit_price');
        if (savedPrice) {
            setCreditPrice(savedPrice);
        }
    }, []);

    const handleSaveCreditPrice = () => {
        setSavingPrice(true);
        // Save to localStorage for now (in production, this would be an API call)
        localStorage.setItem('admin_credit_price', creditPrice);
        setTimeout(() => {
            setSavingPrice(false);
            setPriceSaved(true);
            setTimeout(() => setPriceSaved(false), 2000);
        }, 500);
    };

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <Link
                    to="/admin/dashboard"
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-white">Credit Pricing</h1>
                    <p className="text-slate-400 text-sm">Configure the cost per credit for users</p>
                </div>
            </div>

            {/* Main Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Price Settings</h2>
                        <p className="text-slate-400 text-sm">Set how much each credit costs in USD</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Price Input */}
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Price per Credit (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={creditPrice}
                                onChange={(e) => setCreditPrice(e.target.value)}
                                className="w-full pl-10 pr-4 py-4 bg-slate-800 border border-slate-700 rounded-xl text-white text-xl font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                placeholder="0.10"
                            />
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-300">
                            <p className="font-medium mb-1">How Credit Pricing Works</p>
                            <p className="text-blue-300/80">
                                This price is used when users purchase credits through the platform. 
                                For example, if you set the price to $0.10, a user buying 100 credits 
                                will pay $10.00. Changes take effect immediately for all new purchases.
                            </p>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSaveCreditPrice}
                            disabled={savingPrice}
                            className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                                priceSaved
                                    ? 'bg-green-500 text-white'
                                    : 'bg-primary text-white hover:bg-primary/90'
                            } disabled:opacity-50`}
                        >
                            {savingPrice ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    Saving...
                                </>
                            ) : priceSaved ? (
                                <>
                                    <Save className="w-5 h-5" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Save Price
                                </>
                            )}
                        </button>
                        {priceSaved && (
                            <span className="text-green-400 text-sm">Price updated successfully!</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Pricing Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[10, 50, 100].map((amount) => (
                        <div
                            key={amount}
                            className="p-4 bg-slate-800 rounded-xl border border-slate-700"
                        >
                            <p className="text-slate-400 text-sm">{amount} Credits</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                ${(parseFloat(creditPrice || '0') * amount).toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AdminCreditPage;
