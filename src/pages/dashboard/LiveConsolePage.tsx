import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useConsoleSync } from '../../hooks/useConsoleSync';

import {
  Mic,
  Lightbulb,
  Sparkles,
  Code2,
  BookOpen,
  ArrowDown,
  ArrowLeft,
  Camera,
  MessageSquare,
  RefreshCw,
  Send,
  X,
  Loader2
} from 'lucide-react';

export function LiveConsolePage() {
  const {
    connected,
    transcripts,
    finalizedText,
    hints,
    screenshots,
    sessionStatus,
    sendCommand
  } = useConsoleSync();

  /* ---------------- State ---------------- */
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'hints' | 'screenshots'>('hints');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);


  /* ---------------- Fetch Credits (Unused) ---------------- */
  /*
  const [credits, setCredits] = useState<number>(0);

  useEffect(() => {
    const fetchCredits = async () => {
      const result = await creditService.getBalance();
      if (result.success && result.data) {
        setCredits(result.data.balance);
      }
    };
    fetchCredits();
    const interval = setInterval(fetchCredits, 30000);
    return () => clearInterval(interval);
  }, []);
  */

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

    await sendCommand('REQUEST_HINT', {
      requestType: type,
      trigger: 'manual'
    });

    setTimeout(() => setLoading(false), 3000);
  };

  const handleQuickPrompt = async () => {
    if (!quickPrompt.trim()) return;

    setLoading(true);

    await sendCommand('REQUEST_HINT', {
      requestType: 'custom',
      prompt: quickPrompt,
      trigger: 'manual'
    });

    setQuickPrompt('');
    setTimeout(() => setLoading(false), 3000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="h-screen overflow-hidden bg-[#242424] text-white flex">
      {/* Left Sidebar - Matching Overlay Buttons */}
      <div className="w-20 bg-[#242424] border-r border-white/10 flex flex-col items-center pt-20 pb-6 gap-4">
        {/* Help Button */}
        <button
          onClick={() => requestHint('help')}
          disabled={!connected || loading}
          className="w-14 h-14 rounded-xl bg-[#2a2f48] hover:bg-[#3a3f58] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5 text-gray-400" />
          <span className="text-[10px] text-gray-500">Help</span>
        </button>

        {/* Answer Button - Orange accent like overlay */}
        <button
          onClick={() => requestHint('answer')}
          disabled={!connected || loading}
          className="w-14 h-14 rounded-xl bg-[#ff6b35]/20 border border-[#ff6b35]/30 hover:bg-[#ff6b35]/30 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <MessageSquare className="w-5 h-5 text-[#ff6b35]" />
          <span className="text-[10px] text-[#ff6b35]/80">Answer</span>
        </button>

        {/* Code Button - Blue */}
        <button
          onClick={() => requestHint('code')}
          disabled={!connected || loading}
          className="w-14 h-14 rounded-xl bg-blue-500 hover:bg-blue-600 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <Code2 className="w-5 h-5 text-white" />
          <span className="text-[10px] text-white/80">Code</span>
        </button>

        {/* Explain Button - Purple */}
        <button
          onClick={() => requestHint('explain')}
          disabled={!connected || loading}
          className="w-14 h-14 rounded-xl bg-purple-500 hover:bg-purple-600 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <BookOpen className="w-5 h-5 text-white" />
          <span className="text-[10px] text-white/80">Explain</span>
        </button>

        {/* Screen/Snap Button - Orange */}
        <button
          onClick={() => {
            sendCommand('TAKE_SCREENSHOT', { trigger: 'console' });
          }}
          disabled={!connected || loading}
          className="w-14 h-14 rounded-xl bg-[#ff6b35] hover:bg-[#ff8c42] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <Camera className="w-5 h-5 text-white" />
          <span className="text-[10px] text-white/80">Snap</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 flex items-center justify-center border-b border-white/10 relative">
          <Link
            to="/dashboard"
            className="absolute left-6 p-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦊</span>
            <h1 className="text-2xl font-bold text-[#ff6b35]">Stealth Console</h1>
          </div>
        </header>


        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${sessionStatus === 'active'
              ? 'bg-green-500 animate-pulse'
              : sessionStatus === 'session_found'
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
              }`} />
            <span className="text-gray-300">
              Started meeting : <strong className="text-white">
                {sessionStatus === 'active'
                  ? 'Interview in progress'
                  : sessionStatus === 'session_found'
                    ? 'Session found - Waiting'
                    : 'No started interview.'}
              </strong>
            </span>
            <button
              onClick={handleRefresh}
              className="text-[#ff6b35] hover:text-[#ff8c42] text-sm font-medium ml-2 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className={`flex-1 ${(!finalizedText && transcripts.length === 0) ? 'overflow-auto p-6' : 'overflow-hidden flex flex-col'}`}>
          {/* Show guide until transcription data arrives */}
          {!finalizedText && transcripts.length === 0 ? (
            <div className="space-y-6">
              {/* How to connect */}
              <div>
                <h2 className="flex items-center gap-2 text-white font-medium mb-4">
                  <span className="text-green-500">✓</span>
                  How to connect the meeting?
                </h2>
                <div className="space-y-3 ml-6 text-gray-300 text-sm">
                  <p>① Click our Chrome extension icon in the meeting page, before "Ask to Join".</p>
                  <p>② Click "Connect" from our extension page.</p>
                  <p>③ Select "Entire Screen" and click "Share".</p>
                  <p>④ (<span className="text-[#ff6b35]">🔥 NOTE!</span>) Hide the screen-sharing widget.</p>

                  <div className="my-4 ml-4">
                    <div className="inline-flex items-center gap-2 bg-white/10 border border-[#ff6b35] rounded-lg px-3 py-2 text-sm">
                      <span className="w-2 h-2 bg-[#ff6b35] rounded-sm"></span>
                      <span className="text-white">www.xtroon.io is sharing your screen.</span>
                      <button className="bg-white/20 text-white px-3 py-1 rounded text-xs">Stop sharing</button>
                      <button className="bg-[#ff6b35] text-white px-3 py-1 rounded text-xs">Hide</button>
                    </div>
                  </div>

                  <p>⑤ Now ready to go. Ask to join!</p>
                </div>
              </div>

              {/* Feature Descriptions */}
              <div className="space-y-4 mt-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Code2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-white font-medium">Code</span>
                  <span className="text-gray-400">: Get the best code solution.</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-white font-medium">Explain</span>
                  <span className="text-gray-400">: Crack "How to modify this code to use Array?"-like sudden questions.</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-white font-medium">Help Me</span>
                  <span className="text-gray-400">: Trigger AI hint to crush tricky interview question.</span>
                </div>
              </div>
            </div>
          ) : (
            /* Transcript/Hints View - shown once transcription data arrives */
            /* Transcript/Hints View - Side-by-Side */
            <div className="flex-1 min-h-0 flex">

              {/* AI Assistance Column - Flexible Rest Width (Left) */}
              <div className="flex-1 bg-[#1f1f1f] border-r border-white/5 flex flex-col relative">

                {/* Tabs */}
                <div className="flex items-center px-4 pt-4 pb-2 gap-4 border-b border-white/5">
                  <button
                    onClick={() => setActiveTab('hints')}
                    className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'hints'
                      ? 'text-white border-[#ff6b35]'
                      : 'text-gray-400 border-transparent hover:text-gray-300'
                      }`}
                  >
                    Hints ({hints.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('screenshots')}
                    className={`text-sm font-medium pb-2 border-b-2 transition-colors ${activeTab === 'screenshots'
                      ? 'text-white border-[#ff6b35]'
                      : 'text-gray-400 border-transparent hover:text-gray-300'
                      }`}
                  >
                    Screenshots ({screenshots.length})
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {loading && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-5 mb-4 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                          <Loader2 className="w-4 h-4 text-[#ff6b35] animate-spin" />
                        </div>
                        <div className="text-gray-300 text-sm">
                          AI is analyzing...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* HINTS TAB */}
                  {activeTab === 'hints' && (
                    <>
                      {!loading && hints.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <Lightbulb className="w-12 h-12 mb-4 opacity-50" />
                          <p className="font-medium">No hints yet</p>
                          <p className="text-sm opacity-70">Ask for help or wait for AI insights</p>
                        </div>
                      )}

                      {!loading && hints.map((h, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-5 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Insight</span>
                            <span className="text-xs text-gray-500">{h.timestamp}</span>
                          </div>
                          <div className="text-white whitespace-pre-wrap leading-relaxed">
                            {h.hint || h.text}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* SCREENSHOTS TAB */}
                  {activeTab === 'screenshots' && (
                    <>
                      {screenshots.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <Camera className="w-12 h-12 mb-4 opacity-50" />
                          <p className="font-medium">No screenshots yet</p>
                          <p className="text-sm opacity-70">Use the 'Snap' button to capture</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        {screenshots.map((s, i) => (
                          <div
                            key={i}
                            className="group relative aspect-video bg-black rounded-lg overflow-hidden border border-white/10 hover:border-[#ff6b35] transition-colors cursor-pointer"
                            onClick={() => setSelectedImage(s.url)}
                          >
                            <img
                              src={s.url}
                              alt={`Screenshot ${i}`}
                              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[10px] text-gray-300 backdrop-blur-sm">
                              {new Date(Number(s.timestamp || Date.now())).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Quick Prompt Box - Persistent at Bottom */}
                <div className="p-4 border-t border-white/10 shrink-0 flex justify-center bg-[#1f1f1f]">
                  <div className="flex gap-2 w-full max-w-md">
                    <input
                      type="text"
                      value={quickPrompt}
                      onChange={(e) => setQuickPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleQuickPrompt()}
                      placeholder="Ask AI anything..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff6b35] transition-colors"
                    />
                    <button
                      onClick={handleQuickPrompt}
                      disabled={loading || !quickPrompt.trim()}
                      className="bg-[#ff6b35] hover:bg-[#ff8c42] disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Transcript Column - 30% + 50px Width (Right) */}
              <div className="w-[calc(30%+50px)] bg-[#1a1a1a] border-l border-white/5 flex flex-col relative">
                <div
                  ref={transcriptRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4"
                >
                  {!finalizedText && transcripts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Mic className="w-8 h-8 mb-3 opacity-50" />
                      <p className="text-sm font-medium">Listening...</p>
                    </div>
                  ) : (
                    <p className="text-white leading-7 whitespace-pre-wrap text-base font-mono">
                      {finalizedText ||
                        transcripts.map((t, i) => (
                          <span key={i} className="mr-1">{t.text}</span>
                        ))}
                    </p>
                  )}
                </div>
                {userScrolledUp && (
                  <button
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#ff6b35] text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg hover:bg-[#ff8c42] transition-all"
                    onClick={() => {
                      setUserScrolledUp(false);
                      transcriptRef.current!.scrollTop = transcriptRef.current!.scrollHeight;
                    }}
                  >
                    <ArrowDown className="w-3 h-3" />
                    Jump to Latest
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={selectedImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

    </div>
  );
}
