/**
 * Dashboard Page
 *
 * Main dashboard showing credits, recent sessions, and quick actions.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { creditService } from '../../lib/services/creditService';
import { sessionService, type SessionSummary } from '../../lib/services/sessionService';
import { HelpCircle, X, Download, Monitor, CheckCircle2 } from 'lucide-react';

export function DashboardPage() {
    const { profile } = useAuth();

    const [credits, setCredits] = useState<number | null>(null);
    const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
    const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
    const [completedCount, setCompletedCount] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            const balanceResult = await creditService.getBalance();
            if (balanceResult.success) {
                setCredits(balanceResult.data!.balance);
            }

            const sessionsResult = await sessionService.list({ limit: 5 });
            if (sessionsResult.success) {
                const sessions = sessionsResult.data!.sessions;
                setRecentSessions(sessions);

                const active = sessions.find(
                    (s) => s.status === 'active' || s.status === 'created'
                );
                setActiveSession(active || null);
            }

            // Fetch total count of completed interviews
            const completedResult = await sessionService.list({ status: 'completed', limit: 1 });
            if (completedResult.success) {
                setCompletedCount(completedResult.data!.total);
            }

            setLoading(false);
        };

        fetchData();
    }, []);



    const getStatusColor = (status: SessionSummary['status']) => {
        const colors = {
            created: 'bg-slate-700 text-slate-300',
            active: 'bg-green-500/20 text-green-400',
            completed: 'bg-blue-500/20 text-blue-400',
            failed: 'bg-red-500/20 text-red-400',
            cancelled: 'bg-amber-500/20 text-amber-400',
        };
        return colors[status] || 'bg-slate-700 text-slate-300';
    };

    return (
        <div className="max-w-5xl text-foreground">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary">
                    Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}
                </h1>
                <p className="text-muted-foreground">Prepare for your next interview.</p>
            </div>

            {/* Active Session Alert */}
            {activeSession && (
                <div className="bg-card border-2 border-primary/20 p-5 rounded-xl mb-8 flex items-center justify-between shadow-lg shadow-primary/5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                            <span className="font-medium text-foreground">
                                {activeSession.status === 'active' ? 'Active Session' : 'Pending Session'}
                            </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {activeSession.role} - {activeSession.type} interview
                        </span>
                    </div>
                    <Link
                        to={`/dashboard/session/${activeSession.id}`}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-all"
                    >
                        {activeSession.status === 'active' ? 'Resume' : 'Start'}
                    </Link>
                    {activeSession.status === 'active' && (
                        <Link
                            to="/dashboard/console"
                            className="ml-3 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-all"
                        >
                            Live Console
                        </Link>
                    )}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground font-medium">Credits Available</span>
                        <Link to="/dashboard/credits" className="text-xs text-primary hover:underline">
                            Manage
                        </Link>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                        {loading ? '—' : credits}
                    </div>
                    {credits === 0 && !loading && (
                        <Link to="/pricing" className="text-xs text-destructive hover:underline mt-1 inline-block">
                            Buy more credits →
                        </Link>
                    )}
                </div>
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground font-medium">Completed</span>
                        <Link to="/dashboard/history" className="text-xs text-primary hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="text-3xl font-bold text-foreground">
                        {loading ? '—' : completedCount}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">


                <Link
                    to="/dashboard/history"
                    className="bg-card border border-border p-6 rounded-xl shadow-sm hover:border-primary/30 transition-all group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <svg className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">View History</h3>
                    <p className="text-muted-foreground text-sm">Review past sessions and scores</p>
                </Link>

                <div className="bg-surface border border-white/5 p-6 rounded-xl shadow-sm hover:border-purple-500/30 transition-all group relative flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                            <Download className="w-6 h-6 text-purple-400" />
                        </div>
                        <Monitor className="w-5 h-5 text-slate-500 group-hover:translate-y-1 transition-transform" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">Download Extension</h3>
                    <p className="text-slate-400 text-sm mb-4">Get Chrome Extension (ZIP)</p>
                    
                    <div className="mt-auto flex gap-3">
                        <a
                            href="/extension.zip"
                            download="Xtroone.zip"
                            className="flex-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-purple-200 text-center py-2 rounded-lg text-sm font-medium transition-colors border border-purple-500/20"
                        >
                            Download
                        </a>
                        <button
                            onClick={() => setShowInstallGuide(true)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-white/5"
                            title="How to install"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="border-b border-border px-6 py-4 flex items-center justify-between">
                        <h2 className="font-semibold text-foreground">Recent Sessions</h2>
                        <Link to="/dashboard/history" className="text-sm text-primary hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="divide-y divide-border">
                        {recentSessions.slice(0, 3).map((session) => (
                            <Link
                                key={session.id}
                                to={
                                    session.status === 'active' || session.status === 'created'
                                        ? `/dashboard/session/${session.id}`
                                        : `/dashboard/history/${session.id}`
                                }
                                className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                            >
                                <div>
                                    <p className="font-medium text-foreground">{session.role}</p>
                                    <p className="text-sm text-muted-foreground capitalize">
                                        {session.type} • {session.difficulty}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(session.status)}`}>
                                        {session.status}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )
            }

            {/* No Credits Warning */}
            {
                credits === 0 && !loading && (
                    <div className="mt-8 bg-warning/10 border border-warning/30 rounded-xl p-6 text-center">
                        <div className="mx-auto w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">You're out of credits</h3>
                        <p className="text-muted-foreground mb-4">Purchase more credits to continue practicing interviews.</p>
                        <Link
                            to="/pricing"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-warning text-warning-foreground font-semibold rounded-lg hover:bg-warning/90 transition-all"
                        >
                            Get More Credits
                        </Link>
                    </div>
                )
            }
            {/* Installation Guide Modal */}
            {showInstallGuide && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-lg border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/20">
                            <h3 className="text-xl font-semibold text-foreground">How to Install Extension</h3>
                            <button 
                                onClick={() => setShowInstallGuide(false)} 
                                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                            <div className="space-y-5">
                                <div className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">1</div>
                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Download & Extract</h4>
                                        <p className="text-sm text-muted-foreground">Download the zip file and extract it to a folder on your computer.</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">2</div>
                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Open Extensions Page</h4>
                                        <p className="text-sm text-muted-foreground mb-2">In Chrome, go to <span className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">chrome://extensions</span></p>
                                        <a href="chrome://extensions" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                            Open now <Monitor className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">3</div>
                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Enable Developer Mode</h4>
                                        <p className="text-sm text-muted-foreground">Toggle "Developer mode" in the top right corner.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-none w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">4</div>
                                    <div>
                                        <h4 className="font-medium text-foreground mb-1">Load Unpacked</h4>
                                        <p className="text-sm text-muted-foreground mb-2">Click "Load unpacked" and select the folder you extracted in Step 1.</p>
                                        <div className="p-3 bg-muted/30 rounded border border-border text-center">
                                            <span className="text-xs font-mono text-muted-foreground">Select Folder: "extension"</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                                <CheckCircle2 className="w-5 h-5 text-blue-500 flex-none" />
                                <p className="text-sm text-blue-400">
                                    Once installed, pin the extension to your toolbar for easy access during interviews.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border bg-muted/10 flex justify-end">
                            <button 
                                onClick={() => setShowInstallGuide(false)} 
                                className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-all shadow-sm"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default DashboardPage;
