import { useState, useEffect } from 'react';
import { adminService } from '../../lib/services/adminService';
import { useAuth } from '../../contexts/AuthContext';

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: 'user' | 'admin';
    created_at: string;
}

export function AdminUsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await adminService.getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError('Failed to load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
        if (userId === currentUser?.id) {
            if (!window.confirm('Warning: You are about to remove your own admin privileges. You will lose access to this page immediately. Are you sure?')) {
                return;
            }
        }

        try {
            setActionLoading(userId);
            const newRole = currentRole === 'admin' ? 'user' : 'admin';
            await adminService.updateUserRole(userId, newRole);

            // Optimistic update
            setUsers(prev => prev.map(u =>
                u.id === userId ? { ...u, role: newRole } : u
            ));
        } catch (err) {
            console.error('Failed to update role:', err);
            alert('Failed to update user role.');
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
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
                    <p className="text-slate-500">Manage user roles and permissions.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm">
                    Total Users: <strong>{users.length}</strong>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700">User</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Role</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Joined</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                                {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{u.full_name || 'No Name'}</div>
                                                <div className="text-sm text-slate-500">{u.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${u.role === 'admin'
                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                : 'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleToggleRole(u.id, u.role)}
                                            disabled={actionLoading === u.id}
                                            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${u.role === 'admin'
                                                    ? 'text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100'
                                                    : 'text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {actionLoading === u.id ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                                    Updating...
                                                </span>
                                            ) : (
                                                u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminUsersPage;
