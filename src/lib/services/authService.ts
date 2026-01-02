/**
 * Authentication Service
 * 
 * Provides all authentication operations for the application.
 * Uses Supabase Auth as the backend.
 * 
 * Features:
 * - Email/password authentication
 * - Session management
 * - Password reset flow
 * - Token extraction for extension
 * - Role validation
 */

import { supabase } from '../supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface AuthResult<T = void> {
    data: T | null;
    error: AuthServiceError | null;
}

export interface AuthServiceError {
    code: AuthErrorCode;
    message: string;
    originalError?: AuthError;
}

export type AuthErrorCode =
    | 'INVALID_CREDENTIALS'
    | 'EMAIL_NOT_CONFIRMED'
    | 'USER_NOT_FOUND'
    | 'EMAIL_ALREADY_EXISTS'
    | 'WEAK_PASSWORD'
    | 'EXPIRED_TOKEN'
    | 'INVALID_TOKEN'
    | 'SESSION_EXPIRED'
    | 'NETWORK_ERROR'
    | 'RATE_LIMITED'
    | 'UNKNOWN_ERROR';

export interface SignupData {
    email: string;
    password: string;
    fullName?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface UserProfile {
    id: string;
    email: string;
    fullName: string | null;
    role: 'user' | 'admin';
    avatarUrl: string | null;
    createdAt: string;
}

export interface AuthSession {
    user: User;
    session: Session;
    profile: UserProfile | null;
}

// ============================================================================
// Error Mapping
// ============================================================================

function mapAuthError(error: AuthError): AuthServiceError {
    const message = error.message.toLowerCase();

    // Map Supabase error messages to our error codes
    if (message.includes('invalid login credentials') || message.includes('invalid password')) {
        return {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password. Please try again.',
            originalError: error,
        };
    }

    if (message.includes('email not confirmed')) {
        return {
            code: 'EMAIL_NOT_CONFIRMED',
            message: 'Please verify your email address before signing in.',
            originalError: error,
        };
    }

    if (message.includes('user not found')) {
        return {
            code: 'USER_NOT_FOUND',
            message: 'No account found with this email address.',
            originalError: error,
        };
    }

    if (message.includes('already registered') || message.includes('already exists')) {
        return {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists.',
            originalError: error,
        };
    }

    if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
        return {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 6 characters long.',
            originalError: error,
        };
    }

    if (message.includes('expired') || message.includes('token has expired')) {
        return {
            code: 'EXPIRED_TOKEN',
            message: 'This link has expired. Please request a new one.',
            originalError: error,
        };
    }

    if (message.includes('invalid') && message.includes('token')) {
        return {
            code: 'INVALID_TOKEN',
            message: 'Invalid or malformed token.',
            originalError: error,
        };
    }

    if (message.includes('refresh_token') || message.includes('session')) {
        return {
            code: 'SESSION_EXPIRED',
            message: 'Your session has expired. Please sign in again.',
            originalError: error,
        };
    }

    if (message.includes('rate limit') || message.includes('too many requests')) {
        return {
            code: 'RATE_LIMITED',
            message: 'Too many attempts. Please wait a moment and try again.',
            originalError: error,
        };
    }

    if (message.includes('network') || message.includes('fetch')) {
        return {
            code: 'NETWORK_ERROR',
            message: 'Network error. Please check your connection.',
            originalError: error,
        };
    }

    return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred.',
        originalError: error,
    };
}

// ============================================================================
// Auth Service
// ============================================================================

