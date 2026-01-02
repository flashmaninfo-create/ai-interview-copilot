/**
 * Login Page
 *
 * Handles user authentication with email/password.
 * Displays errors and handles redirects after login.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../components/auth/AuthError';

interface LocationState {
    from?: { pathname: string };
    message?: string;
    type?: 'info' | 'warning' | 'success';
}

export function LoginPage() {
    const { isAuthenticated, status, signIn, error, clearError } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState | null;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [redirectMessage, setRedirectMessage] = useState<{
        message: string;
        type: 'info' | 'warning' | 'success';
    } | null>(null);

    // Handle redirect message from protected routes
    useEffect(() => {
        if (state?.message) {
            setRedirectMessage({
                message: state.message,
                type: state.type || 'info',
            });
            // Clear the state to prevent showing message on refresh
            window.history.replaceState({}, document.title);
        }
    }, [state]);

    // Redirect if already logged in
    useEffect(() => {
        if (status !== 'loading' && isAuthenticated) {
            const destination = state?.from?.pathname || '/dashboard';
            navigate(destination, { replace: true });
        }
    }, [isAuthenticated, status, navigate, state]);

    // Clear auth errors when component unmounts
    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setRedirectMessage(null);

        const result = await signIn(email, password);

        if (!result.error) {
            // Successful login - navigation handled by useEffect
        }

        setLoading(false);
    };

    // Still checking auth status
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                    <p className="text-slate-500">Sign in to access your dashboard</p>
                </div>

                {/* Redirect Message */}
                {redirectMessage && (
                    <div
                        className={`p-3 rounded-lg text-sm mb-4 border ${redirectMessage.type === 'warning'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : redirectMessage.type === 'success'
                                    ? 'bg-green-50 text-green-700 border-green-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                    >
                        {redirectMessage.message}
                    </div>
                )}

                {/* Auth Error */}
                <AuthError
                    error={error}
                    onDismiss={clearError}
                    className="mb-4"
                />

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-50 focus:bg-white"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
                            autoComplete="current-password"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-50 focus:bg-white"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Signing In...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <Link to="/signup" className="text-primary font-semibold hover:underline">
                        Sign Up
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
