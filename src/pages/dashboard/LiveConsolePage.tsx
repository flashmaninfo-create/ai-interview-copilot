import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useConsoleSync } from '../../hooks/useConsoleSync';
import { creditService } from '../../lib/services/creditService';
import {
    Mic,
    Lightbulb,
    Sparkles,
    Code2,
    BookOpen,
    FileText,
    AlertTriangle,
    ArrowDown,
    ArrowLeft,
    MessageSquare,
    Camera
} from 'lucide-react';

export function LiveConsolePage() {
    const {
        connected,
        transcripts,
        finalizedText,
        hints,
        sessionStatus,
        sendCommand
    } = useConsoleSync();

    const [credits, setCredits] = useState<number>(0);
    const [creditsLoaded, setCreditsLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activePanel, setActivePanel] = useState<'transcript' | 'hints'>('transcript');
    const [quickPrompt, setQuickPrompt] = useState('');
    const [userScrolledUp, setUserScrolledUp] = useState(false);

    const transcriptRef = useRef<HTMLDivElement>(null);

    /* Fetch credits */
    useEffect(() => {
        const fetchCredits = async () => {
            try {
                const result = await creditService.getBalance();
                if (result.success && result.data) {
                    setCredits(result.data.balance);
                }
            } finally {
                setCreditsLoaded(true);
            }
        };
        fetchCredits();
    }, [sessionStatus]);

    /* Block if no credits */
    if (creditsLoaded && credits <= 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="bg-surface border border-white/10 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">No Credits Remaining</h2>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Your session cannot be started because you have 0 credits.
                        Please top up your account to continue using the Live Console.
                    </p>

                    <div className="space-y-3">
                        <Link
                            to="/pricing"
                            className="block w-full py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-opacity-90 transition-all text-sm"
                        >
                            Get More Credits
                        </Link>
                        <Link
                            to="/dashboard"
                            className="block w-full py-3 px-4 bg-white/5 text-slate-300 font-medium rounded-xl hover:bg-white/10 transition-all text-sm"
                        >
                            Return to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    /* Smart auto-scroll */
    useEffect(() => {
        if (transcriptRef.current && !userScrolledUp) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [finalizedText, transcripts, userScrolledUp]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 80;
        setUserScrolledUp(!isAtBottom);
    };

    const requestHint = async (type: string) => {
        setLoading(true);
        setActivePanel('hints');

        await sendCommand('REQUEST_HINT', {
            requestType: type,
            trigger: 'manual'
        });

        setTimeout(() => setLoading(false), 3000);
    };

    const handleQuickPrompt = async () => {
        if (!quickPrompt.trim()) return;

        setLoading(true);
        setActivePanel('hints');

        await sendCommand('REQUEST_HINT', {
            requestType: 'custom',
            trigger: 'manual',
            customPrompt: quickPrompt
        });

        setQuickPrompt('');
        setTimeout(() => setLoading(false), 3000);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col p-4">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary/90 to-primary/70 text-white shadow-lg rounded-xl mb-6 border border-white/10">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/dashboard"
                            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <Mic className="w-6 h-6" />
                            <div>
                                <h1 className="text-lg font-bold">Interview Copilot Console</h1>
                                <div className="flex items-center gap-2 text-sm opacity-90">
                                    <span className={`w-2 h-2 rounded-full ${sessionStatus === 'active'
                                        ? 'bg-green-400 animate-pulse'
                                        : sessionStatus === 'session_found'
                                            ? 'bg-yellow-400 animate-pulse'
                                            : 'bg-slate-400'
                                        }`} />
                                    {sessionStatus === 'active'
                                        ? '● Live - Receiving Data'
                                        : sessionStatus === 'session_found'
                                            ? '◐ Session Found - Waiting for Data'
                                            : 'Waiting for Session'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="grid grid-cols-[1fr_20%] gap-6 h-full flex-1">

                {/* Left Column - Transcript & Hints */}
                <div className="flex flex-col flex-1 min-h-0">

                    {/* Panel Tabs */}
                    <div className="flex bg-surface rounded-lg p-1 mb-4 border border-white/5">
                        <button
                            onClick={() => setActivePanel('transcript')}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${activePanel === 'transcript'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Live Transcript ({transcripts.length})
                        </button>
                        <button
                            onClick={() => setActivePanel('hints')}
                            className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${activePanel === 'hints'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            <Lightbulb className="w-3.5 h-3.5" />
                            AI Hints ({hints.length})
                        </button>
                    </div>

                    {/* Content Panel */}
                    <div className="bg-surface rounded-xl shadow-sm flex-1 overflow-hidden border border-white/10 relative">

                        {/* Transcript Panel */}
                        {activePanel === 'transcript' && (
                            <div
                                ref={transcriptRef}
                                onScroll={handleScroll}
                                className="absolute inset-0 overflow-y-auto p-6 scroll-smooth"
                            >
                                {(!finalizedText && transcripts.length === 0) ? (
                                    <div className="py-6 px-2 text-slate-400">
                                        {/* Meeting Process Guide */}
                                        <div className="mb-8">
                                            <h3 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                                                <Mic className="w-4 h-4 text-primary" />
                                                How to Start a Meeting
                                            </h3>
                                            <ol className="space-y-2 text-sm list-decimal list-inside ml-1">
                                                <li>Open your meeting page (Google Meet, Zoom, etc.)</li>
                                                <li>Click the Interview Copilot extension icon</li>
                                                <li>Click "Start Session" in the extension popup</li>
                                                <li>Click "Open Console" to view this dashboard</li>
                                                <li>The transcript and AI features will activate automatically</li>
                                            </ol>
                                        </div>

                                        {/* Quick Actions Guide */}
                                        <div className="mb-8">
                                            <h3 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                                Quick Actions
                                            </h3>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-start gap-2">
                                                    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                    <span><span className="text-white font-medium">Help Me</span> — Get a quick hint when stuck on a question</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                    <span><span className="text-white font-medium">Answer</span> — Generate a full, structured response</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Code2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                    <span><span className="text-white font-medium">Code</span> — Get working code snippets for problems</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                                    <span><span className="text-white font-medium">Explain</span> — Get clear explanations of concepts</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Camera className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                                                    <span><span className="text-white font-medium">Screenshot</span> — Capture & analyze on-screen content</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Lightbulb className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                                    <span><span className="text-white font-medium">Quick Prompt</span> — Ask any custom question to the AI</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* End Meeting Guide */}
                                        <div>
                                            <h3 className="text-white font-semibold text-base mb-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                                Ending a Meeting
                                            </h3>
                                            <ul className="space-y-2 text-sm list-disc list-inside ml-1">
                                                <li>Click "Finish Meeting" in the extension overlay</li>
                                                <li>Your session will be saved and 1 credit will be deducted</li>
                                                <li>Session transcript and hints are stored in your history</li>
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose max-w-none">
                                        {finalizedText ? (
                                            <p className="text-slate-300 leading-7 text-lg whitespace-pre-wrap">
                                                {finalizedText}
                                            </p>
                                        ) : (
                                            <p className="text-slate-300 leading-7 text-lg">
                                                {transcripts.map((t, i) => (
                                                    <span
                                                        key={t.id || i}
                                                        className="mr-1 hover:bg-white/5 transition-colors cursor-default"
                                                        title={`Confidence: ${Math.round((t.confidence || 0) * 100)}% • ${t.timestamp}`}
                                                    >
                                                        {t.text}
                                                    </span>
                                                ))}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {userScrolledUp && (
                                    <div
                                        className="sticky bottom-2 flex justify-center w-full"
                                        onClick={() => {
                                            setUserScrolledUp(false);
                                            transcriptRef.current!.scrollTop =
                                                transcriptRef.current!.scrollHeight;
                                        }}
                                    >
                                        <button className="bg-primary text-white text-xs px-3 py-1 rounded-full shadow-lg hover:bg-opacity-90 transition-transform hover:scale-105 flex items-center gap-1">
                                            <ArrowDown className="w-3 h-3" />
                                            New text
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hints Panel */}
                        {activePanel === 'hints' && (
                            <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                                {loading && (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="w-10 h-10 border-4 border-slate-700 border-t-primary rounded-full animate-spin" />
                                        <p className="text-slate-500 mt-4">AI is thinking...</p>
                                    </div>
                                )}

                                {!loading && hints.length === 0 && (
                                    <div className="text-center py-16 text-slate-500">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <div className="text-lg font-medium">AI hints will appear here</div>
                                        <div className="text-sm mt-1">
                                            Click an action button or type a question to get started
                                        </div>
                                    </div>
                                )}

                                {hints.map((h, idx) => (
                                    <div
                                        key={h.id || idx}
                                        className={`rounded-lg p-4 border-l-4 ${h.type === 'error'
                                            ? 'bg-red-500/10 border-red-500'
                                            : 'bg-background border-primary'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${h.type === 'error'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-primary text-white'
                                                }`}>
                                                {h.type === 'code'
                                                    ? <Code2 className="w-3 h-3" />
                                                    : h.type === 'explain'
                                                        ? <BookOpen className="w-3 h-3" />
                                                        : h.type === 'error'
                                                            ? <AlertTriangle className="w-3 h-3" />
                                                            : <Sparkles className="w-3 h-3" />}
                                                {h.type === 'code'
                                                    ? 'Code'
                                                    : h.type === 'explain'
                                                        ? 'Explanation'
                                                        : h.type === 'error'
                                                            ? 'Error'
                                                            : 'Hint'}
                                            </span>
                                            <span className="text-xs text-slate-500">{h.timestamp}</span>
                                        </div>
                                        <div className={`whitespace-pre-wrap text-sm leading-relaxed ${h.type === 'error'
                                            ? 'text-red-400'
                                            : 'text-slate-300'
                                            }`}>
                                            {h.hint || h.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Actions */}
                <div className="space-y-4 min-w-[200px]">
                    <div className="bg-surface rounded-xl shadow-sm p-3 border border-white/10">
                        <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Quick Actions
                        </h2>

                        <div className="space-y-2">
                            <button
                                onClick={() => requestHint('help')}
                                disabled={loading || !connected}
                                className="w-full py-1.5 px-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                            >
                                <Sparkles className="w-3 h-3" />
                                Help Me
                            </button>

                            {/* ✅ ANSWER BUTTON (extension worker) */}
                            <button
                                onClick={() => requestHint('answer')}
                                disabled={loading || !connected}
                                className="w-full py-1.5 px-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                            >
                                <MessageSquare className="w-3 h-3" />
                                Answer
                            </button>

                            <button
                                onClick={() => requestHint('code')}
                                disabled={loading || !connected}
                                className="w-full py-1.5 px-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                            >
                                <Code2 className="w-3 h-3" />
                                Code
                            </button>

                            <button
                                onClick={() => requestHint('explain')}
                                disabled={loading || !connected}
                                className="w-full py-1.5 px-2 border border-primary text-primary rounded-lg text-xs font-medium hover:bg-primary/10 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                            >
                                <BookOpen className="w-3 h-3" />
                                Explain
                            </button>

                            {/* Screenshot Button */}
                            <button
                                onClick={() => requestHint('screenshot')}
                                disabled={loading || !connected}
                                className="w-full py-1.5 px-2 border border-purple-500 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/10 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                            >
                                <Camera className="w-3 h-3" />
                                Screenshot
                            </button>
                        </div>
                    </div>

                    {/* Quick Prompt */}
                    <div className="bg-surface rounded-xl shadow-sm p-3 border border-white/10">
                        <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Quick Prompt
                        </h2>
                        <div className="space-y-2">
                            <textarea
                                value={quickPrompt}
                                onChange={(e) => setQuickPrompt(e.target.value)}
                                placeholder="Ask..."
                                disabled={!connected}
                                className="w-full px-2 py-1.5 bg-background border border-white/10 rounded-lg resize-none h-16 text-xs focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-slate-800/50 text-white placeholder-slate-500"
                            />
                            <button
                                onClick={handleQuickPrompt}
                                disabled={loading || !quickPrompt.trim() || !connected}
                                className="w-full py-1 px-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all"
                            >
                                {loading ? '...' : 'Send'}
                            </button>
                        </div>
                    </div>

                    {/* Credits */}
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                        <div className="text-xl font-bold text-green-400">{credits}</div>
                        <div className="text-[10px] text-green-300 uppercase tracking-wide">Credits</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
