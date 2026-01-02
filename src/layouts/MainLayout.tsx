import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function MainLayout() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans">
            <header className="py-4 px-6 bg-primary border-b border-primary">
                <div className="container mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white tracking-tight">Smart AI Interview Assistant</h1>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-white/90 hover:text-white text-sm font-medium transition-colors">Features</a>
                        <a href="#how-it-works" className="text-white/90 hover:text-white text-sm font-medium transition-colors">How it Works</a>
                        <Link to="/pricing" className="text-white/90 hover:text-white text-sm font-medium transition-colors">Pricing</Link>
                        <Link to="/contact" className="text-white/90 hover:text-white text-sm font-medium transition-colors">Contact</Link>
                        <div className="flex items-center gap-4 ml-4">
                            {user ? (
                                <Link to="/dashboard" className="px-5 py-2 bg-white text-primary text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors">
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link to="/login" className="text-white hover:text-white/90 text-sm font-medium transition-colors">Login</Link>
                                    <Link to="/signup" className="px-5 py-2 bg-white text-primary text-sm font-bold rounded-lg hover:bg-slate-50 transition-colors">Get Started</Link>
                                </>
                            )}
                        </div>
                    </nav>
                    {/* Mobile Menu Placeholder - can be expanded later */}
                    <div className="md:hidden">
                        {user ? (
                            <Link to="/dashboard" className="text-white font-medium">Dashboard</Link>
                        ) : (
                            <Link to="/login" className="text-white font-medium">Login</Link>
                        )}
                    </div>
                </div>
            </header>
            <main>
                <Outlet />
            </main>
        </div>
    );
}
