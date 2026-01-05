/**
 * Admin Protected Route
 *
 * Route guard that requires:
 * 1. User to be authenticated
 * 2. User to have admin role
 *
 * Redirects to /admin (login) if not authenticated.
 * Redirects to /unauthorized if authenticated but not admin.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AdminProtectedRoute() {
    const { isAuthenticated, isAdmin, status } = useAuth();
    const location = useLocation();

    // Show loading while checking auth status
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-slate-400 text-sm">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Not authenticated -> redirect to admin login
    if (!isAuthenticated) {
        return <Navigate to="/admin" state={{ from: location }} replace />;
    }

    // Authenticated but not admin -> unauthorized
    if (!isAdmin) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Admin user -> render protected content
    return <Outlet />;
}

export default AdminProtectedRoute;
