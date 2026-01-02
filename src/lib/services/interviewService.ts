import { supabase } from '../supabase';
import { creditService } from './creditService';
import type {
    InterviewSession,
    CreateSessionPayload,
    UpdateSessionPayload,
    TranscriptEntry,
    AIResponseEntry,
    ScreenshotEntry,
    ConsoleCommandType
} from '../../types/interview';

const TABLE_NAME = 'interview_sessions';

export const interviewService = {
    /**
     * Create a new interview session
     * Checks if user has > 0 credits before starting.
     */
    async createSession(
        userId: string,
        payload: CreateSessionPayload
    ): Promise<{ data: InterviewSession | null; error: Error | null }> {
        // 1. Check Credit Balance
        try {
            const balance = await creditService.getBalance(userId);
            if (balance < 1) {
                return { data: null, error: new Error('Insufficient credits. Please top up to start.') };
            }
        } catch (err) {
            console.error("Credit check failed:", err);
            // On error (e.g. network), we might want to block or allow loose. 
            // Sticking to safe: block.
            return { data: null, error: new Error('Failed to verify credit balance.') };
        }

        // 2. Create Session
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert({
                user_id: userId,
                type: payload.type,
                role: payload.role,
                difficulty: payload.difficulty,
                status: 'active',
                transcript: [],
                questions: [],
                ai_responses: [],
                // Ensure legacy fields don't break if schema defaults are set
            })
            .select()
            .single();

        return { data: data as unknown as InterviewSession | null, error };
    },

    /**
     * Get a single session by ID
     */
    async getSession(
        sessionId: string
    ): Promise<{ data: InterviewSession | null; error: Error | null }> {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', sessionId)
            .single();

        return { data: data as unknown as InterviewSession | null, error };
    },

    /**
     * Get all sessions for a user
     */
    async getUserSessions(
        userId: string
    ): Promise<{ data: InterviewSession[] | null; error: Error | null }> {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        return { data: data as unknown as InterviewSession[] | null, error };
    },

    /**
     * Update a session (partial update)
     */
    async updateSession(
        sessionId: string,
        payload: UpdateSessionPayload
    ): Promise<{ data: InterviewSession | null; error: Error | null }> {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update(payload)
            .eq('id', sessionId)
            .select()
            .single();

        return { data: data as unknown as InterviewSession | null, error };
    },

    /**
     * End a session (set status to completed)
     * AND deduct 1 credit.
     */
    async endSession(
        sessionId: string,
        userId: string // Need userId for credit deduction
    ): Promise<{ data: InterviewSession | null; error: Error | null }> {
        // 1. Deduct Credit
        try {
            await creditService.spendCredit(userId, `Completed Interview Session (${sessionId.slice(0, 8)})`);
        } catch (err) {
            console.error('Failed to deduct credit:', err);
            // Decide: Stop? Or allow end but log error?
            // Spec says "1 credit per completed". If we fail to deduct, we technically updated status.
            // But if they have 0 balance here (loophole?), spendCredit throws.
            // We'll proceed to close the session but maybe flag it? 
            // For now, if spending fails (e.g. already 0), we might throw error or allow clean up.
            // Let's propagate error if it's strictly enforced, or swallow if we want to prioritize UX closing.
            // Given "Atomic deduction", ideally we do this in a Transaction/RPC.
            // Since we rely on service calls, we try our best.
            // If credit fails, we return error and DO NOT close session?
            return { data: null, error: err as Error };
        }

        // 2. Close Session
        return this.updateSession(sessionId, {
            status: 'completed',
            ended_at: new Date().toISOString(),
        });
    },

    /**
     * Append a transcript entry
     */
    async appendTranscript(
        sessionId: string,
        entry: TranscriptEntry
    ): Promise<{ error: Error | null }> {
        const { data: session, error: fetchError } = await this.getSession(sessionId);
        if (fetchError || !session) {
            return { error: fetchError || new Error('Session not found') };
        }

        const updatedTranscript = [...session.transcript, entry];
        const { error } = await this.updateSession(sessionId, { transcript: updatedTranscript });
        return { error };
    },

    /**
     * Append an AI response
     */
    async appendAIResponse(
        sessionId: string,
        entry: AIResponseEntry
    ): Promise<{ error: Error | null }> {
        const { data: session, error: fetchError } = await this.getSession(sessionId);
        if (fetchError || !session) {
            return { error: fetchError || new Error('Session not found') };
        }

        const updatedResponses = [...session.ai_responses, entry];
        const { error } = await this.updateSession(sessionId, { ai_responses: updatedResponses });
        return { error };
    },

    /**
     * Update current question
     */
    async setCurrentQuestion(
        sessionId: string,
        question: string
    ): Promise<{ error: Error | null }> {
        const { error } = await this.updateSession(sessionId, { current_question: question });
        return { error };
    },

    /**
     * Append a screenshot to session
     */
    async appendScreenshot(
        sessionId: string,
        screenshot: ScreenshotEntry
    ): Promise<{ error: Error | null }> {
        const { data: session, error: fetchError } = await this.getSession(sessionId);
        if (fetchError || !session) {
            return { error: fetchError || new Error('Session not found') };
        }

        const updatedScreenshots = [...(session.screenshots || []), screenshot];
        const { error } = await this.updateSession(sessionId, { screenshots: updatedScreenshots });
        return { error };
    },

    /**
     * Send a command to the extension via Supabase
     */
    async sendCommand(
        sessionId: string,
        command: ConsoleCommandType,
        payload?: Record<string, unknown>
    ): Promise<{ success: boolean; error: Error | null }> {
        const { error } = await supabase
            .from('session_commands')
            .insert({
                session_id: sessionId,
                command,
                payload: payload || {},
                source: 'console',
                processed: false,
            });

        if (error) {
            return { success: false, error };
        }
        return { success: true, error: null };
    }
};
