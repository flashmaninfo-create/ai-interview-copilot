/**
 * Signup Page
 *
 * Handles new user registration with email/password.
 * Features polished UI with password strength indicator, career level selection,
 * and working Supabase authentication.
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthError } from '../../components/auth/AuthError';
import Icon from '../../components/ui/AppIcon';

export function SignupPage() {
    const { isAuthenticated, status, signUp, error, clearError } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        careerLevel: '',
        termsAccepted: false,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [passwordStrength, setPasswordStrength] = useState(0);

    useEffect(() => {
        if (status !== 'loading' && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, status, navigate]);

    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    const calculatePasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/[0-9]/)) strength++;
        if (password.match(/[^a-zA-Z0-9]/)) strength++;
        return strength;
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength === 0) return 'bg-gray-300';
        if (passwordStrength === 1) return 'bg-destructive';
        if (passwordStrength === 2) return 'bg-warning';
        if (passwordStrength === 3) return 'bg-secondary';
        return 'bg-success';
    };

    const getPasswordStrengthText = () => {
        if (passwordStrength === 0) return '';
        if (passwordStrength === 1) return 'Weak';
        if (passwordStrength === 2) return 'Fair';
        if (passwordStrength === 3) return 'Good';
        return 'Strong';
    };

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setValidationError(null);

        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-secondary">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-foreground"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-primary/95 to-secondary flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-20 left-10 w-96 h-96 bg-accent rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
                {/* Left side - Illustration */}
                <div className="hidden lg:flex flex-col justify-center space-y-6 text-primary-foreground">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm px-4 py-2 rounded-full">
                            <Icon name="RocketLaunchIcon" size={20} className="text-accent" />
                            <span className="text-sm font-medium">Start Your Career Transformation</span>
                        </div>
                        <h1 className="font-headline text-5xl font-bold leading-tight">
                            Join 50,000+ Successful Candidates
                        </h1>
                        <p className="text-xl text-primary-foreground/90">
                            Master your interviews with personalized AI coaching tailored to your career goals.
                        </p>
                    </div>

                    {/* Career Journey Illustration */}
                    <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-8 border border-primary-foreground/20">
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                                    <Icon name="AcademicCapIcon" size={24} className="text-accent" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold mb-1">Personalized Learning</div>
                                    <div className="text-xs text-primary-foreground/70">AI adapts to your career level</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                                    <Icon name="ChartBarIcon" size={24} className="text-accent" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold mb-1">Track Progress</div>
                                    <div className="text-xs text-primary-foreground/70">Monitor your improvement</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                                    <Icon name="TrophyIcon" size={24} className="text-accent" />
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold mb-1">Land Your Dream Job</div>
                                    <div className="text-xs text-primary-foreground/70">Join successful candidates</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Testimonial */}
                    <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 border border-primary-foreground/20">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-accent"></div>
                            <div>
                                <div className="text-sm font-semibold">Sarah Johnson</div>
                                <div className="text-xs text-primary-foreground/70">Software Engineer at Google</div>
                            </div>
                        </div>
                        <p className="text-sm text-primary-foreground/90 italic">
                            "Interview Copilot helped me land my dream job. The AI coaching was incredibly accurate and boosted my confidence."
                        </p>
                    </div>
                </div>

                {/* Right side - Sign Up Form */}
                <div className="bg-card rounded-2xl shadow-2xl p-8 lg:p-10">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary mb-4">
                            <svg
                                width="40"
                                height="40"
                                viewBox="0 0 32 32"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M16 4L8 8V14C8 19.55 11.84 24.74 16 26C20.16 24.74 24 19.55 24 14V8L16 4Z"
                                    fill="currentColor"
                                    className="text-primary-foreground"
                                />
                                <path
                                    d="M14 18L11 15L12.41 13.59L14 15.17L19.59 9.58L21 11L14 18Z"
                                    fill="currentColor"
                                    className="text-accent"
                                />
                            </svg>
                        </div>
                        <h2 className="font-headline text-3xl font-bold text-foreground text-center">
                            Create Your Account
                        </h2>
                        <p className="text-muted-foreground text-center mt-2">
                            Start your interview mastery journey today
                        </p>
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

                    {/* Social Sign Up Options */}
                    <div className="space-y-3 mb-6">
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-all duration-250"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            <span className="font-medium text-foreground">Sign up with Google</span>
                        </button>

                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-all duration-250"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                            </svg>
                            <span className="font-medium text-foreground">Sign up with GitHub</span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-border"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-card text-muted-foreground">or sign up with email</span>
                        </div>
                    </div>

                    {/* Sign Up Form */}
                    <form onSubmit={handleSignup} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Full Name
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon name="UserIcon" size={20} className="text-muted-foreground" />
                                </div>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    disabled={loading}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-250"
                                />
                            </div>
                        </div>

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
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="your.email@example.com"
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
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Create a strong password"
                                    disabled={loading}
                                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-250"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Icon name={showPassword ? 'EyeSlashIcon' : 'EyeIcon'} size={20} />
                                </button>
                            </div>
                            {formData.password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1 flex-1 rounded-full transition-colors ${
                                                    level <= passwordStrength ? getPasswordStrengthColor() : 'bg-gray-300'
                                                }`}
                                            ></div>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Password strength: <span className="font-medium">{getPasswordStrengthText()}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Icon name="LockClosedIcon" size={20} className="text-muted-foreground" />
                                </div>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    placeholder="Confirm your password"
                                    disabled={loading}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-250"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Career Level
                            </label>
                            <select
                                name="careerLevel"
                                value={formData.careerLevel}
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-250"
                            >
                                <option value="">Select your career level</option>
                                <option value="entry">Entry Level (0-2 years)</option>
                                <option value="mid">Mid Level (3-5 years)</option>
                                <option value="senior">Senior Level (6-10 years)</option>
                                <option value="lead">Lead/Principal (10+ years)</option>
                                <option value="executive">Executive/C-Suite</option>
                            </select>
                        </div>

                        <div className="flex items-start gap-2">
                            <input
                                type="checkbox"
                                name="termsAccepted"
                                checked={formData.termsAccepted}
                                onChange={handleChange}
                                required
                                disabled={loading}
                                className="w-4 h-4 mt-1 rounded border-border text-accent focus:ring-accent"
                            />
                            <label className="text-sm text-foreground">
                                I agree to the{' '}
                                <Link to="/terms" className="text-accent hover:underline">
                                    Terms of Service
                                </Link>
                                {' '}and{' '}
                                <Link to="/privacy" className="text-accent hover:underline">
                                    Privacy Policy
                                </Link>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !formData.termsAccepted}
                            className="w-full px-6 py-3 bg-accent text-accent-foreground rounded-lg font-semibold shadow-cta hover:bg-accent/90 transition-all duration-250 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Icon name="ArrowPathIcon" size={20} className="animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    Create Account
                                    <Icon name="RocketLaunchIcon" size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Sign In Link */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-accent hover:text-accent/90 font-semibold transition-colors"
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>

                    {/* Security Indicators */}
                    <div className="mt-6 pt-6 border-t border-border">
                        <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Icon name="ShieldCheckIcon" size={16} variant="solid" />
                                <span>SSL Secure</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon name="LockClosedIcon" size={16} variant="solid" />
                                <span>Privacy Protected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