export const authService = {
    // ========================================================================
    // Signup
    // ========================================================================

    /**
     * Create a new user account
     * Profile is created automatically via database trigger
     */
    async signup(data: SignupData): Promise<AuthResult<AuthSession>> {
        try {
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName || '',
                    },
                },
            });

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            if (!authData.user || !authData.session) {
                // Email confirmation required
                return {
                    data: null,
                    error: {
                        code: 'EMAIL_NOT_CONFIRMED',
                        message: 'Please check your email to confirm your account.',
                    },
                };
            }

            // Profile is fetched by AuthContext listener
            // const profile = await this.fetchProfile(authData.user.id);

            return {
                data: {
                    user: authData.user,
                    session: authData.session,
                    profile: null, // Profile fetched via listener
                },
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to connect to server.',
                },
            };
        }
    },

    // ========================================================================
    // Login
    // ========================================================================

    /**
     * Sign in with email and password
     */
    async login(data: LoginData): Promise<AuthResult<AuthSession>> {
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            if (!authData.user || !authData.session) {
                return {
                    data: null,
                    error: {
                        code: 'UNKNOWN_ERROR',
                        message: 'Failed to establish session.',
                    },
                };
            }

            // Profile is fetched by AuthContext listener
            // const profile = await this.fetchProfile(authData.user.id);

            return {
                data: {
                    user: authData.user,
                    session: authData.session,
                    profile: null, // Profile fetched via listener
                },
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to connect to server.',
                },
            };
        }
    },

    // ========================================================================
    // Logout
    // ========================================================================

    /**
     * Sign out the current user
     */
    async logout(): Promise<AuthResult> {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            return { data: null, error: null };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to sign out.',
                },
            };
        }
    },

    // ========================================================================
    // Session Management
    // ========================================================================

    /**
     * Get the current session
     */
    async getSession(): Promise<AuthResult<Session>> {
        try {
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            return { data: data.session, error: null };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to get session.',
                },
            };
        }
    },

    /**
     * Refresh the current session
     */
    async refreshSession(): Promise<AuthResult<Session>> {
        try {
            const { data, error } = await supabase.auth.refreshSession();

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            return { data: data.session, error: null };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to refresh session.',
                },
            };
        }
    },

    /**
     * Set session from tokens (for extension)
     */
    async setSession(accessToken: string, refreshToken: string): Promise<AuthResult<Session>> {
        try {
            const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            return { data: data.session, error: null };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'INVALID_TOKEN',
                    message: 'Failed to set session.',
                },
            };
        }
    },

    // ========================================================================
    // Password Reset
    // ========================================================================

    /**
     * Request a password reset email
     */
    async requestPasswordReset(email: string): Promise<AuthResult> {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            return { data: null, error: null };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to send reset email.',
                },
            };
        }
    },

    /**
     * Update password (requires active session or reset token)
     */
    async updatePassword(newPassword: string): Promise<AuthResult> {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });

            if (error) {
                return { data: null, error: mapAuthError(error) };
            }

            return { data: null, error: null };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to update password.',
                },
            };
        }
    },

    // ========================================================================
    // Profile Management
    // ========================================================================

    /**
     * Fetch user profile from database
     */
    async fetchProfile(userId: string): Promise<UserProfile | null> {
        try {
            console.log('fetchProfile: Fetching for', userId);
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, role, avatar_url, created_at')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('fetchProfile: DB Error:', error);
            }
            if (data) {
                console.log('fetchProfile: Success:', data);
            }

            if (error || !data) {
                console.error('Failed to fetch profile:', error);
                return null;
            }

            return {
                id: data.id,
                email: data.email,
                fullName: data.full_name,
                role: data.role as 'user' | 'admin',
                avatarUrl: data.avatar_url,
                createdAt: data.created_at,
            };
        } catch (err) {
            console.error('Profile fetch error:', err);
            return null;
        }
    },

    /**
     * Update user profile
     */
    async updateProfile(
        userId: string,
        updates: { fullName?: string; avatarUrl?: string }
    ): Promise<AuthResult<UserProfile>> {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    full_name: updates.fullName,
                    avatar_url: updates.avatarUrl,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', userId)
                .select('id, email, full_name, role, avatar_url, created_at')
                .single();

            if (error) {
                return {
                    data: null,
                    error: {
                        code: 'UNKNOWN_ERROR',
                        message: error.message,
                    },
                };
            }

            return {
                data: {
                    id: data.id,
                    email: data.email,
                    fullName: data.full_name,
                    role: data.role as 'user' | 'admin',
                    avatarUrl: data.avatar_url,
                    createdAt: data.created_at,
                },
                error: null,
            };
        } catch (err) {
            return {
                data: null,
                error: {
                    code: 'NETWORK_ERROR',
                    message: 'Failed to update profile.',
                },
            };
        }
    },

    // ========================================================================
    // Role Validation (Server-Side)
    // ========================================================================

    /**
     * Validate user role via server-side check
     * More secure than reading from profile directly
     */
    async validateRole(targetRole: 'user' | 'admin'): Promise<boolean> {
        try {
            const { data, error } = await supabase.rpc('validate_user_role', {
                p_required_role: targetRole,
            });

            if (error) {
                console.error('Role validation error:', error);
                return false;
            }

            return data === true;
        } catch (err) {
            console.error('Role validation failed:', err);
            return false;
        }
    },

    /**
     * Check if current user is admin (server-validated)
     */
    async isAdmin(): Promise<boolean> {
        return this.validateRole('admin');
    },

    // ========================================================================
    // Token Utilities (For Extension)
    // ========================================================================

    /**
     * Get current access token for API calls
     */
    async getAccessToken(): Promise<string | null> {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || null;
    },

    /**
     * Get tokens for extension sharing
     */
    async getTokensForExtension(): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
    } | null> {
        const { data } = await supabase.auth.getSession();

        if (!data.session) {
            return null;
        }

        return {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at || 0,
        };
    },

    /**
     * Subscribe to auth state changes
     */
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },
};

export default authService;
