

export function SocialProof() {
    return (
        <section className="py-16 bg-slate-900 text-white">
            <div className="container mx-auto px-4 text-center">
                <p className="text-slate-400 font-medium tracking-wide uppercase text-sm mb-10">Trusted by professionals at top companies</p>

                <div className="flex flex-wrap justify-center gap-12 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                    {/* Placeholder Logos */}
                    <span className="text-2xl font-bold">ACME Corp</span>
                    <span className="text-2xl font-bold">GlobalTech</span>
                    <span className="text-2xl font-bold">NebulaStream</span>
                    <span className="text-2xl font-bold">OnyxSystems</span>
                </div>

                <div className="mt-16 grid md:grid-cols-3 gap-8 text-left">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <p className="text-slate-300 mb-4">"This tool completely changed how I approach system design interviews. The real-time hints are a lifesaver."</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
                            <div>
                                <div className="font-semibold text-white">Alex M.</div>
                                <div className="text-xs text-slate-400">Senior Engineer</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <p className="text-slate-300 mb-4">"I use it for efficient meeting notes and quick objection handling during sales calls. Highly recommended."</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
                            <div>
                                <div className="font-semibold text-white">Sarah K.</div>
                                <div className="text-xs text-slate-400">Account Executive</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <p className="text-slate-300 mb-4">"The invisible overlay is magic. It feels like having a senior mentor sitting right next to you."</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-600 rounded-full"></div>
                            <div>
                                <div className="font-semibold text-white">James R.</div>
                                <div className="text-xs text-slate-400">Product Manager</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
