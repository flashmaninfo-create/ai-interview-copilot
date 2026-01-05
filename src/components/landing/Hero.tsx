
import { Link } from 'react-router-dom';

export function Hero() {
    return (
        <section className="relative pt-32 pb-24 overflow-hidden">
            <div className="container mx-auto px-4 text-center relative z-10">
                <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">
                    AI Interview & <br /> Meeting Copilot
                </h1>
                <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
                    Real-time transcription, smart responses, and invisible assistance during your most critical conversations.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link
                        to="/signup"
                        className="px-8 py-4 bg-primary text-white rounded-lg font-medium hover:bg-opacity-90 transition-all w-full sm:w-auto text-base"
                    >
                        Get Started
                    </Link>
                    <Link
                        to="/install"
                        className="px-8 py-4 bg-surface text-slate-200 border border-white/10 rounded-lg font-medium hover:border-white/20 hover:bg-surface/80 transition-all w-full sm:w-auto text-base"
                    >
                        Install Extension
                    </Link>
                </div>
            </div>
        </section>
    );
}
