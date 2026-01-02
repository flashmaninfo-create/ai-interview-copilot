/**
 * Session Service
 *
 * Provides session lifecycle management with server-controlled state transitions.
 * All transitions happen via RPC functions to ensure backend enforcement.
 *
 * State Machine:
 *   created → active → completed
 *   created → failed
 *   active → failed
 *   created|active → cancelled
 */

import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export type SessionStatus = 'created' | 'active' | 'completed' | 'failed' | 'cancelled';
export type SessionType = 'technical' | 'behavioral' | 'mixed';
export type SessionDifficulty = 'easy' | 'medium' | 'hard';

export interface Session {
    id: string;
    user_id: string;
    role: string;
    type: SessionType;
    difficulty: SessionDifficulty;
    status: SessionStatus;
    score: number | null;
    summary: string | null;
    transcript: TranscriptEntry[];
    questions: QuestionEntry[];
    ai_responses: AIResponse[];
    created_at: string;
    started_at: string | null;
    ended_at: string | null;
    credit_deducted: boolean;
}

export interface SessionSummary {
    id: string;
    role: string;
    type: SessionType;
    difficulty: SessionDifficulty;
    status: SessionStatus;
    score: number | null;
    created_at: string;
    started_at: string | null;
    ended_at: string | null;
}

export interface TranscriptEntry {
    id: string;
    timestamp: string;
    speaker: string;
    text: string;
}

export interface QuestionEntry {
    id: string;
    timestamp: string;
    text: string;
    type: string;
}

export interface AIResponse {
    id: string;
    timestamp: string;
    type: 'hint' | 'code' | 'explain' | 'other';
    text: string;
    question_id?: string;
}

export interface CreateSessionParams {
    role: string;
    type: SessionType;
    difficulty?: SessionDifficulty;
}

export interface SessionResult<T = void> {
    success: boolean;
    data?: T;
    error?: SessionError;
}

export interface SessionError {
    code: string;
    message: string;
}

// ============================================================================
// Session Service
// ============================================================================

