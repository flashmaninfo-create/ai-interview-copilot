// Interview Context Manager - Real-time context caching for instant AI responses
// Maintains rolling transcript window and cached interview metadata

import { IntentClassifier } from './intent-classifier.js';

export class InterviewContextManager {
    constructor() {
        // Rolling transcript window (60-120 seconds)
        this.rollingTranscripts = [];
        this.windowDurationMs = 90000; // 90 seconds

        // Cached interview metadata (all fields from popup)
        this.interviewMeta = {
            role: 'Software Engineer',
            experienceLevel: 'mid',
            interviewType: 'technical',
            techStack: 'general',
            companyType: 'startup',
            responseStyle: 'balanced',
            weakAreas: ''
        };

        // Latest detected interviewer question
        this.latestQuestion = null;
        this.questionTimestamp = 0;

        // Question detection patterns
        this.questionPatterns = [
            /^(can you|could you|would you|how would you|how do you|how did you)/i,
            /^(tell me about|describe|explain|walk me through)/i,
            /^(what is|what are|what was|what were|what's)/i,
            /^(why do you|why did you|why would you)/i,
            /^(have you ever|did you|do you)/i,
            /\?$/  // Ends with question mark
        ];

        // SESSION MEMORY - tracks conversation history
        this.sessionMemory = {
            history: [],           // Last 5 Q&A pairs
            maxHistory: 5,
            last_mode: null,       // Last mode used (code/explain/help)
            detected_lang: null,   // Detected programming language
            code_written: '',      // Partial code already in editor
            style_preference: 'iterative'
        };
    }

    /**
     * Set interview metadata (role, level, tech stack, company, style)
     * All fields from popup form
     */
    setMeta(meta) {
        this.interviewMeta = {
            role: meta.role || 'Software Engineer',
            experienceLevel: meta.experienceLevel || meta.level || 'mid',
            interviewType: meta.interviewType || meta.type || 'technical',
            techStack: meta.techStack || 'general',
            companyType: meta.companyType || 'startup',
            responseStyle: meta.responseStyle || 'balanced',
            weakAreas: meta.weakAreas || ''
        };
        console.log('[InterviewContext] Meta set:', this.interviewMeta);
    }

    /**
     * Add transcript and maintain rolling window
     */
    addTranscript(text, timestamp, isFinal) {
        if (!text || !text.trim()) return;

        const trimmedText = text.trim();

        // Only add final transcripts to rolling window
        if (isFinal) {
            this.rollingTranscripts.push({
                text: trimmedText,
                timestamp: timestamp || Date.now()
            });

            // Prune old entries
            this.pruneOldTranscripts();

            // Detect if this is a question
            if (this.isQuestion(trimmedText)) {
                this.latestQuestion = trimmedText;
                this.questionTimestamp = timestamp || Date.now();
                console.log('[InterviewContext] Question detected:', trimmedText);
            }
        }
    }

    /**
     * Remove transcripts older than window duration
     */
    pruneOldTranscripts() {
        const cutoff = Date.now() - this.windowDurationMs;
        this.rollingTranscripts = this.rollingTranscripts.filter(
            t => t.timestamp > cutoff
        );
    }

    /**
     * Check if text is likely a question from interviewer
     */
    isQuestion(text) {
        return this.questionPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Get the rolling context text (last 90 seconds)
     */
    getRollingText() {
        this.pruneOldTranscripts(); // Ensure fresh data
        return this.rollingTranscripts.map(t => t.text).join(' ');
    }

    /**
     * Get latest detected question (if within last 2 minutes)
     */
    getLatestQuestion() {
        // Only return question if it's recent (within 2 minutes)
        if (this.latestQuestion && (Date.now() - this.questionTimestamp < 120000)) {
            return this.latestQuestion;
        }
        return null;
    }

    /**
     * Get full context for AI request - this is the main API
     * Returns everything needed for instant AI response
     */
    getContext() {
        this.pruneOldTranscripts();

        return {
            // Interview metadata (all from popup)
            role: this.interviewMeta.role,
            experienceLevel: this.interviewMeta.experienceLevel,
            interviewType: this.interviewMeta.interviewType,
            techStack: this.interviewMeta.techStack,
            companyType: this.interviewMeta.companyType,
            responseStyle: this.interviewMeta.responseStyle,
            weakAreas: this.interviewMeta.weakAreas,

            // Rolling context
            recentTranscript: this.getRollingText(),
            transcriptCount: this.rollingTranscripts.length,

            // Latest question (if detected)
            latestQuestion: this.getLatestQuestion(),

            // Session memory
            history: this.sessionMemory.history,
            detectedLanguage: this.sessionMemory.detected_lang,
            codeWritten: this.sessionMemory.code_written,
            lastMode: this.sessionMemory.last_mode,

            // Timestamps for debugging
            oldestTranscript: this.rollingTranscripts[0]?.timestamp || null,
            newestTranscript: this.rollingTranscripts[this.rollingTranscripts.length - 1]?.timestamp || null
        };
    }

    /**
     * Add Q&A pair to history (rolling window)
     */
    addToHistory(question, response, mode) {
        this.sessionMemory.history.push({
            question,
            response: response.substring(0, 500), // Truncate for memory efficiency
            mode,
            timestamp: Date.now()
        });

        // Keep only last N entries
        if (this.sessionMemory.history.length > this.sessionMemory.maxHistory) {
            this.sessionMemory.history.shift();
        }

        // Track last mode
        this.sessionMemory.last_mode = mode;

        console.log('[InterviewContext] Added to history:', mode);
    }

    /**
     * Set detected programming language
     */
    setDetectedLanguage(lang) {
        if (lang) {
            this.sessionMemory.detected_lang = lang;
            console.log('[InterviewContext] Language detected:', lang);
        }
    }

    /**
     * Set partial code already written
     */
    setCodeWritten(code) {
        this.sessionMemory.code_written = code || '';
    }

    /**
     * Get conversation history for follow-up context
     */
    getHistory() {
        return this.sessionMemory.history;
    }

    /**
     * Classify follow-up intent
     */
    classifyIntent(input) {
        return IntentClassifier.classify(input, this.sessionMemory.history);
    }

    /**
     * Clear all context (on session end)
     */
    clear() {
        this.rollingTranscripts = [];
        this.latestQuestion = null;
        this.questionTimestamp = 0;
        this.sessionMemory = {
            history: [],
            maxHistory: 5,
            last_mode: null,
            detected_lang: null,
            code_written: '',
            style_preference: 'iterative'
        };
        console.log('[InterviewContext] Context cleared');
    }
}
