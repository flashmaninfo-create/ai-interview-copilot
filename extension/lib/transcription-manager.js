// Transcription Manager - Single source of truth for transcription state
// Provides smooth, append-only text display without flicker

export class TranscriptionManager {
    constructor() {
        this.finalizedText = '';
        this.interimText = '';
        this.lastFinalTimestamp = 0;
    }

    processResult(text, isFinal, confidence = 0.9) {
        if (isFinal) {
            // Append to finalized text (never rewritten)
            if (this.finalizedText) {
                this.finalizedText += ' ' + text.trim();
            } else {
                this.finalizedText = text.trim();
            }
            this.interimText = '';
            this.lastFinalTimestamp = Date.now();
        } else {
            // Update interim text (shown differently in UI)
            this.interimText = text.trim();
        }

        return this.getState();
    }

    getState() {
        return {
            finalizedText: this.finalizedText,
            interimText: this.interimText,
            displayText: this.finalizedText + (this.interimText ? ' ' + this.interimText : ''),
            hasInterim: !!this.interimText
        };
    }

    getText() {
        return this.finalizedText;
    }

    clear() {
        this.finalizedText = '';
        this.interimText = '';
        this.lastFinalTimestamp = 0;
    }
}
