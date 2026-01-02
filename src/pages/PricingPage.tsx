
import { useState, useEffect } from 'react';
import { Footer } from '../components/landing/Footer';
import { subscriptionService } from '../lib/services/subscriptionService';
import { useNotification } from '../contexts/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Database } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';

type Plan = Database['public']['Tables']['plans']['Row'];

export function PricingPage() {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const fetchedPlans = await subscriptionService.getPlans();
                setPlans(fetchedPlans);

                if (user) {
                    const sub = await subscriptionService.getSubscription(user.id);
                    if (sub) {
                        setCurrentPlanId(sub.plan_id);
                    }
                }
            } catch (error) {
                console.error("Failed to load pricing data", error);
                showNotification("Failed to load plans", 'error');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [user, showNotification]);

    const handleSubscribe = async (planId: string) => {
        if (!user) {
            window.location.href = '/signup';
            return;
        }

        if (currentPlanId === planId) {
            showNotification("You are already subscribed to this plan.", 'info');
            return;
        }

        const { success, error } = await subscriptionService.subscribe(user.id, planId);
        if (success) {
            showNotification("Subscription successful! Plan updated.", 'success');
            setCurrentPlanId(planId);
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } else {
            showNotification(`Subscription failed: ${error || 'Unknown error'}`, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="pt-24 pb-16 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Simple, Transparent Pricing</h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                            Choose the plan that fits your interview preparation needs. No hidden fees.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <LoadingSpinner size="lg" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {plans.map((plan) => {
                                const isCurrent = plan.id === currentPlanId;
                                const isPro = plan.name.toLowerCase().includes('pro') || plan.slug.includes('pro'); // Simple heuristic for styling
                                return (
                                    <div
                                        key={plan.id}
                                        className={`rounded-2xl border p-8 shadow-sm hover:shadow-md transition-all relative flex flex-col ${isPro
                                                ? 'bg-primary border-primary transform md:-translate-y-4 shadow-xl'
                                                : 'bg-white border-slate-200'
                                            } ${isCurrent ? 'ring-4 ring-green-400 ring-offset-2' : ''}`}
                                    >
                                        {isPro && (
                                            <div className="absolute top-0 right-0 bg-orange-400 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">POPULAR</div>
                                        )}
                                        <h3 className={`text-xl font-bold mb-2 ${isPro ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                                        <div className={`text-4xl font-bold mb-6 ${isPro ? 'text-white' : 'text-slate-900'}`}>
                                            ${(plan.price_monthly / 100).toFixed(0)}<span className={`text-lg font-normal ${isPro ? 'text-white/70' : 'text-slate-500'}`}>/mo</span>
                                        </div>
                                        <p className={`mb-8 ${isPro ? 'text-white/80' : 'text-slate-500'}`}>
                                            {plan.credits_monthly} credits per month.
                                        </p>
                                        <ul className="space-y-4 mb-8 flex-grow">
                                            <li className={`flex items-center gap-3 ${isPro ? 'text-white' : 'text-slate-600'}`}>
                                                <span className={isPro ? 'text-orange-400' : 'text-green-500'}>✓</span> {plan.credits_monthly} Interview Credits
                                            </li>
                                            {Array.isArray(plan.features) && plan.features.map((feature: any, idx: number) => (
                                                <li key={idx} className={`flex items-center gap-3 ${isPro ? 'text-white' : 'text-slate-600'}`}>
                                                    <span className={isPro ? 'text-orange-400' : 'text-green-500'}>✓</span> {String(feature)}
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            onClick={() => handleSubscribe(plan.id)}
                                            disabled={isCurrent}
                                            className={`block w-full py-3 px-6 font-bold text-center rounded-lg transition-colors mt-auto ${isCurrent
                                                    ? 'bg-green-500 text-white cursor-default'
                                                    : isPro
                                                        ? 'bg-white text-primary hover:bg-slate-50'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                        >
                                            {isCurrent ? 'Current Plan' : (user ? 'Subscribe Now' : 'Get Started')}
                                        </button>
                                    </div>
                                )
                            })}
                            {plans.length === 0 && (
                                <div className="col-span-3 text-center py-12 text-slate-500">
                                    No plans available at the moment. Please check back later.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}
