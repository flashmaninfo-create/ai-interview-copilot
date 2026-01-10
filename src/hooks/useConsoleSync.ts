import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Types
export interface Transcript {
    id: number | string;
    text: string;
    timestamp: string;
    speaker?: 'user' | 'interviewer';
    confidence?: number;
    isFinal?: boolean;
}

export interface Hint {
    id: number | string;
    type: 'hint' | 'code' | 'explain' | 'error';
    text: string;
    timestamp: string;
    hint?: string; // Legacy support
}

export interface Screenshot {
    id: number | string;
    url: string;
    timestamp: string;
}

export interface SyncMessage {
    id: string;
    session_id: string;
    message_type: string;
    payload: any;
    source: 'extension' | 'console';
    created_at: string;
}

export type SessionStatus = 'waiting' | 'session_found' | 'active' | 'disconnected';

export function useConsoleSync() {
    const [connected, setConnected] = useState(false);
    const [transcripts, setTranscripts] = useState<Transcript[]>([]);
    const [hints, setHints] = useState<Hint[]>([]);
    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>('waiting');
    const [token, setToken] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [lastActivity, setLastActivity] = useState<number | null>(null);
    const [hasReceivedData, setHasReceivedData] = useState(false);

    // Smooth transcription state (append-only)
    const [finalizedText, setFinalizedText] = useState('');

    // Track if we've received any real data from extension
    const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousSessionIdRef = useRef<string | null>(null);

    useEffect(() => {
        console.log('[useConsoleSync] Hook mounted. Checking for session...');

        // Clear all data on mount to ensure fresh state
        setTranscripts([]);
        setFinalizedText('');
        setHints([]);
        setConnected(false);
        setSessionStatus('waiting');

        // 1. Check for token in URL (Legacy/Manual method)
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('token');
        const urlSessionId = params.get('sessionId');

        if (urlToken) {
            console.log('[useConsoleSync] Found manual token in URL');
            setToken(urlToken);
            setSessionId(urlSessionId);
        }

        // Fetch existing data from sync_messages for a session (transcripts, hints)
        const fetchExistingData = async (sid: string) => {
            console.log('[useConsoleSync] Fetching existing data for session:', sid);
            try {
                const { data, error } = await supabase
                    .from('sync_messages')
                    .select('*')
                    .eq('session_id', sid)
                    .eq('source', 'extension')
                    .order('created_at', { ascending: true });

                if (error) {
                    console.error('[useConsoleSync] Error fetching existing data:', error);
                    return;
                }

                if (data && data.length > 0) {
                    console.log('[useConsoleSync] Found', data.length, 'existing messages');

                    let accumulatedText = '';
                    const existingTranscripts: Transcript[] = [];
                    const existingHints: Hint[] = [];

                    for (const msg of data) {
                        if (msg.message_type === 'TRANSCRIPTION_STATE' && msg.payload) {
                            if (msg.payload.finalizedText) {
                                accumulatedText = msg.payload.finalizedText;
                            }
                            if (msg.payload.isFinal && msg.payload.text) {
                                existingTranscripts.push({
                                    text: msg.payload.text,
                                    id: msg.id || Date.now(),
                                    timestamp: new Date(msg.created_at).toLocaleTimeString(),
                                    confidence: msg.payload.confidence
                                });
                            }
                        }
                        if (msg.message_type === 'TRANSCRIPTION' && msg.payload) {
                            existingTranscripts.push({
                                ...msg.payload,
                                id: msg.payload.id || msg.id || Date.now(),
                                timestamp: new Date(msg.created_at).toLocaleTimeString()
                            });
                        }
                        if ((msg.message_type === 'HINT_RECEIVED' || msg.message_type === 'EXTENSION_HINT') && msg.payload) {
                            existingHints.push(msg.payload);
                        }
                    }

                    if (accumulatedText) {
                        setFinalizedText(accumulatedText);
                        setHasReceivedData(true);
                        setSessionStatus('active');
                    }
                    if (existingTranscripts.length > 0) {
                        setTranscripts(existingTranscripts);
                        setHasReceivedData(true);
                        setSessionStatus('active');
                    }
                    if (existingHints.length > 0) {
                        setHints(existingHints.reverse()); // Most recent first
                    }

                    console.log('[useConsoleSync] Loaded existing data - transcripts:', existingTranscripts.length, 'hints:', existingHints.length);
                }
            } catch (err) {
                console.error('[useConsoleSync] fetchExistingData error:', err);
            }
        };

        // 2. Automatic Session Discovery (no user_id filter to avoid auth mismatch)
        const checkActiveSession = async () => {
            console.log('[useConsoleSync] Checking for active sessions...');
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                console.log('[useConsoleSync] No authenticated user, checking for any very recent session...');
            } else {
                console.log('[useConsoleSync] User found:', user.email);
            }

            // Query for any very recent active session (within last 24 hours to be safe)
            // Don't filter by user_id to avoid extension/console auth mismatch
            const tenMinutesAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

            console.log('[useConsoleSync] Querying for sessions started after:', tenMinutesAgo);
            const { data, error } = await supabase
                .from('interview_sessions')
                .select('id, console_token, status, started_at, user_id')
                .eq('status', 'active')
                .gte('started_at', tenMinutesAgo)
                .order('started_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('[useConsoleSync] DB Query Error:', error);
                setSessionStatus('waiting');
                setConnected(false);
                return;
            }

            console.log('[useConsoleSync] Query returned:', data);

            if (data && data.length > 0) {
                const session = data[0];
                console.log('[useConsoleSync] FOUND ACTIVE SESSION:', session);

                // Check if this is a different session than before
                const isNewSession = previousSessionIdRef.current !== session.id;
                if (isNewSession) {
                    console.log('[useConsoleSync] New session detected, clearing old data');
                    // Clear old data before loading new session data
                    setTranscripts([]);
                    setFinalizedText('');
                    setHints([]);
                    previousSessionIdRef.current = session.id;
                    setHasReceivedData(false);
                }

                if (!urlToken) {
                    console.log('[useConsoleSync] Auto-connecting to session:', session.id);
                    setSessionId(session.id);
                    setToken(session.console_token);
                    setConnected(true); // Set connected immediately so buttons work

                    // Only update status if we're not already receiving data
                    // This prevents flickering from 'active' back to 'session_found'
                    setSessionStatus(prev => {
                        if (prev === 'active') return 'active'; // Don't downgrade
                        return 'session_found';
                    });

                    // Only fetch existing data for NEW sessions
                    if (isNewSession) {
                        fetchExistingData(session.id);
                    }
                }
            } else {
                console.log('[useConsoleSync] No recent active session found.');
                // Reset ALL state when no active session found
                setSessionStatus('waiting');
                setConnected(false);
                setHasReceivedData(false);
                setSessionId(null);
                setToken(null);
                // Clear transcripts and hints when session ends
                setTranscripts([]);
                setFinalizedText('');
                setHints([]);
                previousSessionIdRef.current = null;
            }
        };

        // Initial check
        checkActiveSession();

        // 3. Polling backup: Check every 1.5 seconds (faster detection)
        const pollInterval = setInterval(() => {
            console.log('[useConsoleSync] Polling for sessions...');
            checkActiveSession();
        }, 1500);

        // 4. Listen for NEW sessions and UPDATES (Realtime)
        console.log('[useConsoleSync] Subscribing to session changes...');
        const sessionChannel = supabase.channel('user-sessions')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'interview_sessions',
                    filter: `status=eq.active`
                },
                (payload: any) => {
                    console.log('[useConsoleSync] REALTIME: New session detected:', payload.new);
                    setSessionId(payload.new.id);
                    setToken(payload.new.console_token);
                    setSessionStatus('session_found');
                    setHasReceivedData(false);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'interview_sessions'
                },
                (payload: any) => {
                    // Check if this update is for our current session
                    if (sessionId && payload.new.id === sessionId) {
                        const newStatus = payload.new.status;
                        console.log('[useConsoleSync] REALTIME: Session status updated:', newStatus);

                        if (newStatus === 'completed' || newStatus === 'failed' || newStatus === 'cancelled') {
                            console.log('[useConsoleSync] Session ended via DB update');
                            setSessionStatus('disconnected');
                            setConnected(false);
                            // Optionally clear session ID after a delay or keep it to show "Session Ended" state
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('[useConsoleSync] Session channel status:', status);
            });

        return () => {
            console.log('[useConsoleSync] Cleaning up session channel');
            clearInterval(pollInterval);
            supabase.removeChannel(sessionChannel);
            if (activityTimeoutRef.current) {
                clearTimeout(activityTimeoutRef.current);
            }
        };

    }, [sessionId]);

    useEffect(() => {
        if (!sessionId) return;

        // Subscribe to Supabase Realtime for sync messages
        console.log('[useConsoleSync] Subscribing to sync_messages for session:', sessionId);

        const channel = supabase
            .channel('console-sync')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'sync_messages',
                    filter: `session_id=eq.${sessionId}`
                },
                (payload: any) => {
                    const { message_type: type, payload: data, source } = payload.new;
                    console.log('[useConsoleSync] Received:', type, 'from:', source);

                    // Update activity timestamp - this proves extension is alive
                    setLastActivity(Date.now());

                    // Only mark as active/connected when we receive data from extension
                    if (source === 'extension') {
                        setHasReceivedData(true);
                        setConnected(true);
                        setSessionStatus('active');
                    }

                    if (type === 'TRANSCRIPTION') {
                        setTranscripts(prev => [...prev, {
                            ...data,
                            id: data.id || Date.now(),
                            timestamp: new Date().toLocaleTimeString()
                        }]);
                    }

                    // Handle SESSION_ACTIVE heartbeat from extension
                    if (type === 'SESSION_ACTIVE') {
                        console.log('[useConsoleSync] Received SESSION_ACTIVE heartbeat');
                        setHasReceivedData(true);
                        setConnected(true);
                        setSessionStatus('active');
                    }

                    // New: Smooth transcription state (append-only)
                    if (type === 'TRANSCRIPTION_STATE') {
                        if (data.finalizedText) {
                            setFinalizedText(data.finalizedText);
                        }
                        if (data.isFinal && data.text) {
                            setTranscripts(prev => [...prev, {
                                text: data.text,
                                id: Date.now(),
                                timestamp: new Date().toLocaleTimeString(),
                                confidence: data.confidence
                            }]);
                        }
                    }
                    if (type === 'HINT_RECEIVED' || type === 'EXTENSION_HINT') {
                        // Add unique ID and deduplicate
                        const newHint = {
                            ...data,
                            id: data.id || payload.new.id || Date.now()
                        };
                        setHints(prev => {
                            // Prevent duplicates by checking existing ids
                            if (prev.some(h => h.id === newHint.id)) {
                                return prev;
                            }
                            return [newHint, ...prev];
                        });
                    }
                    if (type === 'SCREENSHOT_ADDED' || type === 'EXTENSION_SCREENSHOT') {
                        setScreenshots(prev => [data, ...prev]);
                    }
                }
            )
            .subscribe((status) => {
                console.log('[useConsoleSync] Sync channel status:', status);
                if (status === 'SUBSCRIBED') {
                    // Subscribed to channel, but waiting for actual data from extension
                    if (!hasReceivedData) {
                        setSessionStatus('session_found');
                    }
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId, hasReceivedData]);

    const sendCommand = useCallback(async (type: string, data: any) => {
        if (sessionId) {
            try {
                await supabase.from('sync_messages' as any).insert({ // Cast to any to avoid type error if table missing in schema
                    session_id: sessionId,
                    message_type: type,
                    payload: data,
                    source: 'console'
                });
            } catch (err) {
                console.error('[ConsoleSync] Failed to send command to Supabase:', err);
            }
        }
    }, [sessionId]);

    return {
        connected,
        sessionStatus, // 'waiting' | 'session_found' | 'active' | 'disconnected'
        transcripts,
        finalizedText,
        hints,
        screenshots,
        token,
        sessionId,
        lastActivity,
        hasReceivedData,
        sendCommand
    };
}
