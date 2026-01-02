import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { interviewService } from '../lib/services/interviewService';
import type { InterviewSession } from '../types/interview';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseSessionRealtimeReturn {
    session: InterviewSession | null;
    loading: boolean;
    error: Error | null;
}

/**
 * Hook to subscribe to real-time updates for a specific interview session.
 * Works across devices - Console and Extension will both receive updates.
 */
export function useSessionRealtime(sessionId: string | undefined): UseSessionRealtimeReturn {
    const [session, setSession] = useState<InterviewSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }

        // Initial fetch
        const fetchSession = async () => {
            setLoading(true);
            const { data, error: fetchError } = await interviewService.getSession(sessionId);
            if (fetchError) {
                setError(fetchError);
            } else {
                setSession(data);
            }
            setLoading(false);
        };

        fetchSession();

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`session:${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'interview_sessions',
                    filter: `id=eq.${sessionId}`,
                },
                (payload: RealtimePostgresChangesPayload<InterviewSession>) => {
                    if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                        setSession(payload.new as InterviewSession);
                    } else if (payload.eventType === 'DELETE') {
                        setSession(null);
                    }
                }
            )
            .subscribe();

        // Cleanup
        return () => {
            supabase.removeChannel(channel);
        };
    }, [sessionId]);

    return { session, loading, error };
}
