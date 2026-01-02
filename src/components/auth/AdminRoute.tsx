/**
 * Admin Route Component
 *
 * Wraps routes that require admin role.
 * Redirects to dashboard if user is not admin.
 * Shows appropriate error states.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AdminRoute() {
    const { status, isAuthenticated, isAdmin, error, profile } = useAuth();
    const location = useLocation();

    console.log('AdminRoute: Checking access', {
        status,
        isAuthenticated,
        isAdmin,
        profile,
        path: location.pathname
    });

    // Still loading - show loading state
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-500">Verifying permissions...</p>
                </div>
            </div>
        );
    }

    // Session expired - redirect to login
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

    // Authenticated but not admin - redirect to unauthorized or dashboard
    if (!isAdmin) {
        return (
            <Navigate
                to="/unauthorized"
                state={{
                    from: location,
                    requiredRole: 'admin'
                }}
                replace
            />
        );
    }

    // Admin authenticated - render children
    return <Outlet />;
}

export default AdminRoute;
