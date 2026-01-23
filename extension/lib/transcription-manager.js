// Transcription Manager - Single source of truth for transcription state
// Provides smooth, append-only text display without flicker

export class TranscriptionManager {
    constructor() {
        this.finalizedText = '';
        this.interimText = '';
        this.lastFinalTimestamp = 0;
    }

    processResult(text, isFinal, confidence = 0.9, source = 'tab') {
        if (isFinal) {
            // Append to finalized text with speaker label
            // Source 'mic' -> "You", 'tab' -> "Interviewer"
            const label = source === 'mic' ? 'You' : 'Interviewer';
            const formattedText = `**${label}:** ${text.trim()}`;

            if (this.finalizedText) {
                this.finalizedText += '\n' + formattedText; // New line for new utterance
            } else {
                this.finalizedText = formattedText;
            }
            this.interimText = '';
            this.lastFinalTimestamp = Date.now();
        } else {
            // Update interim text (shown differently in UI)
            // Optional: Add label to interim too? maybe just text for now to avoid jumpiness
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
