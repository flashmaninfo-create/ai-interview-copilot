import { useAuth } from '../../contexts/AuthContext';

// ModelSelector removed


export function SettingsPage() {
    const { user } = useAuth();

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account preferences.</p>
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Profile</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Email</label>
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                            {user?.email || 'Not available'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Account Created</label>
                        <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900">
                            {user?.created_at
                                ? new Date(user.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })
                                : 'Not available'}
                        </div>
                    </div>
                </div>
            </div>


            {/* Preferences Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Preferences</h2>
                <div className="space-y-4">
                    {/* ModelSelector removed - Admin managed */}

                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-slate-900">Email Notifications</div>
                            <div className="text-sm text-slate-500">Receive updates about your interviews</div>
                        </div>
                        <button className="w-12 h-6 bg-primary rounded-full relative transition-colors">
                            <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                <h2 className="text-lg font-bold text-red-600 mb-4">Danger Zone</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-slate-900">Delete Account</div>
                        <div className="text-sm text-slate-500">Permanently delete your account and all data</div>
                    </div>
                    <button className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
