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
  ArrowDown,
  Info,
  ArrowLeft
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
  const [loading, setLoading] = useState(false);
  const [activePanel, setActivePanel] = useState<'transcript' | 'hints'>('transcript');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);

  /* ---------------- Credits ---------------- */
  useEffect(() => {
    const fetchCredits = async () => {
      const result = await creditService.getBalance();
      if (result.success && result.data) {
        setCredits(result.data.balance);
      }
    };
    fetchCredits();
  }, [sessionStatus]);

  /* ---------------- Auto scroll ---------------- */
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

  /* ---------------- Actions ---------------- */
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
    <div className="min-h-screen bg-background flex flex-col p-4">
      {/* Header */}
      <header className="bg-card text-foreground shadow-sm rounded-xl mb-6 border border-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Mic className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Interview Copilot Console</h1>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sessionStatus === 'active'
                        ? 'bg-success animate-pulse'
                        : sessionStatus === 'session_found'
                        ? 'bg-warning animate-pulse'
                        : 'bg-muted-foreground'
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {sessionStatus === 'active'
                      ? 'Live - Receiving Data'
                      : sessionStatus === 'session_found'
                      ? 'Session Found - Waiting for Data'
                      : 'Waiting for Session'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Connection banner */}
      {!connected && (
        <div className="bg-warning/10 border border-warning/20 px-4 py-3 rounded-xl mb-6">
          <div className="flex items-center justify-center gap-2 text-warning font-medium text-sm">
            <Info className="w-4 h-4" />
            Open meeting → Click extension → “Open Console”
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-1">
        {/* Transcript + Hints */}
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Tabs */}
          <div className="flex bg-card rounded-lg p-1 mb-4 border border-border">
            <button
              onClick={() => setActivePanel('transcript')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                activePanel === 'transcript'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Transcript ({transcripts.length})
            </button>

            <button
              onClick={() => setActivePanel('hints')}
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-all ${
                activePanel === 'hints'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Lightbulb className="w-4 h-4 inline mr-2" />
              AI Hints ({hints.length})
            </button>
          </div>

          {/* Content */}
          <div className="bg-card rounded-xl flex-1 overflow-hidden border border-border relative shadow-sm">
            {activePanel === 'transcript' && (
              <div
                ref={transcriptRef}
                onScroll={handleScroll}
                className="absolute inset-0 overflow-y-auto p-6"
              >
                {!finalizedText && transcripts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Mic className="w-8 h-8 opacity-50" />
                    </div>
                    <p className="font-medium">Listening for audio...</p>
                    <p className="text-sm opacity-70">Speak clearly to see transcription</p>
                  </div>
                ) : (
                  <p className="text-foreground leading-7 whitespace-pre-wrap text-lg">
                    {finalizedText ||
                      transcripts.map((t, i) => (
                        <span key={i} className="mr-1">
                          {t.text}
                        </span>
                      ))}
                  </p>
                )}

                {userScrolledUp && (
                  <button
                    className="sticky bottom-4 mx-auto bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2 shadow-lg hover:bg-primary/90 transition-all"
                    onClick={() => {
                      setUserScrolledUp(false);
                      transcriptRef.current!.scrollTop =
                        transcriptRef.current!.scrollHeight;
                    }}
                  >
                    <ArrowDown className="w-4 h-4" />
                    Jump to Latest
                  </button>
                )}
              </div>
            )}

            {activePanel === 'hints' && (
              <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                {loading && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground animate-pulse">
                    <Sparkles className="w-5 h-5 mr-2" />
                    AI is analyzing...
                  </div>
                )}

                {!loading && hints.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                            <Lightbulb className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="font-medium">No hints yet</p>
                        <p className="text-sm opacity-70">Ask for help or wait for AI insights</p>
                    </div>
                )}

                {!loading &&
                  hints.map((h, i) => (
                    <div
                      key={i}
                      className="bg-muted/30 border border-border rounded-lg p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Insight</span>
                        <span className="text-xs text-muted-foreground">{h.timestamp}</span>
                      </div>
                      <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {h.hint || h.text}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6 min-w-[300px]">
          {/* Quick Actions */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
              Quick Actions
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => requestHint('help')}
                disabled={!connected || loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-lg font-semibold text-foreground bg-background border border-input hover:bg-muted hover:border-primary/30 transition-all shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5 text-amber-500" /> 
                <span>Help Me</span>
              </button>

              <button
                onClick={() => requestHint('answer')}
                disabled={!connected || loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-lg font-bold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                <Sparkles className="w-5 h-5" /> 
                <span>Generate Answer</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => requestHint('code')}
                    disabled={!connected || loading}
                    className="flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-lg font-medium text-foreground bg-background border border-input hover:bg-muted transition-all shadow-sm disabled:opacity-50"
                >
                    <Code2 className="w-5 h-5 text-blue-500" />
                    <span>Code</span>
                </button>

                <button
                    onClick={() => requestHint('explain')}
                    disabled={!connected || loading}
                    className="flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-lg font-medium text-foreground bg-background border border-input hover:bg-muted transition-all shadow-sm disabled:opacity-50"
                >
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    <span>Explain</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Prompt */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
              Custom Prompt
            </h2>
            <textarea
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
              placeholder="Ask a specific question..."
              className="w-full h-24 text-sm bg-muted/50 border border-input rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none placeholder-muted-foreground"
            />
            <button
              onClick={handleQuickPrompt}
              disabled={!connected || loading}
              className="w-full mt-3 bg-primary text-primary-foreground font-bold py-3 rounded-lg hover:bg-primary/90 transition-all shadow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>Send Request</span>
            </button>
          </div>

          {/* Credits */}
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium text-muted-foreground">Available Credits</span>
            <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold text-foreground">{credits}</span>
                <span className="text-xs text-muted-foreground">left</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
