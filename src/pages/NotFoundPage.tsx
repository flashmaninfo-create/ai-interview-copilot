import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function NotFoundPage() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-slate-200">404</h1>
                <h2 className="text-2xl font-bold text-slate-900 mt-4 mb-2">Page Not Found</h2>
                <p className="text-slate-500 mb-8 max-w-md">
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <div className="flex gap-4 justify-center">
                    <Link
                        to={user ? '/dashboard' : '/'}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-all"
                    >
                        {user ? 'Go to Dashboard' : 'Go Home'}
                    </Link>
                </div>
            </div>
        </div>
    );
}
