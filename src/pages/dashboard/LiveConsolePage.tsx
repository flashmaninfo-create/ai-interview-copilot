import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useConsoleSync } from '../../hooks/useConsoleSync';
import { creditService } from '../../lib/services/creditService';
import { supabase } from '../../lib/supabase';
import ReactMarkdown from 'react-markdown';
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
  Loader2,
  CheckCircle,
  X,
  Copy,
  RotateCcw
} from 'lucide-react';

// Screenshot type from backend
interface Screenshot {
  id: string;
  image_url: string;
  display_order: number;
  is_marked_important: boolean;
  is_selected_for_ai: boolean;
  capture_method: string;
  created_at: string;
}

export function LiveConsolePage() {
  const {
    connected,
    transcripts,
    finalizedText,
    hints,
    // screenshots, -- removed to avoid redeclaration
    sessionStatus,
    sessionId,
    lastScreenshotEvent,
    sendCommand
  } = useConsoleSync();


  /* ---------------- State ---------------- */
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [_credits, setCredits] = useState<number>(0);

  // Screenshot gallery state
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [snapPopoverOpen, setSnapPopoverOpen] = useState(false);
  const popoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeTab] = useState('hints');

  // Screenshot capture state
  const [isCapturing, setIsCapturing] = useState(false);

  // Reset capturing state when a new screenshot arrives
  useEffect(() => {
    if (lastScreenshotEvent?.type === 'ADDED') {
      setIsCapturing(false);
    }
  }, [lastScreenshotEvent]);

  // Timeout safety for capturing state
  useEffect(() => {
    if (isCapturing) {
      const timer = setTimeout(() => setIsCapturing(false), 8000); // 8s timeout
      return () => clearTimeout(timer);
    }
  }, [isCapturing]);

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


  /* ---------------- Fetch Screenshots ---------------- */
  const fetchScreenshots = async () => {
    if (!sessionId) return;

    try {
      console.log('[LiveConsolePage] Fetching screenshots for session:', sessionId);
      const { data, error } = await supabase.rpc('get_session_screenshots', {
        p_session_id: sessionId
      });
      if (!error && data?.screenshots) {
        console.log('[LiveConsolePage] Fetched', data.screenshots.length, 'screenshots');
        setScreenshots(data.screenshots || []);
      }
    } catch (err) {
      console.error('Failed to fetch screenshots:', err);
    }
  };

  // Helper to get active session ID (for actions that need it)
  const getActiveSessionId = async (): Promise<string | null> => {
    // Prefer sessionId from hook, fallback to DB query
    if (sessionId) return sessionId;

    try {
      const { data } = await supabase
        .from('interview_sessions')
        .select('id')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      return data?.id || null;
    } catch {
      return null;
    }
  };

  // Fetch screenshots when session becomes active or sessionId changes
  useEffect(() => {
    if (sessionStatus === 'active' && sessionId) {
      fetchScreenshots();
    }
  }, [sessionStatus, sessionId]);

  // Handle realtime screenshot events
  useEffect(() => {
    if (!lastScreenshotEvent) return;
    console.log('[LiveConsolePage] 📸 Received screenshot event:', lastScreenshotEvent);

    if (lastScreenshotEvent.type === 'ADDED') {
      const rawScreenshot = lastScreenshotEvent.data;
      // Normalize screenshot data to match expected interface
      // Ensure we have a unique ID (fallback to random if backend returns null)
      const uniqueId = rawScreenshot.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newScreenshot: Screenshot = {
        id: uniqueId,
        image_url: rawScreenshot.image_url || rawScreenshot.url,
        display_order: rawScreenshot.display_order || 0,
        is_marked_important: rawScreenshot.is_marked_important ?? false,
        is_selected_for_ai: rawScreenshot.is_selected_for_ai ?? true, // Default: auto-select for AI
        capture_method: rawScreenshot.capture_method || 'dom',
        created_at: rawScreenshot.created_at || new Date().toISOString()
      };

      console.log('[LiveConsolePage] Adding screenshot:', newScreenshot.id);

      setScreenshots(prev => {
        // Strict deduplication only works if we have real IDs. 
        // If we generated a temp ID, we assume it's new.
        if (rawScreenshot.id && prev.some(s => s.id === rawScreenshot.id)) {
          console.warn('[LiveConsolePage] Duplicate screenshot ID ignored:', rawScreenshot.id);
          return prev;
        }
        return [newScreenshot, ...prev];
      });
    } else if (lastScreenshotEvent.type === 'DELETED') {
      const { screenshotId } = lastScreenshotEvent.data;
      setScreenshots(prev => prev.filter(s => s.id !== screenshotId));
    } else if (lastScreenshotEvent.type === 'CLEARED') {
      setScreenshots([]);
    } else if (lastScreenshotEvent.type === 'SCREENSHOT_SELECTION_UPDATED') {
      const { screenshotId, isSelected } = lastScreenshotEvent.data;
      setScreenshots(prev => prev.map(s =>
        s.id === screenshotId ? { ...s, is_selected_for_ai: isSelected } : s
      ));
    } else if (lastScreenshotEvent.type === 'SCREENSHOT_ERROR') {
      const errorMsg = (lastScreenshotEvent as any).error || 'Unknown error';
      console.error('[LiveConsolePage] Screenshot failed:', errorMsg);
      setIsCapturing(false);
      // Optional: Show error toast/alert here
      alert(`Snapshot failed: ${errorMsg}`);
    }
  }, [lastScreenshotEvent]);

  // Debug: Log all sync messages to console
  useEffect(() => {
    if (lastScreenshotEvent) {
      console.log('[LiveConsole] Debug - Screenshot Event:', lastScreenshotEvent);
    }
  }, [lastScreenshotEvent]);

  /* ---------------- Screenshot Actions ---------------- */
  const toggleScreenshotSelection = async (id: string, currentValue: boolean) => {
    // Optimistic update
    setScreenshots(prev => prev.map(s =>
      s.id === id ? { ...s, is_selected_for_ai: !currentValue } : s
    ));

    try {
      // 1. Send Command to Extension for Overlay Sync
      await sendCommand('TOGGLE_SCREENSHOT_SELECTION', {
        screenshotId: id,
        isSelected: !currentValue
      });

      // 2. Persist to DB
      await supabase.rpc('update_screenshot_metadata', {
        p_screenshot_id: id,
        p_is_selected_for_ai: !currentValue
      });
    } catch (err) {
      // Revert on error
      setScreenshots(prev => prev.map(s =>
        s.id === id ? { ...s, is_selected_for_ai: currentValue } : s
      ));
    }
  };

  const deleteScreenshot = async (id: string) => {
    // Optimistic update
    setScreenshots(prev => prev.filter(s => s.id !== id));

    try {
      await supabase.rpc('delete_session_screenshot', {
        p_screenshot_id: id
      });
    } catch (err) {
      // Refetch on error
      fetchScreenshots();
    }
  };

  const clearAllScreenshots = async () => {
    const sessionId = await getActiveSessionId();
    if (!sessionId) return;

    setScreenshots([]);
    try {
      await supabase.rpc('clear_session_screenshots', {
        p_session_id: sessionId
      });
      // Notify extension to sync the clear action
      sendCommand('CLEAR_SCREENSHOTS', { sessionId });
    } catch (err) {
      fetchScreenshots();
    }
  };

  const requestHint = async (type: string) => {
    console.log('[LiveConsolePage] requestHint called with type:', type);
    console.log('[LiveConsolePage] sessionStatus:', sessionStatus, 'connected:', connected, 'sessionId:', sessionId);
    setLoading(true);

    // Get selected screenshots
    const selectedScreenshots = screenshots.filter(s => s.is_selected_for_ai);

    await sendCommand('REQUEST_HINT', {
      requestType: type,
      trigger: 'manual',
      // Attach screenshots if any are selected
      screenshots: selectedScreenshots.length > 0 ? selectedScreenshots.map(s => ({
        id: s.id,
        imageUrl: s.image_url,
        order: s.display_order
      })) : undefined
    });

    setTimeout(() => setLoading(false), 3000);
  };

  const handleQuickPrompt = async () => {
    if (!quickPrompt.trim()) return;

    setLoading(true);

    // Get selected screenshots
    const selectedScreenshots = screenshots.filter(s => s.is_selected_for_ai);

    await sendCommand('REQUEST_HINT', {
      requestType: 'custom',
      trigger: 'manual',
      customPrompt: quickPrompt,
      // Attach screenshots if any are selected
      screenshots: selectedScreenshots.length > 0 ? selectedScreenshots.map(s => ({
        id: s.id,
        imageUrl: s.image_url,
        order: s.display_order
      })) : undefined
    });

    setQuickPrompt('');
    setTimeout(() => setLoading(false), 3000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const selectedCount = screenshots.filter(s => s.is_selected_for_ai).length;

  return (
    <div className="h-screen overflow-hidden bg-[#242424] text-white flex">
      {/* Left Sidebar - Matching Overlay Buttons */}
      <div className="w-20 bg-[#242424] border-r border-white/10 flex flex-col items-center pt-20 pb-6 gap-4">
        {/* Help Button */}
        <button
          onClick={() => requestHint('help')}
          disabled={!(connected || sessionStatus === 'session_found' || sessionStatus === 'active') || loading}
          className="w-14 h-14 rounded-xl bg-[#2a2f48] hover:bg-[#3a3f58] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <Sparkles className="w-5 h-5 text-gray-400" />
          <span className="text-[10px] text-gray-500">Help</span>
        </button>

        {/* Answer Button - Orange accent like overlay */}
        <button
          onClick={() => requestHint('answer')}
          disabled={!(connected || sessionStatus === 'session_found' || sessionStatus === 'active') || loading}
          className="w-14 h-14 rounded-xl bg-[#ff6b35]/20 border border-[#ff6b35]/30 hover:bg-[#ff6b35]/30 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <MessageSquare className="w-5 h-5 text-[#ff6b35]" />
          <span className="text-[10px] text-[#ff6b35]/80">Answer</span>
        </button>

        {/* Code Button - Blue */}
        <button
          onClick={() => requestHint('code')}
          disabled={!(connected || sessionStatus === 'session_found' || sessionStatus === 'active') || loading}
          className="w-14 h-14 rounded-xl bg-blue-500 hover:bg-blue-600 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <Code2 className="w-5 h-5 text-white" />
          <span className="text-[10px] text-white/80">Code</span>
        </button>

        {/* Explain Button - Purple */}
        <button
          onClick={() => requestHint('explain')}
          disabled={!(connected || sessionStatus === 'session_found' || sessionStatus === 'active') || loading}
          className="w-14 h-14 rounded-xl bg-purple-500 hover:bg-purple-600 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
        >
          <BookOpen className="w-5 h-5 text-white" />
          <span className="text-[10px] text-white/80">Explain</span>
        </button>

        {/* Screen/Snap Button - Orange with Horizontal Popover */}
        <div
          className="relative"
          onMouseEnter={() => {
            if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
            setSnapPopoverOpen(true);
          }}
          onMouseLeave={() => {
            popoverTimeoutRef.current = setTimeout(() => setSnapPopoverOpen(false), 300);
          }}
        >
          <button
            onClick={() => {
              if (isCapturing) return;
              setIsCapturing(true);

              // Optimistic UI feedback
              const btn = document.activeElement as HTMLButtonElement;
              if (btn) {
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = '', 150);
              }
              sendCommand('TAKE_SCREENSHOT', { trigger: 'console' });
            }}
            disabled={!connected || loading || isCapturing}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 relative shadow-lg ${isCapturing ? 'bg-gray-600 cursor-wait' : 'bg-[#ff6b35] hover:bg-[#ff8c42] shadow-[#ff6b35]/20'
              }`}
          >
            {isCapturing ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-white" />
            )}
            <span className="text-[10px] text-white/80">{isCapturing ? 'Snapping' : 'Snap'}</span>
            {!isCapturing && screenshots.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#242424]">
                {screenshots.length}
              </span>
            )}
          </button>

          {/* Horizontal Screenshot Popover - Right of Snap button */}
          {snapPopoverOpen && (
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 flex items-center z-50"
              onMouseEnter={() => {
                if (popoverTimeoutRef.current) clearTimeout(popoverTimeoutRef.current);
              }}
              onMouseLeave={() => {
                popoverTimeoutRef.current = setTimeout(() => setSnapPopoverOpen(false), 300);
              }}
            >
              {/* Invisible bridge to maintain hover between button and popover */}
              <div className="w-2 h-14 bg-transparent" />

              {/* Actual popover content */}
              <div className="bg-slate-900/95 border border-[#ff6b35]/30 rounded-xl p-3 min-w-[180px] max-w-[450px] shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                  <span className="text-white text-[11px] font-semibold whitespace-nowrap">
                    {screenshots.length} Screenshots
                  </span>
                  {screenshots.length > 0 && (
                    <button
                      onClick={clearAllScreenshots}
                      className="text-red-400 hover:text-red-300 text-[10px] px-2"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Thumbnails - Horizontal scroll */}
                {screenshots.length > 0 ? (
                  <div className="flex flex-row flex-nowrap gap-2 overflow-x-auto pb-1 max-w-[380px]">
                    {screenshots.map((s) => {
                      if (!s) return null;
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggleScreenshotSelection(s.id, s.is_selected_for_ai)}
                          className={`relative w-12 h-12 shrink-0 rounded-lg overflow-hidden group cursor-pointer border-2 transition-all ${s.is_selected_for_ai
                            ? 'border-green-500 ring-1 ring-green-500/50'
                            : 'border-white/10 hover:border-white/30'
                            }`}
                        >
                          <img src={s.image_url || ''} alt="Snap" className="w-full h-full object-cover pointer-events-none" />
                          {s.is_selected_for_ai && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none">
                              <CheckCircle className="w-4 h-4 text-white drop-shadow-md" />
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteScreenshot(s.id); }}
                            className="absolute top-0 right-0 bg-black/60 hover:bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-gray-400 text-[10px] text-center py-3 whitespace-nowrap">
                    No screenshots yet. Click <strong>Snap</strong> to capture.
                  </div>
                )}

                {/* Hint */}
                {screenshots.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/10 text-gray-400 text-[9px] whitespace-nowrap">
                    💡 Select screenshots for AI context
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Gallery Toggle Button */}


        {/* Code for Me Button REMOVED */}
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
        <div className={`flex-1 ${(!finalizedText && transcripts.length === 0 && sessionStatus !== 'active' && sessionStatus !== 'session_found') ? 'overflow-auto p-6' : 'overflow-hidden flex flex-col'}`}>
          {/* Show guide only if NO session is connected/found and no data */}
          {!finalizedText && transcripts.length === 0 && sessionStatus !== 'active' && sessionStatus !== 'session_found' ? (
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

                <div className="flex-1 overflow-y-auto p-4 scrollbar-dark">
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

                      {!loading && Array.isArray(hints) && hints.map((h, i) => {
                        if (!h) return null;
                        const hintText = h.hint || h.text || '';
                        const modelName = h.model || h.provider || 'AI';
                        const modeColors: Record<string, string> = {
                          code: 'bg-blue-500/20 text-blue-400',
                          explain: 'bg-purple-500/20 text-purple-400',
                          help: 'bg-amber-500/20 text-amber-400',
                          answer: 'bg-emerald-500/20 text-emerald-400',
                          custom: 'bg-gray-500/20 text-gray-400'
                        };
                        const modeColor = modeColors[h.type] || modeColors.help;

                        return (
                          <div key={h.id || i} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden mb-4">
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${modeColor}`}>
                                  {h.type || 'help'}
                                </span>
                                <span className="text-xs text-gray-500">{modelName}</span>
                              </div>
                              <span className="text-[10px] text-gray-500">{h.timestamp}</span>
                            </div>

                            {/* Content with Markdown */}
                            <div className="p-4 prose prose-invert prose-sm max-w-none 
                              prose-headings:text-white prose-headings:font-semibold
                              prose-p:text-gray-300 prose-p:leading-relaxed
                              prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-amber-400 prose-code:font-mono prose-code:text-sm
                              prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg
                              prose-ul:text-gray-300 prose-li:text-gray-300
                              prose-strong:text-white">
                              <ReactMarkdown>{hintText}</ReactMarkdown>
                            </div>

                            {/* Action Footer */}
                            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/10 bg-white/[0.02]">
                              <button
                                onClick={() => navigator.clipboard.writeText(hintText)}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </button>
                              <button
                                onClick={() => requestHint(h.type || 'help')}
                                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
                              >
                                <RotateCcw className="w-3 h-3" /> Retry
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {screenshots.length > 0 && (
                  <div className="px-4 py-2 border-t border-white/10 shrink-0 bg-[#1f1f1f]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Screenshots ({screenshots.length})</span>
                      {selectedCount > 0 && (
                        <button onClick={clearAllScreenshots} className="text-[10px] text-red-400 hover:text-red-300">Clear All</button>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {screenshots.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => toggleScreenshotSelection(s.id, s.is_selected_for_ai)}
                          className={`relative w-14 h-14 shrink-0 rounded-lg overflow-hidden group cursor-pointer border-2 transition-all ${s.is_selected_for_ai
                            ? 'border-green-500 opacity-100 ring-1 ring-green-500/50'
                            : 'border-white/10 hover:border-white/30 opacity-80 hover:opacity-100'
                            }`}
                        >
                          <img src={s.image_url} alt="Snap" className="w-full h-full object-cover pointer-events-none" />

                          {/* Selection Indicator */}
                          {s.is_selected_for_ai && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none">
                              <CheckCircle className="w-6 h-6 text-white drop-shadow-md" />
                            </div>
                          )}

                          {/* Remove Button (Hover) */}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteScreenshot(s.id); }}
                            className="absolute top-0 right-0 bg-black/60 hover:bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                  className="flex-1 overflow-y-auto p-4 scrollbar-dark"
                >
                  {!finalizedText && transcripts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Mic className="w-8 h-8 mb-3 opacity-50" />
                      <p className="text-sm font-medium">Listening...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Render finalized text with speaker splitting */}
                      {
                        typeof finalizedText === 'string' && finalizedText.split('\n').map((line, i) => {
                          if (!line.trim()) return null;

                          const isUser = line.includes('**You:**');
                          const isInterviewer = line.includes('**Interviewer:**');

                          // Strip the markdown label for cleaner display
                          const content = line.replace(/\*\*You:\*\*\s*/, '').replace(/\*\*Interviewer:\*\*\s*/, '');

                          // Default class
                          let containerClass = "p-3 rounded-lg border border-transparent";
                          let labelClass = "text-xs font-bold uppercase mb-1 block opacity-70";
                          let labelText = "";

                          if (isUser) {
                            containerClass = "bg-emerald-500/10 border-emerald-500/20 ml-8";
                            labelClass += " text-emerald-400";
                            labelText = "You";
                          } else if (isInterviewer) {
                            containerClass = "bg-blue-500/10 border-blue-500/20 mr-8";
                            labelClass += " text-blue-400";
                            labelText = "Interviewer";
                          } else {
                            // Generic/System or continuation
                            containerClass = "text-gray-300";
                          }

                          if (!isUser && !isInterviewer) {
                            return <p key={i} className="mb-2 text-gray-300">{line}</p>;
                          }

                          return (
                            <div key={i} className={containerClass}>
                              <span className={labelClass}>{labelText}</span>
                              <p className="text-white text-sm leading-relaxed">{content}</p>
                            </div>
                          );
                        })
                      }

                      {/* Interim parts */}
                      {!finalizedText && Array.isArray(transcripts) &&
                        transcripts.map((t, i) => (
                          <div key={`interim-${i}`} className="text-gray-500 italic text-sm animate-pulse ml-4">
                            {t.text}
                          </div>
                        ))}
                    </div>
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

      {/* Screenshot Gallery Panel - Slides in from right */}


    </div >
  );
}
