/**
 * Signup Page
 *
 * Handles new user registration with email/password.
 * Validates input and displays appropriate errors.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../components/auth/AuthError';

export function SignupPage() {
    const { isAuthenticated, status, signUp, error, clearError } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (status !== 'loading' && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, status, navigate]);

    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    const validateForm = (): boolean => {
        setValidationError(null);

        if (formData.password.length < 6) {
            setValidationError('Password must be at least 6 characters long.');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setValidationError('Passwords do not match.');
            return false;
        }

        return true;
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setSuccessMessage(null);

        const result = await signUp(formData.email, formData.password, formData.fullName);

        if (result.error) {
            setLoading(false);
            return;
        }

        navigate('/dashboard');
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setValidationError(null);
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
                    <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
                    <p className="text-muted-foreground">Join to get your AI Interview Copilot</p>
                </div>

                {successMessage && (
                    <div className="bg-success/10 text-success p-4 rounded-lg text-sm mb-4 border border-success/20">
                        <p className="font-medium">{successMessage}</p>
                        <p className="text-xs mt-1 opacity-80">
                            Check your spam folder if you don't see it.
                        </p>
                    </div>
                )}

                {validationError && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm mb-4 border border-destructive/20">
                        {validationError}
                    </div>
                )}

                <AuthError error={error} onDismiss={clearError} className="mb-4" />

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Full Name <span className="text-muted-foreground/70">(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            autoComplete="name"
                            className="w-full px-4 py-3 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-background text-foreground placeholder-muted-foreground"
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-background text-foreground placeholder-muted-foreground"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            required
                            autoComplete="new-password"
                            className="w-full px-4 py-3 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-background text-foreground placeholder-muted-foreground"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Must be at least 6 characters
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            autoComplete="new-password"
                            className="w-full px-4 py-3 rounded-lg border border-input focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-background text-foreground placeholder-muted-foreground"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
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
                                Creating Account...
                            </>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>

                <p className="mt-4 text-xs text-center text-muted-foreground">
                    By signing up, you agree to our{' '}
                    <a href="/terms" className="text-primary hover:underline">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                    </a>
                </p>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-semibold hover:underline">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
