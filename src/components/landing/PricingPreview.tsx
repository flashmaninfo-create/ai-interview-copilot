
import { Link } from 'react-router-dom';

export function PricingPreview() {
    return (
        <section id="pricing" className="py-20 bg-background">
            <div className="container mx-auto px-4 max-w-4xl text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Simple, Credit-Based Pricing</h2>
                <p className="text-xl text-slate-400 mb-12">Pay only for what you use. No monthly subscriptions required.</p>

                <div className="bg-surface border border-white/10 rounded-xl p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Most Popular</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Pay As You Go</h3>
                    <div className="text-6xl font-extrabold text-primary mb-6">
                        $5 <span className="text-xl font-medium text-slate-400">/ credit</span>
                    </div>
                    <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                        One credit equals one full authorized interview or meeting session, complete with real-time transcription and AI assistance.
                    </p>
                    <div className="flex justify-center">
                        <Link
                            to="/signup"
                            className="px-10 py-4 bg-primary text-white text-lg font-bold rounded-lg hover:bg-opacity-90 transition-all block w-full sm:w-auto"
                        >
                            Start for Free
                        </Link>
                    </div>
                    <p className="text-sm text-slate-500 mt-4">Get 3 free credits upon sign up.</p>
                </div>
            </div>
        </section>
    );
}
