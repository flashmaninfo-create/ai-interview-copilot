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
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Credit Pricing</h1>
                    <p className="text-muted-foreground text-sm">Configure the cost per credit for users</p>
                </div>
            </div>

            {/* Main Section */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <DollarSign className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Price Settings</h2>
                        <p className="text-muted-foreground text-sm">Set how much each credit costs in INR</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Price Input */}
                    <div className="max-w-md">
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Price per Credit (INR)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">₹</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={creditPrice}
                                onChange={(e) => setCreditPrice(e.target.value)}
                                className="w-full pl-10 pr-4 py-4 bg-background border border-border rounded-xl text-foreground text-xl font-semibold placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
                                placeholder="0.10"
                            />
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-3 p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                        <Info className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-sky-600 dark:text-sky-400">
                            <p className="font-medium mb-1">How Credit Pricing Works</p>
                            <p className="opacity-90">
                                This price is used when users purchase credits through the platform. 
                                For example, if you set the price to ₹0.10, a user buying 100 credits 
                                will pay ₹10.00. Changes take effect immediately for all new purchases.
                            </p>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSaveCreditPrice}
                            disabled={savingPrice}
                            className={`px-8 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-sm ${
                                priceSaved
                                    ? 'bg-green-500 text-white'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                            } disabled:opacity-50`}
                        >
                            {savingPrice ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
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
                            <span className="text-green-500 text-sm font-medium">Price updated successfully!</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Card */}
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">Pricing Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[10, 50, 100].map((amount) => (
                        <div
                            key={amount}
                            className="p-4 bg-muted/50 rounded-xl border border-border"
                        >
                            <p className="text-muted-foreground text-sm">{amount} Credits</p>
                            <p className="text-2xl font-bold text-foreground mt-1">
                                ₹{(parseFloat(creditPrice || '0') * amount).toFixed(2)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AdminCreditPage;
