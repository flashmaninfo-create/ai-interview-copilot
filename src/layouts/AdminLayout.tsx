/**
 * Admin Layout
 *
 * Dedicated layout for admin portal with admin-specific sidebar.
 * Used for all /admin/* routes except login.
 */

import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    LayoutDashboard,
    MessageSquare,
    Users,
    ShieldCheck,
    Cpu,
    CreditCard,
    LogOut,
    Menu,
    X,
    DollarSign,
    Settings,
    UserCircle
} from 'lucide-react';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    superAdminOnly?: boolean;
}

// Super admin emails - only these accounts can access the Admins page
const SUPER_ADMIN_EMAILS = ['flashman.info@gmail.com', 'admin@interview-master.com'];

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { signOut, profile } = useAuth();

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    const navItems: NavItem[] = [
        {
            label: 'Dashboard',
            path: '/admin/dashboard',
            icon: <LayoutDashboard className="w-5 h-5" />
        },
        {
            label: 'Messages',
            path: '/admin/messages',
            icon: <MessageSquare className="w-5 h-5" />
        },
        {
            label: 'Users',
            path: '/admin/users',
            icon: <Users className="w-5 h-5" />
        },
        {
            label: 'Admins',
            path: '/admin/admins',
            icon: <ShieldCheck className="w-5 h-5" />,
            superAdminOnly: true
        },
        {
            label: 'AI Providers',
            path: '/admin/providers',
            icon: <Cpu className="w-5 h-5" />
        },
        {
            label: 'Payments',
            path: '/admin/payments',
            icon: <CreditCard className="w-5 h-5" />
        },
        {
            label: 'Plans',
            path: '/admin/plans',
            icon: <DollarSign className="w-5 h-5" />
        },
        {
            label: 'Settings',
            path: '/admin/settings',
            icon: <Settings className="w-5 h-5" />
        },
        {
            label: 'Profile',
            path: '/admin/profile',
            icon: <UserCircle className="w-5 h-5" />
        },
    ];

    const handleSignOut = async () => {
        await signOut();
        window.location.href = '/admin';
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-30
                transition-transform duration-300 ease-in-out
                lg:translate-x-0
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                        <Link to="/admin/dashboard" className="flex items-center gap-3">
                            <img src="/assets/images/XTROONE.svg" alt="Xtroone Admin" className="w-24" />
                            <span className="sr-only">Admin Control Panel</span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navItems
                            .filter(item => !item.superAdminOnly || (profile?.email && SUPER_ADMIN_EMAILS.includes(profile.email)))
                            .map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                                className={`
                                    w-full px-4 py-3 text-sm font-medium rounded-xl flex items-center gap-3 transition-colors duration-250
                                    ${isActive(item.path)
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                    }
                                `}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    {/* User info & sign out */}
                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                {profile?.fullName?.[0] || profile?.email?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">
                                    {profile?.fullName || 'Admin'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {profile?.email}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="w-full px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border flex items-center px-4 z-20">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <div className="ml-4 flex items-center gap-3">
                    <img src="/assets/images/XTROONE.svg" alt="Xtroone Admin" className="w-24" />
                </div>
            </header>

            {/* Main Content */}
            <main className="lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 bg-background text-foreground transition-colors duration-250">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;
