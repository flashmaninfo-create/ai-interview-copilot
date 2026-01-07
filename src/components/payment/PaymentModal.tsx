import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { creditService } from '../../lib/services/creditService';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    amount: string;
    credits: number;
    planId: string;
}

export function PaymentModal({ isOpen, onClose, planName, amount, credits, planId }: PaymentModalProps) {
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handlePayment = async () => {
        setStatus('processing');

        // Simulate network delay for realism
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            const result = await creditService.purchaseCredits(
                planId,
                parseFloat(amount),
                credits
            );

            if (result.success) {
                setStatus('success');
                setTimeout(() => {
                    onClose();
                    setStatus('idle');
                    // Force a reload or credit refresh event if needed, but the page should update on mount
                    window.location.reload();
                }, 2000);
            } else {
                setStatus('error');
                setErrorMsg(result.error?.message || 'Payment failed');
            }
        } catch (err) {
            setStatus('error');
            setErrorMsg('Unexpected error occurred');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-surface border border-white/10 rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-green-400" />
                                        Secure Payment
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1">Simulated Secure Checkout</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                {status === 'success' ? (
                                    <div className="text-center py-8">
                                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CheckCircle className="w-8 h-8 text-green-500" />
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-2">Payment Successful!</h4>
                                        <p className="text-slate-400">
                                            You have successfully purchased {planName}. <br />
                                            <span className="text-green-400 font-bold">+{credits} Credits</span> added to your account.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Summary */}
                                        <div className="bg-white/5 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Plan</span>
                                                <span className="text-white font-medium">{planName}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Credits Included</span>
                                                <span className="text-white font-medium">{credits}</span>
                                            </div>
                                            <div className="h-px bg-white/10" />
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">Total</span>
                                                <span className="text-xl font-bold text-white">${amount}</span>
                                            </div>
                                        </div>

                                        {/* Fake Card Form */}
                                        <div className="space-y-3 opacity-75 pointer-events-none select-none">
                                            <label className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
                                                Card Details (Mock)
                                            </label>
                                            <div className="flex items-center gap-3 bg-black/20 border border-white/10 rounded-lg px-3 py-2.5">
                                                <CreditCard className="w-5 h-5 text-slate-500" />
                                                <span className="text-slate-300 font-mono">•••• •••• •••• 4242</span>
                                            </div>
                                        </div>

                                        {errorMsg && (
                                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                                                {errorMsg}
                                            </div>
                                        )}

                                        <Button
                                            fullWidth
                                            variant="primary"
                                            onClick={handlePayment}
                                            disabled={status === 'processing'}
                                            className="h-12 text-base font-bold"
                                        >
                                            {status === 'processing' ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                `Pay $${amount}`
                                            )}
                                        </Button>

                                        <p className="text-center text-xs text-slate-500 mt-4">
                                            This is a simulated payment. No real money will be charged.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
