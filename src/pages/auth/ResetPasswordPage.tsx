/**
 * Reset Password Page
 *
 * Allows users to set a new password after clicking reset link.
 * This page is accessed via the reset link sent to email.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../components/auth/AuthError';

export function ResetPasswordPage() {
    const { updatePassword, error, clearError, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // If user lands here without being authenticated (no valid reset token), redirect
    useEffect(() => {
        // Give a moment for the session to be established from the URL token
        const timer = setTimeout(() => {
            // The user should have a session if they clicked the reset link
            // If not authenticated, redirect to forgot password
        }, 1000);

        return () => clearTimeout(timer);
    }, [isAuthenticated]);

    // Clear errors on unmount
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        clearError();

        const result = await updatePassword(formData.password);

        if (!result.error) {
            setSuccess(true);
            // Redirect to dashboard after short delay
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        }

        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setValidationError(null);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 w-full max-w-md text-center">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <svg
                            className="w-8 h-8 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Password Updated</h1>
                    <p className="text-slate-600 mb-6">
                        Your password has been successfully changed.
                    </p>
                    <p className="text-sm text-slate-500">
                        Redirecting to dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
                    <p className="text-slate-500">Choose a strong password for your account</p>
                </div>

                {/* Validation Error */}
                {validationError && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4 border border-red-200">
                        {validationError}
                    </div>
                )}

                {/* Auth Error */}
                <AuthError error={error} onDismiss={clearError} className="mb-4" />

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            New Password
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
                            Confirm New Password
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
                                Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500">
                    <Link to="/login" className="text-primary font-semibold hover:underline">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
