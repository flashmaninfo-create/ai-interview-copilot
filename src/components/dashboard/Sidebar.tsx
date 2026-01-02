import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';


import {
    LayoutDashboard,
    Mic,
    History,
    CreditCard,
    Settings,
    Shield,
    LogOut,
    X
} from 'lucide-react';

const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Console', path: '/dashboard/console', icon: <Mic className="w-5 h-5" /> },
    { name: 'Interviews', path: '/dashboard/history', icon: <History className="w-5 h-5" /> },
    { name: 'Credits', path: '/dashboard/credits', icon: <CreditCard className="w-5 h-5" /> },
    { name: 'Settings', path: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
    { name: 'Admin', path: '/admin', icon: <Shield className="w-5 h-5" />, adminOnly: true },
];


interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
    const location = useLocation();
    const { user, signOut, isAdmin } = useAuth(); // Use standard isAdmin check

    // Remove ad-hoc isAdmin check
    // const isAdmin = user?.user_metadata?.role === 'admin' || user?.email?.includes('admin');

    const handleNavClick = () => {
        if (onClose) onClose();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && onClose && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed left-0 top-0 h-full w-64 bg-primary text-white flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-primary/20 flex items-center justify-between">
                    <Link to="/" className="text-lg font-bold text-white tracking-tight">Smart AI Interview</Link>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="lg:hidden text-white/70 hover:text-white transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        if (item.adminOnly && !isAdmin) return null;

                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={handleNavClick}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                    ? 'bg-white text-primary font-medium'
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <span>{item.icon}</span>
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-primary/20">
                    <div className="text-sm text-white/70 mb-2 truncate px-2">{user?.email}</div>
                    <button
                        onClick={signOut}
                        className="w-full px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-left flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>

            </aside>
        </>
    );
}
