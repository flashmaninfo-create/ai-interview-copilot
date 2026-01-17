/**
 * Admin Login Page
 *
 * Dedicated login page for admin portal at /admin route.
 * Validates admin role after authentication.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../components/auth/AuthError';
import Icon from '../../components/ui/AppIcon';

export function AdminLoginPage() {
    const { isAuthenticated, isAdmin, status, signIn, error, clearError } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
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
                            <div className="flex items-center justify-center mb-4">
                                <Link to="/">
                                    <img src="/assets/images/XTROONE.svg" alt="Xtroone" className="w-48 hover:opacity-90 transition-opacity" />
                                </Link>
                            </div>
                        </div>
                        
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-bold shadow-lg">
                            <Icon name="ShieldCheckIcon" size={16} variant="solid" />
                            ADMIN PORTAL
                        </div>
                        
                        <h2 className="font-headline text-4xl font-bold text-primary">
                            System Administration
                        </h2>
                        
                        <p className="text-lg text-muted-foreground max-w-md">
                            Secure access point for system configuration, user management, and monitoring.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 pt-8">
                            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="Cog6ToothIcon" size={20} className="text-accent" variant="solid" />
                                    <span className="text-sm font-semibold text-foreground">Management</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Full system control</p>
                            </div>
                            
                            <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon name="ChartBarIcon" size={20} className="text-success" variant="solid" />
                                    <span className="text-sm font-semibold text-foreground">Analytics</span>
                                </div>
                                <p className="text-xs text-muted-foreground">Real-time insights</p>
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
                            Admin Sign In
                        </h1>
                        <p className="text-muted-foreground">
                            Enter your administrator credentials to continue
                        </p>
                    </div>

                    {/* Admin access error */}
                    {adminError && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm mb-4 border border-destructive/20 flex items-start gap-3">
                            <Icon name="ExclamationTriangleIcon" size={20} className="flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium">Access Denied</p>
                                <p className="text-destructive/80 mt-1">{adminError}</p>
                            </div>
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
                                    placeholder="admin@example.com"
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
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-250"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors outline-none"
                                >
                                    <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
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
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <Icon name="ShieldCheckIcon" size={20} />
                                        <span>Sign In as Admin</span>
                                    </div>
                                    <Icon name="ArrowRightIcon" size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                            <Icon name="LockClosedIcon" size={14} />
                            <span>This area is restricted to authorized personnel only.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminLoginPage;
