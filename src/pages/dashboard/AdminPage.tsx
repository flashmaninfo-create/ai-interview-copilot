

import { Link } from 'react-router-dom';

export function AdminPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
            <p className="mb-4">Welcome to the Admin Dashboard.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">User Management</h2>
                    <p className="text-slate-600 mb-4">Manage users and permissions.</p>
                    <Link to="/admin/users" className="text-primary hover:underline">View Users &rarr;</Link>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">Plan Management</h2>
                    <p className="text-slate-600 mb-4">Create and manage subscription plans.</p>
                    <Link to="/admin/plans" className="text-primary hover:underline">Manage Plans &rarr;</Link>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
                    <h2 className="text-xl font-bold mb-4">System Settings</h2>
                    <p className="text-slate-600 mb-4">Configure LLM providers and credits.</p>
                    <div className="flex gap-4">
                        <Link to="/dashboard/settings" className="text-primary hover:underline">Settings &rarr;</Link>
                        <Link to="/admin/providers" className="text-primary hover:underline">Manage Providers &rarr;</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;
