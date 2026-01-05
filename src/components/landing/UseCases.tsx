

const cases = [
    { title: 'Technical Interviews', tags: ['Live Coding', 'System Design'] },
    { title: 'Behavioral Interviews', tags: ['STAR Method', 'Soft Skills'] },
    { title: 'Client Meetings', tags: ['Notes', 'Action Items'] },
    { title: 'Sales Calls', tags: ['Objection Handling', 'Pitching'] },
];

export function UseCases() {
    return (
        <section className="py-20 bg-surface/30">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Built for every scenario</h2>
                        <p className="text-slate-400">Versatile tools for any high-stakes conversation.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {cases.map((useCase, idx) => (
                        <div key={idx} className="group p-8 rounded-xl bg-surface border border-white/5 hover:border-primary/40 transition-all cursor-default">
                            <h3 className="text-2xl font-semibold text-slate-200 mb-4 group-hover:text-primary transition-colors">{useCase.title}</h3>
                            <div className="flex gap-2">
                                {useCase.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-full font-medium">{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
