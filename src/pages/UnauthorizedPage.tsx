/**
 * Unauthorized Page
 *
 * Displayed when a user tries to access a resource they don't have permission for.
 */

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
    from?: { pathname: string };
    requiredRole?: string;
}

export function UnauthorizedPage() {
    const { isAuthenticated, profile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as LocationState | null;

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-surface rounded-2xl shadow-lg border border-white/10 p-8 text-center">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <svg
                        className="w-8 h-8 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-2">
                    Access Denied
                </h1>

                {/* Message */}
                <p className="text-slate-400 mb-6">
                    {state?.requiredRole === 'admin'
                        ? "You don't have administrator privileges to access this page."
                        : "You don't have permission to access this resource."}
                </p>

                {/* User Info */}
                {isAuthenticated && (
                    <div className="bg-background/50 rounded-lg p-4 mb-6 border border-white/5">
                        <p className="text-sm text-slate-500 mb-1">Signed in as:</p>
                        {profile ? (
                            <>
                                <p className="font-medium text-white">{profile.email}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Role: <span className="capitalize">{profile.role}</span>
                                </p>
                            </>
                        ) : (
                            <p className="text-red-400 text-sm font-medium">
                                Error: Unable to load user profile.
                            </p>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        to="/dashboard"
                        className="block w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Go to Dashboard
                    </Link>

                    {isAuthenticated && (
                        <button
                            onClick={handleSignOut}
                            className="block w-full py-3 px-4 border border-white/10 text-slate-300 font-medium rounded-lg hover:bg-surface/80 transition-all"
                        >
                            Sign in with different account
                        </button>
                    )}

                    <Link
                        to="/"
                        className="block text-sm text-slate-500 hover:text-primary transition-colors"
                    >
                        Return to Home
                    </Link>
                </div>

                {/* Help Text */}
                <p className="mt-6 text-xs text-slate-500">
                    If you believe this is an error, please contact your administrator.
                </p>
            </div>
        </div>
    );
}

export default UnauthorizedPage;
