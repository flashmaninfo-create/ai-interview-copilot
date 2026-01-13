/**
 * Payment Modal
 * 
 * Shows payment summary and redirects to Razorpay hosted checkout.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    amount: string;
    credits: number;
    planId: string;
}

export function PaymentModal({ isOpen, onClose, planName, amount, credits, planId }: PaymentModalProps) {
    const [status, setStatus] = useState<'idle' | 'processing' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handlePayment = async () => {
        console.log('[Payment] Starting redirect checkout...');
        setStatus('processing');
        setErrorMsg('');

        try {
            const payload = {
                planId,
                planName,
                amount: parseFloat(amount),
                credits,
            };
            console.log('[Payment] Calling Edge Function with:', payload);

            // Call Edge Function to create payment link
            const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
                body: payload
            });

            console.log('[Payment] Edge Function response:', { data, error });

            if (error) {
                console.error('[Payment] Edge function error:', error);
                // Try to get more details from the error
                const errorMessage = typeof error === 'object' 
                    ? (error.message || JSON.stringify(error)) 
                    : String(error);
                throw new Error(errorMessage || 'Failed to create payment');
            }

            if (!data?.success || !data?.paymentLinkUrl) {
                console.error('[Payment] Invalid response:', data);
                throw new Error(data?.error || 'Failed to create payment link');
            }

            console.log('[Payment] Redirecting to:', data.paymentLinkUrl);
            
            // Redirect to Razorpay hosted checkout
            window.location.href = data.paymentLinkUrl;

        } catch (err: any) {
            console.error('[Payment] Exception:', err);
            setStatus('error');
            setErrorMsg(err.message || 'Unexpected error occurred');
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
                                    <p className="text-sm text-slate-400 mt-1">You'll be redirected to Razorpay</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    disabled={status === 'processing'}
                                    className="p-1 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white disabled:opacity-50"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
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
                                            <span className="text-xl font-bold text-white">₹{amount}</span>
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
                                                Redirecting...
                                            </>
                                        ) : (
                                            <>
                                                <ExternalLink className="w-5 h-5 mr-2" />
                                                Pay ₹{amount}
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-center text-xs text-slate-500 mt-4">
                                        You'll be redirected to Razorpay's secure checkout page.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
