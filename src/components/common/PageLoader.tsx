import { LoadingSpinner } from './LoadingSpinner';

interface PageLoaderProps {
    message?: string;
}

export function PageLoader({ message = 'Loading...' }: PageLoaderProps) {
    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-slate-500 font-medium">{message}</p>
        </div>
    );
}
