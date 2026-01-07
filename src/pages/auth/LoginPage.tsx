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
    const { isAuthenticated, isAdmin, status, signIn, signOut, error, clearError } = useAuth();
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

    useEffect(() => {
        if (state?.message) {
            setRedirectMessage({
                message: state.message,
                type: state.type || 'info',
            });
            window.history.replaceState({}, document.title);
        }
    }, [state]);

    useEffect(() => {
        if (status !== 'loading' && isAuthenticated) {
            // If user is admin, sign them out and redirect to admin login
            if (isAdmin) {
                signOut();
                navigate('/admin', { 
                    replace: true,
                    state: { 
                        message: 'Admins must use the admin portal to sign in.',
                        type: 'warning'
                    }
                });
                return;
            }
            const destination = state?.from?.pathname || '/dashboard';
            navigate(destination, { replace: true });
        }
    }, [isAuthenticated, isAdmin, status, navigate, state, signOut]);

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

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="bg-card p-8 rounded-2xl shadow-lg border border-border w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
                    <p className="text-muted-foreground">Sign in to access your dashboard</p>
                </div>

                {redirectMessage && (
                    <div
                        className={`p-3 rounded-lg text-sm mb-4 border ${redirectMessage.type === 'warning'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : redirectMessage.type === 'success'
                                    ? 'bg-success/10 text-success border-success/20'
                                    : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                    >
                        {redirectMessage.message}
                    </div>
                )}

                <AuthError
                    error={error}
                    onDismiss={clearError}
                    className="mb-4"
                />

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-background text-foreground placeholder-muted-foreground"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-muted-foreground">
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
                            className="w-full px-4 py-3 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-background text-foreground placeholder-muted-foreground"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent"></div>
                                Signing In...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
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
