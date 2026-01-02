/**
 * Sync Module Exports
 * 
 * This module provides all real-time sync functionality that can be shared
 * between the Console (web dashboard) and the Extension.
 * 
 * Usage in Extension:
 *   import { useSessionRealtime, sessionService } from './lib/sync';
 */

// Real-time subscription hook
export { useSessionRealtime } from '../../hooks/useSessionRealtime';

// Session CRUD operations
export { interviewService as sessionService } from '../services/interviewService';

// Types
export type {
    InterviewSession,
    TranscriptEntry,
    QuestionEntry,
    AIResponseEntry,
    CreateSessionPayload,
    UpdateSessionPayload,
} from '../../types/interview';
