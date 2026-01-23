/**
 * Admin Management Page
 *
 * Allows adding and removing other administrators.
 * Only accessible by admins (obviously).
 */

import { useState, useEffect, useMemo } from 'react';
import { adminService } from '../../lib/services/adminService';
import { ShieldCheck, Search, Plus, Trash2, Edit2, X, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface AdminProfile {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    role: 'admin'; // Always admin for this page
}

// Super admin emails - only these accounts can add/delete admins
const SUPER_ADMIN_EMAILS = ['flashman.info@gmail.com', 'admin@interview-master.com'];

export function AdminAdminsPage() {
    const { profile: currentAdmin, status } = useAuth();
    const navigate = useNavigate();
    const isSuperAdmin = currentAdmin?.email ? SUPER_ADMIN_EMAILS.includes(currentAdmin.email) : false;
    
    // Route guard: Redirect non-super-admins
    useEffect(() => {
        if (status !== 'loading' && currentAdmin && !isSuperAdmin) {
            navigate('/admin/dashboard', { replace: true });
        }
    }, [status, currentAdmin, isSuperAdmin, navigate]);
    const [admins, setAdmins] = useState<AdminProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Actions
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: ''
    });
    const [selectedAdmin, setSelectedAdmin] = useState<AdminProfile | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const profiles = await adminService.getUsers(); // We filter locally or rely on service
            // Filter only admins just in case service returns all
            const adminProfiles = profiles.filter(p => p.role === 'admin') as any as AdminProfile[];
            setAdmins(adminProfiles);
        } catch (err: any) {
            console.error('Failed to fetch admins:', err);
            setError('Failed to load administrators.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const resetForm = () => {
        setFormData({ email: '', password: '', fullName: '' });
        setShowPassword(false);
        setSelectedAdmin(null);
    };

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setActionLoading('add');
            await adminService.createAdmin(formData.email, formData.password, formData.fullName);
            await fetchAdmins();
            setShowAddModal(false);
            resetForm();
            alert('Administrator added successfully.');
        } catch (err: any) {
            console.error('Failed to add admin:', err);
            alert('Failed to add admin: ' + (err.message || 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAdmin) return;

        try {
            setActionLoading('edit');
            // Only update password if provided
            if (formData.password) {
                await adminService.updateAdminPassword(selectedAdmin.id, formData.password);
            }
            // Update other fields if we had an endpoint (currently primarily focused on password/auth)
            // For now, assume password update is the main "Edit" action available securely
            
            await fetchAdmins();
            setShowEditModal(false);
            resetForm();
            alert('Administrator updated successfully.');
        } catch (err: any) {
            console.error('Failed to update admin:', err);
            alert('Failed to update admin: ' + err.message);
        } finally {
            setActionLoading(null);
        }
    };

    // Remove Admin (Demote to user or Delete? Usually Delete/Ban for safety, but let's assume Delete from list for now or bespoke implementation)
    // IMPORTANT: Supabase client-side admin separation is tricky. 
    // Usually we just want to protect this UI. 
    // We'll implement a "Delete/Remove Access" if supported, or just show list.
    // For this demo, let's implement a 'Delete' that actually calls an RPC or edge function if available, 
    // or we might just have read-only for now if backend isn't ready.
    // Assuming backend support for delete:
    const handleDeleteAdmin = async (admin: AdminProfile) => {
        if (!isSuperAdmin) {
            alert("Only the super admin can remove administrators.");
            return;
        }
        if (currentAdmin?.email && SUPER_ADMIN_EMAILS.includes(admin.email)) {
            alert("Super admin accounts cannot be deleted.");
            return;
        }
        if (admin.id === currentAdmin?.id) {
            alert("You cannot remove yourself.");
            return;
        }
        if (!window.confirm(`Are you sure you want to remove ${admin.email} from administrators?`)) return;

        try {
            setActionLoading(admin.id);
            await adminService.deleteUser(admin.id);
            await fetchAdmins();
            alert('Administrator removed successfully.');
        } catch (err: any) {
            console.error('Failed to delete admin:', err);
            alert('Failed to remove admin: ' + (err.message || 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    };

    const openEditModal = (admin: AdminProfile) => {
        setSelectedAdmin(admin);
        setFormData({
            email: admin.email,
            password: '', // Don't show current hash
            fullName: admin.full_name || ''
        });
        setShowEditModal(true);
    };

    const filteredAdmins = useMemo(() => {
        return admins.filter(a => 
            a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
        );
    }, [admins, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link 
                            to="/admin/dashboard" 
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">Administrators</h1>
                    </div>
                    <p className="text-muted-foreground ml-11">Manage system administrators</p>
                </div>
                {isSuperAdmin && (
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add Admin
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary shadow-sm"
                />
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
                    {error}
                </div>
            )}

            {/* Admins Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 border-b border-border">
                                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Administrator</th>
                                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Email</th>
                                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground">Added On</th>
                                <th className="px-6 py-4 text-sm font-semibold text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAdmins.map((admin) => (
                                <tr key={admin.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                                                {admin.full_name ? admin.full_name[0].toUpperCase() : admin.email[0].toUpperCase()}
                                            </div>
                                            <div className="font-medium text-foreground">
                                                {admin.full_name || 'No Name'}
                                                {admin.id === currentAdmin?.id && (
                                                    <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">You</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {admin.email}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {new Date(admin.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(admin)}
                                                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                                title="Edit Password"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {isSuperAdmin && admin.id !== currentAdmin?.id && !SUPER_ADMIN_EMAILS.includes(admin.email) && (
                                                <button
                                                    onClick={() => handleDeleteAdmin(admin)}
                                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    title="Remove Admin"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAdmins.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        {searchQuery 
                                            ? 'No admins match your search.' 
                                            : 'No administrators found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Admin Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Add Administrator</h2>
                            <button 
                                onClick={() => setShowAddModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddAdmin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.fullName}
                                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary"
                                    placeholder="admin@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={8}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary pr-10"
                                        placeholder="Min. 8 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'add'}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {actionLoading === 'add' ? 'Creating...' : 'Create Admin'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {showEditModal && selectedAdmin && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-foreground">Edit Administrator</h2>
                            <button 
                                onClick={() => setShowEditModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                            <div className="text-sm text-muted-foreground mb-1">Editing:</div>
                            <div className="font-medium text-foreground">{selectedAdmin.email}</div>
                        </div>

                        <form onSubmit={handleUpdateAdmin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">New Password (Optional)</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        minLength={8}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-primary pr-10"
                                        placeholder="Leave empty to keep current"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Only fill this if you want to change the password.</p>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading === 'edit'}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-background px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center"
                                >
                                    {actionLoading === 'edit' ? (
                                        <span className="w-5 h-5 border-2 border-background/20 border-t-background rounded-full animate-spin"></span>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminAdminsPage;
