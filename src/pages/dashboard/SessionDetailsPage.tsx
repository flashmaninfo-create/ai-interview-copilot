/**
 * Session Details Page
 *
 * Shows completed session results including:
 * - Score and summary
 * - Transcript
 * - AI responses
 * - Insights
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sessionService, type Session, type SessionStatus } from '../../lib/services/sessionService';

export function SessionDetailsPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'ai'>('summary');

    // Fetch session
    const fetchSession = useCallback(async () => {
        if (!sessionId) return;

        setLoading(true);
        const result = await sessionService.get(sessionId);

        if (!result.success) {
            setError(result.error?.message || 'Session not found');
        } else {
            setSession(result.data!);

            // If session is still active, redirect to live console
            if (result.data!.status === 'active' || result.data!.status === 'created') {
                navigate(`/dashboard/session/${sessionId}`, { replace: true });
            }
        }

        setLoading(false);
    }, [sessionId, navigate]);

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    // Helper functions
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
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
        if (mins < 60) return `${mins} minutes`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m`;
    };

    const getStatusBadge = (status: SessionStatus) => {
        const styles = {
            created: 'bg-slate-800 text-slate-300',
            active: 'bg-green-500/20 text-green-400',
            completed: 'bg-blue-500/20 text-blue-400',
            failed: 'bg-red-500/20 text-red-400',
            cancelled: 'bg-amber-500/20 text-amber-400',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${styles[status]}`}>
                {status}
            </span>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading session details...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !session) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Session Not Found</h2>
                    <p className="text-slate-400 mb-6">{error || 'This session could not be loaded.'}</p>
                    <Link
                        to="/dashboard/history"
                        className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                    >
                        Back to History
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-5xl">
            {/* Back Link */}
            <Link
                to="/dashboard/history"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to History
            </Link>

            {/* Header */}
            <div className="bg-card rounded-2xl shadow-sm border border-border p-8 mb-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-foreground">{session.role}</h1>
                            {getStatusBadge(session.status)}
                        </div>
                        <p className="text-muted-foreground capitalize">{session.type} Interview • {session.difficulty} Difficulty</p>
                        <p className="text-sm text-muted-foreground mt-1">{formatDate(session.created_at)}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Duration</p>
                        <p className="text-lg font-semibold text-foreground">
                            {formatDuration(session.started_at, session.ended_at)}
                        </p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Transcript</p>
                        <p className="text-lg font-semibold text-foreground">
                            {session.transcript?.length || 0} entries
                        </p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">AI Assists</p>
                        <p className="text-lg font-semibold text-foreground">
                            {session.ai_responses?.length || 0} used
                        </p>
                    </div>
                    <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Credits</p>
                        <p className="text-lg font-semibold text-foreground">
                            {session.credit_deducted ? '1 used' : 'None'}
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                    <div className="border-b border-border flex">
                        {(['summary', 'transcript', 'ai'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab
                                    ? 'text-primary border-b-2 border-primary bg-primary/10'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab === 'summary' && 'Summary & Insights'}
                                {tab === 'transcript' && 'Transcript'}
                                {tab === 'ai' && 'AI Responses'}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* Summary Tab */}
                        {activeTab === 'summary' && (
                            <div className="space-y-6">
                                {session.summary ? (
                                    <div className="bg-muted/30 rounded-lg p-6 border border-border">
                                        <h3 className="text-lg font-semibold text-foreground mb-3">AI Summary</h3>
                                        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                                            {session.summary}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No summary available for this session.
                                    </div>
                                )}

                                {/* Placeholder insights */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-success/10 rounded-lg p-4 border border-success/20">
                                        <h4 className="text-sm font-semibold text-success mb-2">💪 Strengths</h4>
                                        <ul className="text-sm text-success/80 space-y-1">
                                            <li>• Clear communication style</li>
                                            <li>• Structured problem-solving approach</li>
                                            <li>• Good use of AI assistance</li>
                                        </ul>
                                    </div>
                                    <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                                        <h4 className="text-sm font-semibold text-warning mb-2">📈 Areas for Improvement</h4>
                                        <ul className="text-sm text-warning/80 space-y-1">
                                            <li>• Elaborate more on implementations</li>
                                            <li>• Provide concrete examples</li>
                                            <li>• Consider edge cases earlier</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Transcript Tab */}
                        {activeTab === 'transcript' && (
                            <div className="space-y-4">
                                {session.transcript && session.transcript.length > 0 ? (
                                    session.transcript.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-2xl px-5 py-3 ${entry.speaker === 'user'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-foreground border border-border'
                                                    }`}
                                            >
                                                <div className={`text-xs font-medium mb-1 ${entry.speaker === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                                    }`}>
                                                    {entry.speaker === 'user' ? 'You' : 'Interviewer'}
                                                    <span className="ml-2">
                                                        {new Date(entry.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p>{entry.text}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No transcript available for this session.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* AI Responses Tab */}
                        {activeTab === 'ai' && (
                            <div className="space-y-4">
                                {session.ai_responses && session.ai_responses.length > 0 ? (
                                    session.ai_responses.map((response) => (
                                        <div
                                            key={response.id}
                                            className="bg-muted/30 rounded-lg p-4 border border-border"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${response.type === 'hint' ? 'bg-warning/20 text-warning' :
                                                    response.type === 'code' ? 'bg-blue-500/20 text-blue-500' :
                                                        response.type === 'explain' ? 'bg-purple-500/20 text-purple-500' :
                                                            'bg-muted text-muted-foreground'
                                                    }`}>
                                                    {response.type}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(response.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground whitespace-pre-wrap">{response.text}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No AI responses were used in this session.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-4 mt-8">
                    <Link
                        to="/dashboard/new"
                        className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-all"
                    >
                        Start New Interview
                    </Link>
                    <Link
                        to="/dashboard/history"
                        className="px-6 py-3 border border-border text-muted-foreground font-medium rounded-lg hover:bg-muted transition-all"
                    >
                        View All Sessions
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default SessionDetailsPage;
