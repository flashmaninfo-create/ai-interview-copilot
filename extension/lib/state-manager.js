// State Manager - Manages extension state in chrome.storage

export class StateManager {
    constructor() {
        this.data = {
            user: null,
            credits: 10,
            activeSession: null,
            sessionHistory: [],
            consoleToken: null,
            settings: {
                mode: 'manual',
                language: 'javascript',
                verbosity: 'balanced'
            },
            userProfile: {}
        };
    }

    async load() {
        try {
            const stored = await chrome.storage.local.get(['extensionState']);
            if (stored.extensionState) {
                this.data = { ...this.data, ...stored.extensionState };
            }
        } catch (error) {
            console.error('[StateManager] Load error:', error);
        }
    }

    async save() {
        try {
            await chrome.storage.local.set({ extensionState: this.data });
        } catch (error) {
            console.error('[StateManager] Save error:', error);
        }
    }
}
