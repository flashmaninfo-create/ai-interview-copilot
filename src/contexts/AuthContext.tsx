/**
 * Enhanced Authentication Context
 *
 * Provides authentication state management with:
 * - Session persistence
 * - Role-based access control
 * - Error handling
 * - Loading states
 * - Token refresh
 */

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useMemo,
    type ReactNode,
} from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { authService, type UserProfile, type AuthServiceError } from '../lib/services/authService';

// ============================================================================
// Types
// ============================================================================

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
    status: AuthStatus;
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    error: AuthServiceError | null;
}

export interface AuthContextType extends AuthState {
    // State helpers
    isAuthenticated: boolean;
    isAdmin: boolean;
    isLoading: boolean;

    // Auth actions
    signIn: (email: string, password: string) => Promise<{ error: AuthServiceError | null }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthServiceError | null }>;
    signOut: () => Promise<void>;

    // Password management
    requestPasswordReset: (email: string) => Promise<{ error: AuthServiceError | null }>;
    updatePassword: (newPassword: string) => Promise<{ error: AuthServiceError | null }>;

    // Profile management
    refreshProfile: () => Promise<void>;
    updateProfile: (updates: { fullName?: string; avatarUrl?: string }) => Promise<{ error: AuthServiceError | null }>;

    // Session management
    refreshSession: () => Promise<void>;

    // Error handling
    clearError: () => void;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [state, setState] = useState<AuthState>({
        status: 'loading',
        user: null,
        session: null,
        profile: null,
        error: null,
    });

    // ========================================================================
    // Profile Fetching
    // ========================================================================

    const fetchAndSetProfile = useCallback(async (userId: string) => {
        const profile = await authService.fetchProfile(userId);
        setState((prev) => ({ ...prev, profile }));
    }, []);

    // ========================================================================
    // Session Initialization
    // ========================================================================

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                // Get initial session
                const { data: { session } } = await supabase.auth.getSession();

                if (!mounted) return;

                if (session?.user) {
                    console.log('AuthContext: Session found, fetching profile...');
                    // Crucial: Fetch profile BEFORE setting status to authenticated
                    // This prevents AdminRoute from seeing "authenticated" + "no profile" -> "not admin" -> Redirect
                    let profile: UserProfile | null = null;
                    try {
                        profile = await authService.fetchProfile(session.user.id);
                        console.log('AuthContext: Profile fetched', profile);
                    } catch (err) {
                        console.error('AuthContext: Profile fetch failed', err);
                    }

                    if (!mounted) return;

                    setState({
                        status: 'authenticated',
                        user: session.user,
                        session,
                        profile, // Profile is now set synchronously with status change
                        error: null,
                    });
                } else {
                    setState({
                        status: 'unauthenticated',
                        user: null,
                        session: null,
                        profile: null,
                        error: null,
                    });
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
                if (mounted) {
                    setState({
                        status: 'unauthenticated',
                        user: null,
                        session: null,
                        profile: null,
                        error: {
                            code: 'NETWORK_ERROR',
                            message: 'Failed to initialize authentication.',
                        },
                    });
                }
            }
        };

        initializeAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (!mounted) return;

                console.log('Auth event:', event);

                switch (event) {
                    case 'SIGNED_IN':
                    case 'TOKEN_REFRESHED':
                        if (session?.user) {
                            // Fetch profile with timeout to prevent hanging
                            let profile = null;
                            try {
                                const profilePromise = authService.fetchProfile(session.user.id);
                                const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 3000));
                                profile = await Promise.race([profilePromise, timeoutPromise]);
                            } catch (error) {
                                console.error('Profile fetch failed or timed out:', error);
                            }

                            if (mounted) {
                                setState((prev) => ({
                                    status: 'authenticated',
                                    user: session.user,
                                    session,
                                    // IMPORTANT: Preserve existing profile if fetch failed
                                    // This prevents admin panel from vanishing on token refresh
                                    profile: profile ?? prev.profile,
                                    error: null,
                                }));
                            }
                        }
                        break;

                    case 'SIGNED_OUT':
                        setState({
                            status: 'unauthenticated',
                            user: null,
                            session: null,
                            profile: null,
                            error: null,
                        });
                        break;

                    case 'PASSWORD_RECOVERY':
                        // User clicked password reset link
                        if (session?.user) {
                            setState((prev) => ({
                                ...prev,
                                user: session.user,
                                session,
                            }));
                        }
                        break;

                    case 'USER_UPDATED':
                        if (session?.user) {
                            fetchAndSetProfile(session.user.id);
                        }
                        break;
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [fetchAndSetProfile]);

    // ========================================================================
    // Auth Actions
    // ========================================================================

    const signIn = useCallback(async (email: string, password: string) => {
        setState((prev) => ({ ...prev, error: null }));

        const result = await authService.login({ email, password });

        if (result.error) {
            setState((prev) => ({ ...prev, error: result.error }));
            return { error: result.error };
        }

        // Auth state change listener will handle the state update
        return { error: null };
    }, []);

    const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
        setState((prev) => ({ ...prev, error: null }));

        const result = await authService.signup({ email, password, fullName });

        if (result.error) {
            setState((prev) => ({ ...prev, error: result.error }));
            return { error: result.error };
        }

        return { error: null };
    }, []);

    const signOut = useCallback(async () => {
        await authService.logout();
        // Auth state change listener will handle the state update
    }, []);

    // ========================================================================
    // Password Management
    // ========================================================================

    const requestPasswordReset = useCallback(async (email: string) => {
        const result = await authService.requestPasswordReset(email);
        return { error: result.error };
    }, []);

    const updatePassword = useCallback(async (newPassword: string) => {
        const result = await authService.updatePassword(newPassword);
        return { error: result.error };
    }, []);

    // ========================================================================
    // Profile Management
    // ========================================================================

    const refreshProfile = useCallback(async () => {
        if (state.user) {
            await fetchAndSetProfile(state.user.id);
        }
    }, [state.user, fetchAndSetProfile]);

    const updateProfile = useCallback(
        async (updates: { fullName?: string; avatarUrl?: string }) => {
            if (!state.user) {
                return {
                    error: {
                        code: 'SESSION_EXPIRED' as const,
                        message: 'You must be signed in to update your profile.',
                    },
                };
            }

            const result = await authService.updateProfile(state.user.id, updates);

            if (result.error) {
                return { error: result.error };
            }

            if (result.data) {
                setState((prev) => ({ ...prev, profile: result.data }));
            }

            return { error: null };
        },
        [state.user]
    );

    // ========================================================================
    // Session Management
    // ========================================================================

    const refreshSession = useCallback(async () => {
        const result = await authService.refreshSession();
        if (result.error) {
            console.error('Session refresh failed:', result.error);
            // If refresh fails, sign out
            if (result.error.code === 'SESSION_EXPIRED') {
                await signOut();
            }
        }
    }, [signOut]);

    // ========================================================================
    // Error Handling
    // ========================================================================

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    // ========================================================================
    // Computed Values
    // ========================================================================

    const contextValue = useMemo<AuthContextType>(() => ({
        // State
        ...state,

        // Computed helpers
        isAuthenticated: state.status === 'authenticated',
        isAdmin: state.profile?.role === 'admin',
        isLoading: state.status === 'loading',

        // Actions
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        refreshProfile,
        updateProfile,
        refreshSession,
        clearError,
    }), [
        state,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        updatePassword,
        refreshProfile,
        updateProfile,
        refreshSession,
        clearError,
    ]);

    // ========================================================================
    // Render
    // ========================================================================



    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook that requires authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(): AuthContextType & { isReady: boolean } {
    const auth = useAuth();
    return {
        ...auth,
        isReady: auth.status !== 'loading',
    };
}

/**
 * Hook that requires admin role
 */
export function useRequireAdmin(): AuthContextType & { isReady: boolean; hasAccess: boolean } {
    const auth = useAuth();
    return {
        ...auth,
        isReady: auth.status !== 'loading',
        hasAccess: auth.isAdmin,
    };
}

export default AuthContext;
