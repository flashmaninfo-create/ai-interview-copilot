/**
 * Login Page
 *
 * Handles user authentication with email/password.
 * Features polished split-screen UI with working Supabase authentication.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../components/auth/AuthError';
import Icon from '../../components/ui/AppIcon';

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
    const [rememberMe, setRememberMe] = useState(false);
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-secondary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-secondary flex items-center justify-center p-4">
            <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 bg-card rounded-2xl shadow-2xl overflow-hidden">
                {/* Left Side - Illustration & Branding */}
                <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-accent/10 to-secondary/10 p-12 relative overflow-hidden">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-accent/20 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="w-24 h-24 bg-primary rounded-2xl flex items-center justify-center shadow-xl">
                                <Icon name="UserCircleIcon" size={48} className="text-primary-foreground" variant="solid" />
                            </div>
                        </div>
                        
                        <h2 className="font-headline text-4xl font-bold text-primary">
                            Welcome Back!
                        </h2>
                        
                        <p className="text-lg text-muted-foreground max-w-md">
                            Continue your journey to interview success with AI-powered coaching and real-time assistance.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 pt-8">
                            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="SparklesIcon" size={20} className="text-accent" variant="solid" />
                                    <span className="text-sm font-semibold text-foreground">AI Coaching</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Personalized interview prep</p>
                            </div>
                            
                            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="ShieldCheckIcon" size={20} className="text-success" variant="solid" />
                                    <span className="text-sm font-semibold text-foreground">Secure</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Your data is protected</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <div className="mb-8">
                        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors duration-250">
                            <Icon name="ArrowLeftIcon" size={20} />
                            <span className="text-sm">Back to Home</span>
                        </Link>
                    </div>

                    <div className="mb-8">
                        <h1 className="font-headline text-3xl font-bold text-foreground mb-2">
                            Sign In to Your Account
                        </h1>
                        <p className="text-muted-foreground">
                            Access your personalized interview coaching dashboard
                        </p>
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

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon name="EnvelopeIcon" size={20} className="text-muted-foreground" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-250"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon name="LockClosedIcon" size={20} className="text-muted-foreground" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-250"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                                />
                                <span className="text-sm text-foreground">Remember me</span>
                            </label>
                            
                            <Link to="/forgot-password" className="text-sm text-accent hover:text-accent/80 transition-colors duration-250">
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-accent text-accent-foreground rounded-lg font-semibold shadow-cta hover:bg-accent/90 transition-all duration-250 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
                                    Signing In...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <Icon name="ArrowRightIcon" size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-card text-muted-foreground">Or continue with</span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-4">
                            <button className="flex items-center justify-center gap-2 py-3 px-4 border border-border rounded-lg hover:bg-muted transition-all duration-250">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                <span className="text-sm font-medium text-foreground">Google</span>
                            </button>
                            
                            <button className="flex items-center justify-center gap-2 py-3 px-4 border border-border rounded-lg hover:bg-muted transition-all duration-250">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                                </svg>
                                <span className="text-sm font-medium text-foreground">GitHub</span>
                            </button>
                        </div>
                    </div>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <Link to="/signup" className="text-accent font-semibold hover:text-accent/80 transition-colors duration-250">
                                Sign up for free
                            </Link>
                        </p>
                    </div>

                    <div className="mt-6 bg-accent/5 rounded-lg p-4 border border-accent/20">
                        <div className="flex items-start gap-3">
                            <Icon name="InformationCircleIcon" size={20} className="text-accent flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-foreground">
                                <strong>7-day free trial</strong> with full access to all premium features. No credit card required.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
