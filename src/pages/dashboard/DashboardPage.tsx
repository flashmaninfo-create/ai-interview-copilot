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

export function DashboardPage() {
    const { profile, isAdmin } = useAuth();

    const [credits, setCredits] = useState<number | null>(null);
    const [recentSessions, setRecentSessions] = useState<SessionSummary[]>([]);
    const [activeSession, setActiveSession] = useState<SessionSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch credit balance
            const balanceResult = await creditService.getBalance();
            if (balanceResult.success) {
                setCredits(balanceResult.data!.balance);
            }

            // Fetch recent sessions
            const sessionsResult = await sessionService.list({ limit: 5 });
            if (sessionsResult.success) {
                const sessions = sessionsResult.data!.sessions;
                setRecentSessions(sessions);

                // Check for active session
                const active = sessions.find(
                    (s) => s.status === 'active' || s.status === 'created'
                );
                setActiveSession(active || null);
            }

            setLoading(false);
        };

        fetchData();
    }, []);

    const completedCount = recentSessions.filter((s) => s.status === 'completed').length;
    const avgScore = recentSessions
        .filter((s) => s.score !== null)
        .reduce((acc, s, _, arr) => acc + (s.score || 0) / arr.length, 0);

    const getStatusColor = (status: SessionSummary['status']) => {
        const colors = {
            created: 'bg-slate-100 text-slate-700',
            active: 'bg-green-100 text-green-700',
            completed: 'bg-blue-100 text-blue-700',
            failed: 'bg-red-100 text-red-700',
            cancelled: 'bg-amber-100 text-amber-700',
        };
        return colors[status] || 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">
                    Welcome back{profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}
                </h1>
                <p className="text-slate-500">Prepare for your next interview.</p>
            </div>

            {/* Active Session Alert */}
            {activeSession && (
                <div className="bg-white border-2 border-primary/20 p-5 rounded-xl mb-8 flex items-center justify-between shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="font-medium text-slate-900">
                                {activeSession.status === 'active' ? 'Active Session' : 'Pending Session'}
                            </span>
                        </div>
                        <span className="text-sm text-slate-500">
                            {activeSession.role} - {activeSession.type} interview
                        </span>
                    </div>
                    <Link
                        to={`/dashboard/session/${activeSession.id}`}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-all"
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
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500 font-medium">Credits Available</span>
                        <Link to="/dashboard/credits" className="text-xs text-primary hover:underline">
                            Manage
                        </Link>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                        {loading ? '—' : credits}
                    </div>
                    {credits === 0 && !loading && (
                        <Link to="/pricing" className="text-xs text-red-500 hover:underline mt-1 inline-block">
                            Buy more credits →
                        </Link>
                    )}
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-500 font-medium">Completed</span>
                        <Link to="/dashboard/history" className="text-xs text-primary hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">
                        {loading ? '—' : completedCount}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 font-medium mb-2">Avg. Score</div>
                    <div className="text-3xl font-bold text-slate-900">
                        {loading ? '—' : avgScore > 0 ? avgScore.toFixed(1) : '—'}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : ''} gap-6 mb-8`}>
                <Link
                    to="/dashboard/new"
                    className={`bg-primary text-white p-6 rounded-xl shadow-sm hover:bg-opacity-95 transition-all group ${credits === 0 ? 'opacity-60 pointer-events-none' : ''
                        }`}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <svg className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">Start New Interview</h3>
                    <p className="text-white/70 text-sm">Practice with AI-powered feedback</p>
                </Link>

                <Link
                    to="/dashboard/history"
                    className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:border-primary/30 transition-all group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">View History</h3>
                    <p className="text-slate-500 text-sm">Review past sessions and scores</p>
                </Link>
                {isAdmin && (
                    <Link
                        to="/admin"
                        className="bg-slate-800 text-white p-6 rounded-xl shadow-sm hover:bg-slate-700 transition-all group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                            </div>
                            <svg className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">Admin Panel</h3>
                        <p className="text-white/70 text-sm">Manage users, providers & plans</p>
                    </Link>
                )}
            </div>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-900">Recent Sessions</h2>
                        <Link to="/dashboard/history" className="text-sm text-primary hover:underline">
                            View all
                        </Link>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {recentSessions.slice(0, 3).map((session) => (
                            <Link
                                key={session.id}
                                to={
                                    session.status === 'active' || session.status === 'created'
                                        ? `/dashboard/session/${session.id}`
                                        : `/dashboard/history/${session.id}`
                                }
                                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                            >
                                <div>
                                    <p className="font-medium text-slate-900">{session.role}</p>
                                    <p className="text-sm text-slate-500 capitalize">
                                        {session.type} • {session.difficulty}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    {session.score !== null && (
                                        <span className="text-sm font-medium text-slate-600">
                                            Score: {session.score}
                                        </span>
                                    )}
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
                    <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-amber-900 mb-2">You're out of credits</h3>
                        <p className="text-amber-700 mb-4">Purchase more credits to continue practicing interviews.</p>
                        <Link
                            to="/pricing"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-all"
                        >
                            Get More Credits
                        </Link>
                    </div>
                )
            }
        </div >
    );
}

export default DashboardPage;
