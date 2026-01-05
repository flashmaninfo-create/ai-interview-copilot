/**
 * Admin Payments Page
 *
 * Configure payment processors (Stripe and Razorpay) API keys and settings.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../lib/services/adminService';
import {
    CreditCard,
    ArrowLeft,
    Eye,
    EyeOff,
    Save,
    CheckCircle,
    AlertCircle,
    ExternalLink
} from 'lucide-react';

type PaymentProvider = 'stripe' | 'razorpay';

interface PaymentConfig {
    activeProvider: PaymentProvider;
    paymentsEnabled: boolean;
    stripe: {
        publishableKey: string;
        secretKey: string;
        webhookSecret: string;
    };
    razorpay: {
        keyId: string;
        keySecret: string;
        webhookSecret: string;
    };
}

const DEFAULT_CONFIG: PaymentConfig = {
    activeProvider: 'stripe',
    paymentsEnabled: false,
    stripe: {
        publishableKey: '',
        secretKey: '',
        webhookSecret: ''
    },
    razorpay: {
        keyId: '',
        keySecret: '',
        webhookSecret: ''
    }
};

export function AdminPaymentsPage() {
    const [config, setConfig] = useState<PaymentConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const savedConfig = await adminService.getAppConfig('payment_config_v2');
            if (savedConfig) {
                setConfig({ ...DEFAULT_CONFIG, ...savedConfig });
            }
        } catch (err) {
            console.error('Failed to load payment config:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSaveSuccess(false);

            // Validate based on active provider
            if (config.paymentsEnabled) {
                if (config.activeProvider === 'stripe') {
                    if (!config.stripe.publishableKey.startsWith('pk_')) {
                        setError('Invalid Stripe Publishable Key. Should start with "pk_"');
                        return;
                    }
                    if (!config.stripe.secretKey.startsWith('sk_')) {
                        setError('Invalid Stripe Secret Key. Should start with "sk_"');
                        return;
                    }
                } else if (config.activeProvider === 'razorpay') {
                    if (!config.razorpay.keyId.startsWith('rzp_')) {
                        setError('Invalid Razorpay Key ID. Should start with "rzp_"');
                        return;
                    }
                    if (!config.razorpay.keySecret) {
                        setError('Razorpay Key Secret is required');
                        return;
                    }
                }
            }

            await adminService.setAppConfig('payment_config_v2', config);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to save payment config:', err);
            setError('Failed to save payment configuration.');
        } finally {
            setSaving(false);
        }
    };

    const toggleShowSecret = (key: string) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isConfigured = config.activeProvider === 'stripe'
        ? config.stripe.publishableKey && config.stripe.secretKey
        : config.razorpay.keyId && config.razorpay.keySecret;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
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
                        <h1 className="text-2xl font-bold text-white">Payment Settings</h1>
                    </div>
                    <p className="text-slate-400 ml-11">Configure payment processor integration</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                        </>
                    ) : saveSuccess ? (
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

            {/* Status Card */}
            <div className={`rounded-xl p-4 border flex items-center gap-4 ${
                isConfigured && config.paymentsEnabled
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-slate-800/50 border-slate-700'
            }`}>
                <div className={`p-3 rounded-xl ${
                    isConfigured && config.paymentsEnabled
                        ? 'bg-green-500/20'
                        : 'bg-slate-700'
                }`}>
                    <CreditCard className={`w-6 h-6 ${
                        isConfigured && config.paymentsEnabled
                            ? 'text-green-400'
                            : 'text-slate-400'
                    }`} />
                </div>
                <div className="flex-1">
                    <p className="font-medium text-white">Payment Status</p>
                    <p className={`text-sm ${
                        isConfigured && config.paymentsEnabled
                            ? 'text-green-400'
                            : 'text-slate-400'
                    }`}>
                        {isConfigured && config.paymentsEnabled
                            ? `Payments enabled via ${config.activeProvider === 'stripe' ? 'Stripe' : 'Razorpay'}`
                            : isConfigured
                                ? 'Configured but disabled'
                                : 'Not configured'}
                    </p>
                </div>
                {isConfigured && config.paymentsEnabled && (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Provider Selection */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Payment Provider</h2>
                <p className="text-sm text-slate-400 mb-6">Select your preferred payment processor. Only one can be active at a time.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Stripe Option */}
                    <label className={`
                        block p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${config.activeProvider === 'stripe' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                        }
                    `}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="provider"
                                value="stripe"
                                checked={config.activeProvider === 'stripe'}
                                onChange={() => setConfig(prev => ({ ...prev, activeProvider: 'stripe' }))}
                                className="w-4 h-4 text-primary border-slate-600 focus:ring-primary/50 bg-slate-800"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white">Stripe</span>
                                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">Global</span>
                                </div>
                                <p className="text-sm text-slate-400 mt-0.5">Ideal for international payments</p>
                            </div>
                        </div>
                    </label>

                    {/* Razorpay Option */}
                    <label className={`
                        block p-4 rounded-xl border-2 cursor-pointer transition-all
                        ${config.activeProvider === 'razorpay' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                        }
                    `}>
                        <div className="flex items-center gap-3">
                            <input
                                type="radio"
                                name="provider"
                                value="razorpay"
                                checked={config.activeProvider === 'razorpay'}
                                onChange={() => setConfig(prev => ({ ...prev, activeProvider: 'razorpay' }))}
                                className="w-4 h-4 text-primary border-slate-600 focus:ring-primary/50 bg-slate-800"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white">Razorpay</span>
                                    <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded">India</span>
                                </div>
                                <p className="text-sm text-slate-400 mt-0.5">Best for Indian payments (UPI, cards)</p>
                            </div>
                        </div>
                    </label>
                </div>

                {/* Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                    <div>
                        <p className="text-white font-medium">Enable Payments</p>
                        <p className="text-sm text-slate-400">Accept payments from users</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.paymentsEnabled}
                            onChange={(e) => setConfig({ ...config, paymentsEnabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                </div>
            </div>

            {/* Stripe Configuration */}
            <div className={`bg-slate-900 rounded-xl border border-slate-800 p-6 transition-opacity ${
                config.activeProvider !== 'stripe' ? 'opacity-50' : ''
            }`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#635bff] rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>
                        <span className="text-white font-medium">Stripe Configuration</span>
                    </div>
                    <a
                        href="https://dashboard.stripe.com/apikeys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                        Get API Keys <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Publishable Key</label>
                        <input
                            type="text"
                            value={config.stripe.publishableKey}
                            onChange={(e) => setConfig(prev => ({ 
                                ...prev, 
                                stripe: { ...prev.stripe, publishableKey: e.target.value }
                            }))}
                            placeholder="pk_test_..."
                            disabled={config.activeProvider !== 'stripe'}
                            className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 font-mono text-sm disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Secret Key</label>
                        <div className="relative">
                            <input
                                type={showSecrets['stripe_secret'] ? 'text' : 'password'}
                                value={config.stripe.secretKey}
                                onChange={(e) => setConfig(prev => ({ 
                                    ...prev, 
                                    stripe: { ...prev.stripe, secretKey: e.target.value }
                                }))}
                                placeholder="sk_test_..."
                                disabled={config.activeProvider !== 'stripe'}
                                className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 font-mono text-sm disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => toggleShowSecret('stripe_secret')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showSecrets['stripe_secret'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Webhook Secret <span className="text-slate-500">(optional)</span></label>
                        <div className="relative">
                            <input
                                type={showSecrets['stripe_webhook'] ? 'text' : 'password'}
                                value={config.stripe.webhookSecret}
                                onChange={(e) => setConfig(prev => ({ 
                                    ...prev, 
                                    stripe: { ...prev.stripe, webhookSecret: e.target.value }
                                }))}
                                placeholder="whsec_..."
                                disabled={config.activeProvider !== 'stripe'}
                                className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 font-mono text-sm disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => toggleShowSecret('stripe_webhook')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showSecrets['stripe_webhook'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Razorpay Configuration */}
            <div className={`bg-slate-900 rounded-xl border border-slate-800 p-6 transition-opacity ${
                config.activeProvider !== 'razorpay' ? 'opacity-50' : ''
            }`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#072654] rounded-lg flex items-center justify-center text-white font-bold text-lg">R</div>
                        <span className="text-white font-medium">Razorpay Configuration</span>
                    </div>
                    <a
                        href="https://dashboard.razorpay.com/app/website-app-settings/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                        Get API Keys <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Key ID</label>
                        <input
                            type="text"
                            value={config.razorpay.keyId}
                            onChange={(e) => setConfig(prev => ({ 
                                ...prev, 
                                razorpay: { ...prev.razorpay, keyId: e.target.value }
                            }))}
                            placeholder="rzp_test_..."
                            disabled={config.activeProvider !== 'razorpay'}
                            className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 font-mono text-sm disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Key Secret</label>
                        <div className="relative">
                            <input
                                type={showSecrets['razorpay_secret'] ? 'text' : 'password'}
                                value={config.razorpay.keySecret}
                                onChange={(e) => setConfig(prev => ({ 
                                    ...prev, 
                                    razorpay: { ...prev.razorpay, keySecret: e.target.value }
                                }))}
                                placeholder="Your Razorpay secret..."
                                disabled={config.activeProvider !== 'razorpay'}
                                className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 font-mono text-sm disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => toggleShowSecret('razorpay_secret')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showSecrets['razorpay_secret'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Webhook Secret <span className="text-slate-500">(optional)</span></label>
                        <div className="relative">
                            <input
                                type={showSecrets['razorpay_webhook'] ? 'text' : 'password'}
                                value={config.razorpay.webhookSecret}
                                onChange={(e) => setConfig(prev => ({ 
                                    ...prev, 
                                    razorpay: { ...prev.razorpay, webhookSecret: e.target.value }
                                }))}
                                placeholder="Webhook secret..."
                                disabled={config.activeProvider !== 'razorpay'}
                                className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 font-mono text-sm disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => toggleShowSecret('razorpay_webhook')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                                {showSecrets['razorpay_webhook'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-sm">
                    <strong className="text-white">Note:</strong> Use test keys during development. 
                    Stripe test keys start with <code className="text-primary">pk_test_</code> / <code className="text-primary">sk_test_</code>.
                    Razorpay test keys start with <code className="text-primary">rzp_test_</code>.
                </p>
            </div>
        </div>
    );
}

export default AdminPaymentsPage;
