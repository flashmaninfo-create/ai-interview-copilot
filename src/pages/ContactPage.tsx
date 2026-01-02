import { Footer } from '../components/landing/Footer';

export function ContactPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <div className="flex-grow py-16 px-4">
                <div className="container mx-auto max-w-4xl">

                    {/* Contact Form Card */}
                    <div className="bg-orange-50/50 rounded-3xl p-8 md:p-12">
                        <div className="text-center mb-10">
                            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Contact Us Now</h1>
                            <p className="text-slate-500">Do you have a question? Contact us now!</p>
                        </div>

                        <form className="max-w-2xl mx-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <input
                                        type="text"
                                        placeholder="First Name"
                                        className="w-full px-4 py-3 rounded-lg border-none bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Last Name"
                                        className="w-full px-4 py-3 rounded-lg border-none bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        className="w-full px-4 py-3 rounded-lg border-none bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        className="w-full px-4 py-3 rounded-lg border-none bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <textarea
                                    placeholder="Message"
                                    rows={4}
                                    className="w-full px-4 py-3 rounded-lg border-none bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                ></textarea>
                            </div>

                            <div>
                                <button
                                    type="button"
                                    className="px-8 py-3 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-opacity"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>

                        {/* Contact Info Footer */}
                        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-3xl mx-auto border-t border-slate-200/50 pt-8">
                            <div>
                                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Email</div>
                                <a href="mailto:team@ntro.io" className="text-blue-600 hover:underline text-sm">team@ntro.io</a>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">WhatsApp</div>
                                <a href="#" className="text-slate-500 hover:text-slate-700 text-sm">+1 (702) 695-8788</a>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Discord</div>
                                <a href="#" className="text-blue-600 hover:underline text-sm truncate block max-w-[200px] mx-auto">https://discord.gg/vYvcv8T4sZ</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
