import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
    Info
} from 'lucide-react';

export function LiveConsolePage() {
    const { user } = useAuth();

    // Use the unified sync hook
    const {
        connected,
        transcripts,
        finalizedText, // Smooth append-only text
        hints,
        sessionStatus,
        sendCommand
    } = useConsoleSync();

    const [credits, setCredits] = useState<number>(0);
    const [loading, setLoading] = useState(false);
    const [activePanel, setActivePanel] = useState<'transcript' | 'hints'>('transcript');
    const [quickPrompt, setQuickPrompt] = useState('');
    const [userScrolledUp, setUserScrolledUp] = useState(false);

    const transcriptRef = useRef<HTMLDivElement>(null);

    // Fetch credits from Supabase on mount and when session status changes
    useEffect(() => {
        const fetchCredits = async () => {
            const result = await creditService.getBalance();
            if (result.success && result.data) {
                setCredits(result.data.balance);
            }
        };
        fetchCredits();
    }, [sessionStatus]); // Refetch when session status changes (e.g., session ends)

    // Smart auto-scroll: only scroll if user is at bottom
    useEffect(() => {
        if (transcriptRef.current && !userScrolledUp) {
            transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
        }
    }, [finalizedText, transcripts, userScrolledUp]);

    // Detect if user scrolled up
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 80;
        setUserScrolledUp(!isAtBottom);
    };

    const requestHint = async (type: string) => {
        setLoading(true);
        setActivePanel('hints');

        // Send request via sync hook
        await sendCommand('REQUEST_HINT', { requestType: type, trigger: 'manual' });

        // Loading state is handled by hook updates usually, but we can keep local loading briefly
        // or listen to HINT_LOADING from hook if we exported it?
        // For now, let's just timeout the loading spinner after a bit or until hint arrives
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
        <div className="min-h-screen bg-transparent flex flex-col">
            {/* Header */}
            <header className="bg-gradient-to-r from-[#134a1b] to-[#1a6428] text-white shadow-lg rounded-xl mb-6">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Mic className="w-6 h-6" />
                        <div>
                            <h1 className="text-lg font-bold">Interview Copilot Console</h1>
                            <div className="flex items-center gap-2 text-sm opacity-90">
                                <span className={`w-2 h-2 rounded-full ${sessionStatus === 'active' ? 'bg-green-400 animate-pulse' :
                                    sessionStatus === 'session_found' ? 'bg-yellow-400 animate-pulse' :
                                        'bg-gray-400'
                                    }`}></span>
                                {sessionStatus === 'active' ? '● Live - Receiving Data' :
                                    sessionStatus === 'session_found' ? '◐ Session Found - Waiting for Data' :
                                        'Waiting for Session'}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Connection Banner */}
            {!connected && (
                <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-xl mb-6">
                    <div className="text-center flex items-center justify-center gap-2">
                        <Info className="w-4 h-4 text-yellow-800" />
                        <p className="text-yellow-800 text-sm">
                            To connect: Open the meeting page → Click extension icon → Click "Open Console"
                        </p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6 h-full flex-1">

                {/* Left Column - Actions */}
                <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                            Quick Actions
                        </h2>

                        <div className="space-y-3">
                            <button
                                onClick={() => requestHint('hint')}
                                disabled={loading || !connected}
                                className="w-full py-3 px-4 bg-[#134a1b] text-white rounded-lg font-medium hover:bg-[#0f3d16] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4" />
                                Help Me
                            </button>

                            <button
                                onClick={() => requestHint('code')}
                                disabled={loading || !connected}
                                className="w-full py-3 px-4 bg-[#134a1b] text-white rounded-lg font-medium hover:bg-[#0f3d16] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Code2 className="w-4 h-4" />
                                Generate Code
                            </button>

                            <button
                                onClick={() => requestHint('explain')}
                                disabled={loading || !connected}
                                className="w-full py-3 px-4 border-2 border-[#134a1b] text-[#134a1b] rounded-lg font-medium hover:bg-green-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                <BookOpen className="w-4 h-4" />
                                Explain
                            </button>
                        </div>
                    </div>

                    {/* Quick Prompt */}
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                            Quick Prompt
                        </h2>
                        <div className="space-y-3">
                            <textarea
                                value={quickPrompt}
                                onChange={(e) => setQuickPrompt(e.target.value)}
                                placeholder="Ask anything..."
                                disabled={!connected}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg resize-none h-24 focus:ring-2 focus:ring-[#134a1b] focus:border-transparent disabled:bg-gray-50"
                            />
                            <button
                                onClick={handleQuickPrompt}
                                disabled={loading || !quickPrompt.trim() || !connected}
                                className="w-full py-2 px-4 bg-[#134a1b] text-white rounded-lg font-medium hover:bg-[#0f3d16] disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Processing...' : 'Send'}
                            </button>
                        </div>
                    </div>

                    {/* Credits */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                        <div className="text-3xl font-bold text-[#134a1b]">{credits}</div>
                        <div className="text-sm text-green-700 uppercase tracking-wide">Credits Remaining</div>
                    </div>
                </div>

                {/* Right Columns - Transcript & Hints */}
                <div className="lg:col-span-2 flex flex-col h-[calc(100vh-200px)]">
                    {/* Panel Tabs */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                        <button
                            onClick={() => setActivePanel('transcript')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activePanel === 'transcript'
                                ? 'bg-white text-[#134a1b] shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Live Transcript ({transcripts.length})
                        </button>
                        <button
                            onClick={() => setActivePanel('hints')}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activePanel === 'hints'
                                ? 'bg-white text-[#134a1b] shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Lightbulb className="w-4 h-4" />
                            AI Hints ({hints.length})
                        </button>
                    </div>

                    {/* Content Panel */}
                    <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden border border-slate-200 relative">
                        {/* Transcript Panel */}
                        {activePanel === 'transcript' && (
                            <div
                                ref={transcriptRef}
                                onScroll={handleScroll}
                                className="absolute inset-0 overflow-y-auto p-6 scroll-smooth"
                            >
                                {(!finalizedText && transcripts.length === 0) ? (
                                    <div className="text-center py-16 text-gray-400">
                                        <Mic className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <div className="text-lg font-medium">Listening for audio...</div>
                                        <div className="text-sm mt-1">Live transcription will appear here as the interview progresses</div>
                                    </div>
                                ) : (
                                    <div className="prose max-w-none">
                                        {/* Use finalizedText if available (smooth mode), fallback to transcripts array */}
                                        {finalizedText ? (
                                            <p className="text-gray-800 leading-7 text-lg whitespace-pre-wrap">
                                                {finalizedText}
                                            </p>
                                        ) : (
                                            <p className="text-gray-800 leading-7 text-lg">
                                                {transcripts.map((t, i) => (
                                                    <span key={t.id || i} className="mr-1 hover:bg-yellow-50 transition-colors cursor-default" title={`Confidence: ${Math.round((t.confidence || 0) * 100)}% • ${t.timestamp}`}>
                                                        {t.text}
                                                    </span>
                                                ))}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {/* Scroll indicator */}
                                {userScrolledUp && (
                                    <div
                                        className="sticky bottom-2 flex justify-center w-full"
                                        onClick={() => {
                                            setUserScrolledUp(false);
                                            if (transcriptRef.current) {
                                                transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
                                            }
                                        }}
                                    >
                                        <button className="bg-[#134a1b] text-white text-xs px-3 py-1 rounded-full shadow-lg hover:bg-[#0f3d16] transition-transform hover:scale-105 flex items-center gap-1">
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
                                        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#134a1b] rounded-full animate-spin"></div>
                                        <p className="text-gray-500 mt-4">AI is thinking...</p>
                                    </div>
                                )}

                                {!loading && hints.length === 0 && (
                                    <div className="text-center py-16 text-gray-400">
                                        <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <div className="text-lg font-medium">AI hints will appear here</div>
                                        <div className="text-sm mt-1">Click an action button or type a question to get started</div>
                                    </div>
                                )}

                                {hints.map((h, idx) => (
                                    <div
                                        key={h.id || idx}
                                        className={`rounded-lg p-4 border-l-4 ${h.type === 'error'
                                            ? 'bg-red-50 border-red-500'
                                            : 'bg-gradient-to-br from-green-50 to-emerald-50 border-[#134a1b]'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${h.type === 'error'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-[#134a1b] text-white'
                                                }`}>
                                                {h.type === 'code' ? <Code2 className="w-3 h-3" /> : h.type === 'explain' ? <BookOpen className="w-3 h-3" /> : h.type === 'error' ? <AlertTriangle className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                                                {h.type === 'code' ? 'Code' : h.type === 'explain' ? 'Explanation' : h.type === 'error' ? 'Error' : 'Hint'}
                                            </span>
                                            <span className="text-xs text-gray-400">{h.timestamp}</span>
                                        </div>
                                        <div className={`whitespace-pre-wrap text-sm leading-relaxed ${h.type === 'error' ? 'text-red-700' : 'text-gray-800'}`}>
                                            {h.hint || h.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
