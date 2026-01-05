/**
 * Admin Dashboard Page
 *
 * Main hub for admin portal at /admin/dashboard.
 * Shows overview stats and navigation to all admin sections.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../lib/services/adminService';
import {
    Users,
    ShieldCheck,
    Cpu,
    CreditCard,
    TrendingUp,
    Activity,
    DollarSign
} from 'lucide-react';

interface Stats {
    totalUsers: number;
    totalAdmins: number;
    activeProvider: string | null;
}

export function AdminDashboardPage() {
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        totalAdmins: 0,
        activeProvider: null
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStats() {
            try {
                // Fetch users
                const allProfiles = await adminService.getUsers();
                const admins = allProfiles.filter(u => u.role === 'admin');
                const regularUsers = allProfiles.filter(u => u.role !== 'admin');

                // Fetch active provider
                const providers = await adminService.getProviders();
                const active = providers.find(p => p.enabled);

                setStats({
                    totalUsers: regularUsers.length,
                    totalAdmins: admins.length,
                    activeProvider: active?.name || null
                });
            } catch (error) {
                console.error('Failed to load admin stats:', error);
            } finally {
                setLoading(false);
            }
        }

        loadStats();
    }, []);

    const statCards = [
        {
            label: 'Total Users',
            value: stats.totalUsers,
            icon: <Users className="w-6 h-6" />,
            color: 'bg-blue-500',
            bgColor: 'bg-blue-500/10',
            textColor: 'text-blue-400'
        },
        {
            label: 'Admins',
            value: stats.totalAdmins,
            icon: <ShieldCheck className="w-6 h-6" />,
            color: 'bg-purple-500',
            bgColor: 'bg-purple-500/10',
            textColor: 'text-purple-400'
        },
        {
            label: 'Active Provider',
            value: stats.activeProvider || 'None',
            icon: <Cpu className="w-6 h-6" />,
            color: 'bg-green-500',
            bgColor: 'bg-green-500/10',
            textColor: 'text-green-400'
        }
    ];

    const navCards = [
        {
            title: 'User Management',
            description: 'View and manage all registered users',
            icon: <Users className="w-8 h-8" />,
            path: '/admin/users',
            color: 'from-blue-500 to-blue-600'
        },
        {
            title: 'Admin Management',
            description: 'Manage administrator accounts',
            icon: <ShieldCheck className="w-8 h-8" />,
            path: '/admin/admins',
            color: 'from-purple-500 to-purple-600'
        },
        {
            title: 'AI Providers',
            description: 'Configure LLM providers and API keys',
            icon: <Cpu className="w-8 h-8" />,
            path: '/admin/providers',
            color: 'from-green-500 to-green-600'
        },
        {
            title: 'Payment Settings',
            description: 'Configure payment processor integration',
            icon: <CreditCard className="w-8 h-8" />,
            path: '/admin/payments',
            color: 'from-amber-500 to-orange-600'
        },
        {
            title: 'Credit Pricing',
            description: 'Set the cost per credit for users',
            icon: <DollarSign className="w-8 h-8" />,
            path: '/admin/credit',
            color: 'from-emerald-500 to-teal-600'
        }
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-slate-400 mt-1">Manage your platform settings and users</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-6"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">{stat.label}</p>
                                {loading ? (
                                    <div className="h-8 w-16 bg-slate-800 rounded animate-pulse mt-1"></div>
                                ) : (
                                    <p className="text-2xl font-bold text-white mt-1">
                                        {stat.value}
                                    </p>
                                )}
                            </div>
                            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                <div className={stat.textColor}>{stat.icon}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Status Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-xl">
                    <Activity className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                    <p className="text-white font-medium">System Status</p>
                    <p className="text-slate-400 text-sm">All services are running normally</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-green-400 text-sm font-medium">Operational</span>
                </div>
            </div>

            {/* Navigation Cards */}
            <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {navCards.map((card) => (
                        <Link
                            key={card.path}
                            to={card.path}
                            className="group bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-primary/5"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-4 rounded-xl bg-gradient-to-br ${card.color} text-white shadow-lg group-hover:scale-105 transition-transform`}>
                                    {card.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-slate-400 text-sm mt-1">
                                        {card.description}
                                    </p>
                                </div>
                                <div className="text-slate-600 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                    →
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboardPage;