export const sessionService = {
    // ========================================================================
    // CREATE SESSION
    // ========================================================================

    /**
     * Create a new interview session
     */
    async create(params: CreateSessionParams): Promise<SessionResult<Session>> {
        try {
            const { data, error } = await supabase.rpc('create_session', {
                p_role: params.role,
                p_type: params.type,
                p_difficulty: params.difficulty || 'medium',
            });

            if (error) {
                console.error('Create session error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; session?: Session; error?: string; message?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed to create session' },
                };
            }

            return { success: true, data: result.session };
        } catch (err) {
            console.error('Create session exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // START SESSION
    // ========================================================================

    /**
     * Start a session (created → active)
     */
    async start(sessionId: string): Promise<SessionResult<{ started_at: string }>> {
        try {
            const { data, error } = await supabase.rpc('start_session', {
                p_session_id: sessionId,
            });

            if (error) {
                console.error('Start session error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; started_at?: string; error?: string; message?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed to start session' },
                };
            }

            return { success: true, data: { started_at: result.started_at! } };
        } catch (err) {
            console.error('Start session exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // COMPLETE SESSION
    // ========================================================================

    /**
     * Complete a session (active → completed)
     */
    async complete(
        sessionId: string,
        options?: { score?: number; summary?: string }
    ): Promise<SessionResult<{ ended_at: string }>> {
        try {
            const { data, error } = await supabase.rpc('complete_session', {
                p_session_id: sessionId,
                p_score: options?.score ?? null,
                p_summary: options?.summary ?? null,
            });

            if (error) {
                console.error('Complete session error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; ended_at?: string; error?: string; message?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed to complete session' },
                };
            }

            return { success: true, data: { ended_at: result.ended_at! } };
        } catch (err) {
            console.error('Complete session exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // FAIL SESSION
    // ========================================================================

    /**
     * Fail a session (created|active → failed)
     */
    async fail(sessionId: string, reason?: string): Promise<SessionResult> {
        try {
            const { data, error } = await supabase.rpc('fail_session', {
                p_session_id: sessionId,
                p_reason: reason ?? null,
            });

            if (error) {
                console.error('Fail session error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; error?: string; message?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed to fail session' },
                };
            }

            return { success: true };
        } catch (err) {
            console.error('Fail session exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // CANCEL SESSION
    // ========================================================================

    /**
     * Cancel a session (created|active → cancelled)
     */
    async cancel(sessionId: string): Promise<SessionResult> {
        try {
            const { data, error } = await supabase.rpc('cancel_session', {
                p_session_id: sessionId,
            });

            if (error) {
                console.error('Cancel session error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; error?: string; message?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed to cancel session' },
                };
            }

            return { success: true };
        } catch (err) {
            console.error('Cancel session exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // GET SESSION
    // ========================================================================

    /**
     * Get a session by ID
     */
    async get(sessionId: string): Promise<SessionResult<Session>> {
        try {
            const { data, error } = await supabase.rpc('get_session', {
                p_session_id: sessionId,
            });

            if (error) {
                console.error('Get session error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; session?: Session; error?: string; message?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Session not found' },
                };
            }

            return { success: true, data: result.session };
        } catch (err) {
            console.error('Get session exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // LIST USER SESSIONS
    // ========================================================================

    /**
     * Get all sessions for current user
     */
    async list(options?: {
        status?: SessionStatus;
        limit?: number;
        offset?: number;
    }): Promise<SessionResult<{ sessions: SessionSummary[]; total: number }>> {
        try {
            const { data, error } = await supabase.rpc('get_user_sessions', {
                p_status: options?.status ?? null,
                p_limit: options?.limit ?? 20,
                p_offset: options?.offset ?? 0,
            });

            if (error) {
                console.error('List sessions error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as {
                success: boolean;
                sessions?: SessionSummary[];
                total?: number;
                error?: string;
                message?: string;
            };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed to list sessions' },
                };
            }

            return {
                success: true,
                data: {
                    sessions: result.sessions || [],
                    total: result.total || 0,
                },
            };
        } catch (err) {
            console.error('List sessions exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // UPDATE SESSION DATA
    // ========================================================================

    /**
     * Update session data (transcript, questions, ai_responses)
     * Only works for active sessions
     */
    async updateData(
        sessionId: string,
        data: {
            transcript?: TranscriptEntry[];
            questions?: QuestionEntry[];
            ai_responses?: AIResponse[];
        }
    ): Promise<SessionResult> {
        try {
            const { data: result, error } = await supabase.rpc('update_session_data', {
                p_session_id: sessionId,
                p_transcript: data.transcript ?? null,
                p_questions: data.questions ?? null,
                p_ai_responses: data.ai_responses ?? null,
            });

            if (error) {
                console.error('Update session data error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const response = result as { success: boolean; error?: string; message?: string };

            if (!response.success) {
                return {
                    success: false,
                    error: { code: response.error || 'UNKNOWN', message: response.message || 'Failed to update' },
                };
            }

            return { success: true };
        } catch (err) {
            console.error('Update session data exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // APPEND TRANSCRIPT ENTRY
    // ========================================================================

    /**
     * Append a single transcript entry atomically
     */
    async appendTranscript(
        sessionId: string,
        speaker: string,
        text: string
    ): Promise<SessionResult<TranscriptEntry>> {
        try {
            const { data, error } = await supabase.rpc('append_transcript', {
                p_session_id: sessionId,
                p_speaker: speaker,
                p_text: text,
            });

            if (error) {
                console.error('Append transcript error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; entry?: TranscriptEntry; error?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: 'Failed to append transcript' },
                };
            }

            return { success: true, data: result.entry };
        } catch (err) {
            console.error('Append transcript exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // APPEND AI RESPONSE
    // ========================================================================

    /**
     * Append an AI response atomically
     */
    async appendAIResponse(
        sessionId: string,
        type: AIResponse['type'],
        text: string,
        questionId?: string
    ): Promise<SessionResult<AIResponse>> {
        try {
            const { data, error } = await supabase.rpc('append_ai_response', {
                p_session_id: sessionId,
                p_type: type,
                p_text: text,
                p_question_id: questionId ?? null,
            });

            if (error) {
                console.error('Append AI response error:', error);
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as { success: boolean; entry?: AIResponse; error?: string };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: 'Failed to append AI response' },
                };
            }

            return { success: true, data: result.entry };
        } catch (err) {
            console.error('Append AI response exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // REALTIME SUBSCRIPTION
    // ========================================================================

    /**
     * Subscribe to session changes in realtime
     */
    subscribe(
        sessionId: string,
        callback: (session: Session) => void
    ): RealtimeChannel {
        const channel = supabase
            .channel(`session:${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'interview_sessions',
                    filter: `id=eq.${sessionId}`,
                },
                (payload) => {
                    callback(payload.new as Session);
                }
            )
            .subscribe();

        return channel;
    },

    /**
     * Unsubscribe from session changes
     */
    unsubscribe(channel: RealtimeChannel): void {
        supabase.removeChannel(channel);
    },

    // ========================================================================
    // SEND COMMAND TO EXTENSION
    // ========================================================================

    /**
     * Send a command to the extension
     */
    async sendCommand(
        sessionId: string,
        command: string,
        payload?: Record<string, unknown>
    ): Promise<SessionResult<{ id: string }>> {
        try {
            const { data, error } = await supabase
                .from('session_commands')
                .insert({
                    session_id: sessionId,
                    command,
                    payload: payload || {},
                    source: 'console',
                })
                .select('id')
                .single();

            if (error) {
                console.error('Send command error:', error);
                return {
                    success: false,
                    error: { code: 'INSERT_ERROR', message: error.message },
                };
            }

            return { success: true, data: { id: data.id } };
        } catch (err) {
            console.error('Send command exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to send command' },
            };
        }
    },

    /**
     * Subscribe to commands (for extension)
     */
    subscribeToCommands(
        sessionId: string,
        callback: (command: { id: string; command: string; payload: unknown }) => void
    ): RealtimeChannel {
        const channel = supabase
            .channel(`commands:${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'session_commands',
                    filter: `session_id=eq.${sessionId}`,
                },
                (payload) => {
                    if (!payload.new.processed) {
                        callback(payload.new as { id: string; command: string; payload: unknown });
                    }
                }
            )
            .subscribe();

        return channel;
    },

    /**
     * Mark command as processed (for extension)
     */
    async markCommandProcessed(commandId: string): Promise<SessionResult> {
        try {
            const { error } = await supabase
                .from('session_commands')
                .update({ processed: true, processed_at: new Date().toISOString() })
                .eq('id', commandId);

            if (error) {
                return {
                    success: false,
                    error: { code: 'UPDATE_ERROR', message: error.message },
                };
            }

            return { success: true };
        } catch (err) {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to mark command processed' },
            };
        }
    },
};

export default sessionService;
