import { useAuth } from '../../contexts/AuthContext';

export function SettingsPage() {
    const { user } = useAuth();

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                <p className="text-muted-foreground">Manage your account preferences.</p>
            </div>

            {/* Profile Section */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Profile</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                        <div className="px-4 py-3 bg-muted border border-border rounded-lg text-foreground">
                            {user?.email || 'Not available'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Account Created</label>
                        <div className="px-4 py-3 bg-muted border border-border rounded-lg text-foreground">
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
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
                <h2 className="text-lg font-bold text-foreground mb-4">Preferences</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium text-foreground">Email Notifications</div>
                            <div className="text-sm text-muted-foreground">Receive updates about your interviews</div>
                        </div>
                        <button className="w-12 h-6 bg-primary rounded-full relative transition-colors">
                            <span className="absolute right-1 top-1 w-4 h-4 bg-primary-foreground rounded-full shadow"></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-card rounded-xl shadow-sm border border-destructive/30 p-6">
                <h2 className="text-lg font-bold text-destructive mb-4">Danger Zone</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="font-medium text-foreground">Delete Account</div>
                        <div className="text-sm text-muted-foreground">Permanently delete your account and all data</div>
                    </div>
                    <button className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
