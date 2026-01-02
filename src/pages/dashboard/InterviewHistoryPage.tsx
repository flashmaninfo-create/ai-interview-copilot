/**
 * Interview History Page
 *
 * Shows all past and current sessions for the user.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionService, type SessionSummary, type SessionStatus } from '../../lib/services/sessionService';

export function InterviewHistoryPage() {
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<SessionStatus | 'all'>('all');
    const [page, setPage] = useState(0);
    const limit = 10;

    useEffect(() => {
        fetchSessions();
    }, [filter, page]);

    const fetchSessions = async () => {
        setLoading(true);
        setError(null);

        const result = await sessionService.list({
            status: filter === 'all' ? undefined : filter,
            limit,
            offset: page * limit,
        });

        if (!result.success) {
            setError(result.error?.message || 'Failed to load sessions');
            setLoading(false);
            return;
        }

        setSessions(result.data!.sessions);
        setTotal(result.data!.total);
        setLoading(false);
    };

    const getStatusColor = (status: SessionStatus) => {
        const colors = {
            created: 'bg-slate-100 text-slate-700',
            active: 'bg-green-100 text-green-700',
            completed: 'bg-blue-100 text-blue-700',
            failed: 'bg-red-100 text-red-700',
            cancelled: 'bg-amber-100 text-amber-700',
        };
        return colors[status] || 'bg-slate-100 text-slate-700';
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDuration = (start: string | null, end: string | null) => {
        if (!start || !end) return '—';
        const ms = new Date(end).getTime() - new Date(start).getTime();
        const mins = Math.floor(ms / 60000);
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Interview History</h1>
                    <p className="text-slate-500">View your past and current sessions</p>
                </div>
                <Link
                    to="/dashboard/new"
                    className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Interview
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 mb-6">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {(['all', 'active', 'completed', 'created', 'failed', 'cancelled'] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => { setFilter(status); setPage(0); }}
                            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${filter === status
                                ? 'bg-primary text-white'
                                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {status === 'all' ? 'All Sessions' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                /* Empty State */
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No sessions found</h3>
                    <p className="text-slate-500 mb-6">
                        {filter === 'all'
                            ? "You haven't started any interviews yet."
                            : `No ${filter} sessions found.`}
                    </p>
                    <Link
                        to="/dashboard/new"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Start Your First Interview
                    </Link>
                </div>
            ) : (
                /* Sessions List */
                <>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Score</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Duration</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-slate-900">{session.role}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-slate-600 capitalize">{session.type}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(session.status)}`}>
                                                {session.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {session.score !== null ? (
                                                <span className="font-medium text-slate-900">{session.score}</span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatDuration(session.started_at, session.ended_at)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {formatDate(session.created_at)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                to={session.status === 'active' || session.status === 'created'
                                                    ? `/dashboard/session/${session.id}`
                                                    : `/dashboard/history/${session.id}`
                                                }
                                                className="text-primary hover:underline font-medium text-sm"
                                            >
                                                {session.status === 'active' ? 'Resume' :
                                                    session.status === 'created' ? 'Start' : 'View'}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {total > limit && (
                        <div className="flex items-center justify-between mt-6">
                            <p className="text-sm text-slate-500">
                                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} sessions
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={(page + 1) * limit >= total}
                                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default InterviewHistoryPage;
