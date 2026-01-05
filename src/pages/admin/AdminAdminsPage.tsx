/**
 * Admin Management Page
 *
 * Displays list of admin users with ability to revoke admin privileges.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../lib/services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldCheck, ShieldOff, ArrowLeft, AlertTriangle } from 'lucide-react';

interface AdminUser {
    id: string;
    email: string;
    full_name: string | null;
    role: 'user' | 'admin';
    created_at: string;
}

export function AdminAdminsPage() {
    const { user: currentUser } = useAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const users = await adminService.getUsers();
            // Filter only admins
            const adminUsers = users.filter(u => u.role === 'admin');
            setAdmins(adminUsers);
        } catch (err) {
            console.error('Failed to fetch admins:', err);
            setError('Failed to load admin users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleRevokeAdmin = async (userId: string) => {
        if (userId === currentUser?.id) {
            if (!window.confirm('Warning: You are about to remove your own admin privileges. You will lose access to the admin panel immediately. Are you sure?')) {
                return;
            }
        } else {
            if (!window.confirm('Are you sure you want to revoke admin privileges from this user?')) {
                return;
            }
        }

        try {
            setActionLoading(userId);
            await adminService.updateUserRole(userId, 'user');
            
            // Remove from list
            setAdmins(prev => prev.filter(a => a.id !== userId));
            
            // If revoking self, redirect
            if (userId === currentUser?.id) {
                window.location.href = '/admin';
            }
        } catch (err) {
            console.error('Failed to revoke admin:', err);
            alert('Failed to revoke admin privileges.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link 
                            to="/admin/dashboard" 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Admin Management</h1>
                    </div>
                    <p className="text-slate-400 ml-11">Manage administrator accounts</p>
                </div>
                <div className="bg-purple-500/10 text-purple-400 px-4 py-2 rounded-lg text-sm border border-purple-500/20">
                    <ShieldCheck className="w-4 h-4 inline mr-2" />
                    Total Admins: <strong>{admins.length}</strong>
                </div>
            </div>

            {/* Warning Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-amber-400 font-medium">Important</p>
                    <p className="text-amber-400/80 text-sm mt-1">
                        Revoking admin privileges is immediate and permanent. The user will lose access to all admin features.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
                    {error}
                </div>
            )}

            {/* Admins List */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Admin</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Status</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Admin Since</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {admins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                                                {admin.full_name ? admin.full_name[0].toUpperCase() : admin.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white flex items-center gap-2">
                                                    {admin.full_name || 'No Name'}
                                                    {admin.id === currentUser?.id && (
                                                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">You</span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-slate-400">{admin.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Active Admin
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {new Date(admin.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleRevokeAdmin(admin.id)}
                                            disabled={actionLoading === admin.id}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {actionLoading === admin.id ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                                    Revoking...
                                                </>
                                            ) : (
                                                <>
                                                    <ShieldOff className="w-4 h-4" />
                                                    Revoke Admin
                                                </>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {admins.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No admin users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminAdminsPage;
