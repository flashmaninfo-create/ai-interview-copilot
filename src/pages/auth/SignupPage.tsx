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

    // Redirect if already logged in
    useEffect(() => {
        if (status !== 'loading' && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, status, navigate]);

    // Clear errors when component unmounts
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
            // Error occurred - it will be shown via AuthError component
            setLoading(false);
            return;
        }

        // Success - navigate to dashboard
        navigate('/dashboard');
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setValidationError(null);
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
                    <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
                    <p className="text-slate-500">Join to get your AI Interview Copilot</p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm mb-4 border border-green-200">
                        <p className="font-medium">{successMessage}</p>
                        <p className="text-xs mt-1 opacity-80">
                            Check your spam folder if you don't see it.
                        </p>
                    </div>
                )}

                {/* Validation Error */}
                {validationError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">
                        {validationError}
                    </div>
                )}

                {/* Auth Error */}
                <AuthError error={error} onDismiss={clearError} className="mb-4" />

                <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Full Name <span className="text-slate-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            autoComplete="name"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-50 focus:bg-white"
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            name="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-50 focus:bg-white"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            required
                            autoComplete="new-password"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-50 focus:bg-white"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Must be at least 6 characters
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            required
                            autoComplete="new-password"
                            className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors bg-slate-50 focus:bg-white"
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChange={handleChange}
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
                                Creating Account...
                            </>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>

                <p className="mt-4 text-xs text-center text-slate-400">
                    By signing up, you agree to our{' '}
                    <a href="/terms" className="text-primary hover:underline">
                        Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                    </a>
                </p>

                <div className="mt-6 text-center text-sm text-slate-500">
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
