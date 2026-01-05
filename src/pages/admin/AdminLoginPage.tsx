/**
 * Admin Login Page
 *
 * Dedicated login page for admin portal at /admin route.
 * Validates admin role after authentication.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../components/auth/AuthError';
import { Shield } from 'lucide-react';

export function AdminLoginPage() {
    const { isAuthenticated, isAdmin, status, signIn, error, clearError } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [adminError, setAdminError] = useState<string | null>(null);

    // Redirect if already authenticated as admin
    useEffect(() => {
        if (status !== 'loading' && isAuthenticated) {
            if (isAdmin) {
                navigate('/admin/dashboard', { replace: true });
            } else {
                // User is authenticated but not admin
                setAdminError('Access denied. Admin privileges required.');
            }
        }
    }, [isAuthenticated, isAdmin, status, navigate]);

    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setAdminError(null);

        const result = await signIn(email, password);

        if (!result.error) {
            // Auth state change will trigger useEffect above
            // which will check for admin role
        }

        setLoading(false);
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 pointer-events-none" />
            
            <div className="relative bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md">
                {/* Admin Badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-primary px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-primary/20">
                        <Shield className="w-4 h-4 text-white" />
                        <span className="text-sm font-bold text-white">ADMIN PORTAL</span>
                    </div>
                </div>

                <div className="text-center mb-8 mt-4">
                    <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                    <p className="text-slate-400 mt-1">Sign in with administrator credentials</p>
                </div>

                {/* Admin access error */}
                {adminError && (
                    <div className="bg-red-500/10 text-red-400 p-4 rounded-lg text-sm mb-4 border border-red-500/20 flex items-start gap-3">
                        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium">Access Denied</p>
                            <p className="text-red-400/80 mt-1">{adminError}</p>
                        </div>
                    </div>
                )}

                {/* Auth error */}
                <AuthError
                    error={error}
                    onDismiss={clearError}
                    className="mb-4"
                />

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-800 text-white placeholder-slate-500"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            className="w-full px-4 py-3 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-800 text-white placeholder-slate-500"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Authenticating...
                            </>
                        ) : (
                            <>
                                <Shield className="w-5 h-5" />
                                Sign In as Admin
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a href="/" className="text-sm text-slate-500 hover:text-slate-400 transition-colors">
                        ← Back to main site
                    </a>
                </div>
            </div>
        </div>
    );
}

export default AdminLoginPage;
