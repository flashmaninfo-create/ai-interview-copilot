/**
 * Admin Users Page
 *
 * Displays all registered service users (excludes admins).
 * Admins are managed separately on /admin/admins.
 * Dark theme styling for admin portal.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../lib/services/adminService';
import { Users, Search, ArrowLeft } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
}

export function AdminUsersPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await adminService.getRegisteredUsers();
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

    // Filtered users based on search
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            return searchQuery === '' ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        });
    }, [users, searchQuery]);

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
                        <h1 className="text-2xl font-bold text-white">Registered Users</h1>
                    </div>
                    <p className="text-slate-400 ml-11">View all registered service users</p>
                </div>
                <div className="bg-blue-500/10 text-blue-400 px-4 py-2 rounded-lg text-sm border border-blue-500/20">
                    <Users className="w-4 h-4 inline mr-2" />
                    Total Users: <strong>{users.length}</strong>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
            </div>

            {error && (
                <div className="bg-red-500/10 text-red-400 p-4 rounded-lg border border-red-500/20">
                    {error}
                </div>
            )}

            {/* Users Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/50 border-b border-slate-700">
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">User</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Email</th>
                                <th className="px-6 py-4 text-sm font-semibold text-slate-300">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm">
                                                {u.full_name ? u.full_name[0].toUpperCase() : u.email[0].toUpperCase()}
                                            </div>
                                            <div className="font-medium text-white">
                                                {u.full_name || 'No Name'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {u.email}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-400">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                        {searchQuery 
                                            ? 'No users match your search criteria.' 
                                            : 'No users found.'}
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

export default AdminUsersPage;
