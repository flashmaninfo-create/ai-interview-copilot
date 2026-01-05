

const steps = [
    {
        step: '01',
        title: 'Sign Up',
        description: 'Create an account and set up your profile preferences in seconds.'
    },
    {
        step: '02',
        title: 'Launch Dashboard',
        description: 'Start a new session from the web console to initialize the copilot.'
    },
    {
        step: '03',
        title: 'Get Real-time Aid',
        description: 'The extension overlays helpful context and answers directly on your screen.'
    }
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-20 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
                    <p className="text-slate-400">Seamless integration into your workflow in three simple steps.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((item, index) => (
                        <div key={index} className="relative p-8 rounded-xl bg-surface border border-white/5 hover:border-white/10 transition-colors">
                            <div className="text-6xl font-bold text-slate-700 mb-6 select-none absolute top-4 right-6 opacity-30">
                                {item.step}
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 relative z-10">{item.title}</h3>
                            <p className="text-slate-400 relative z-10">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
