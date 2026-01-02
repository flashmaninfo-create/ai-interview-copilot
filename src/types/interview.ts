export type InterviewType = 'technical' | 'behavioral';
export type InterviewDifficulty = 'easy' | 'medium' | 'hard';
export type SessionStatus = 'created' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface TranscriptEntry {
    id: string;
    timestamp: string;
    speaker: 'interviewer' | 'candidate' | 'ai';
    text: string;
}

export interface QuestionEntry {
    id: string;
    timestamp: string;
    text: string;
    answered: boolean;
}

export interface AIResponseEntry {
    id: string;
    timestamp: string;
    question_id?: string;
    type: 'hint' | 'code' | 'explain' | 'general';
    text: string;
}

export interface ScreenshotEntry {
    id: string;
    timestamp: string;
    url: string;
    thumbnail?: string;
    synced: boolean;
}

export interface InterviewSession {
    id: string;
    user_id: string;
    status: SessionStatus;
    type: InterviewType;
    role: string;
    difficulty: InterviewDifficulty;
    transcript: TranscriptEntry[];
    questions: QuestionEntry[];
    ai_responses: AIResponseEntry[];
    screenshots: ScreenshotEntry[];
    current_question?: string;
    score: number | null;
    summary: string | null;
    created_at: string;
    started_at: string | null;
    ended_at: string | null;
    // Real-time sync state
    is_transcribing?: boolean;
    overlay_visible?: boolean;
    extension_connected?: boolean;
    last_sync_at?: string;
}

export interface UserProfile {
    id: string;
    email: string;
    credits: number;
    role: 'user' | 'admin';
    created_at: string;
}

// Payload types for creating/updating sessions
export interface CreateSessionPayload {
    type: InterviewType;
    role: string;
    difficulty: InterviewDifficulty;
}

export interface UpdateSessionPayload {
    status?: SessionStatus;
    transcript?: TranscriptEntry[];
    questions?: QuestionEntry[];
    ai_responses?: AIResponseEntry[];
    screenshots?: ScreenshotEntry[];
    current_question?: string;
    ended_at?: string;
}

export type ConsoleCommandType =
    | 'PAUSE_TRANSCRIPTION'
    | 'RESUME_TRANSCRIPTION'
    | 'HIDE_OVERLAY'
    | 'SHOW_OVERLAY'
    | 'TAKE_SCREENSHOT'
    | 'END_SESSION';
