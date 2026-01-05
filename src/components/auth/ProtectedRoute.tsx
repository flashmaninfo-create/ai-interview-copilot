/**
 * Protected Route Component
 *
 * Wraps routes that require authentication.
 * Redirects to login if user is not authenticated.
 * Shows appropriate error states.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function ProtectedRoute() {
    const { status, isAuthenticated, isAdmin, error } = useAuth();
    const location = useLocation();

    // Still loading - show loading state
    // Still loading - show nothing (or minimal) to avoid spinner
    if (status === 'loading') {
        return null;
    }

    // Session expired - show message and redirect
    if (error?.code === 'SESSION_EXPIRED') {
        return (
            <Navigate
                to="/login"
                state={{
                    from: location,
                    message: 'Your session has expired. Please sign in again.',
                    type: 'warning'
                }}
                replace
            />
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                state={{
                    from: location,
                    message: 'Please sign in to access this page.',
                    type: 'info'
                }}
                replace
            />
        );
    }

    // Admin users should use /admin portal, not user dashboard
    if (isAdmin) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    // Authenticated - render children
    return <Outlet />;
}

export default ProtectedRoute;
