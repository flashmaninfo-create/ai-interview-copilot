// Console Sync - Handles real-time sync with the console dashboard via Supabase

import { supabaseREST } from './supabase-config.js';

export class ConsoleSync {
    constructor() {
        this.token = null;
        this.sessionId = null;
        this.connected = false;
        this.messageHandler = null;
        this.pollInterval = null;
    }

    async connect(token, sessionId) {
        this.token = token;
        this.sessionId = sessionId;
        this.connected = true;

        // Store for popup access
        await chrome.storage.local.set({
            consoleToken: token,
            activeSessionId: sessionId
        });

        console.log('[ConsoleSync] Connected with session:', sessionId);

        // Start polling for incoming messages from console
        this.startPolling();
    }

    async disconnect() {
        this.connected = false;
        this.token = null;
        this.sessionId = null;

        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }

        await chrome.storage.local.remove(['consoleToken', 'activeSessionId']);
        console.log('[ConsoleSync] Disconnected');
    }

    async send(message) {
        if (!this.connected || !this.sessionId) {
            console.log('[ConsoleSync] Not connected, skipping send. ID:', this.sessionId, 'Connected:', this.connected);
            return;
        }

        console.log('[ConsoleSync] Sending message:', message.type, 'to session:', this.sessionId);

        try {
            await supabaseREST.insert('sync_messages', {
                session_id: this.sessionId,
                message_type: message.type,
                payload: message.data || message,
                source: 'extension'
            });
            console.log('[ConsoleSync] Message sent successfully');
        } catch (error) {
            console.error('[ConsoleSync] Send error:', error);
            // If the error is about Auth, maybe trigger a re-login warning?
        }
    }

    onMessage(handler) {
        this.messageHandler = handler;
    }

    startPolling() {
        // Poll for console commands every 2 seconds
        let lastChecked = Date.now();

        this.pollInterval = setInterval(async () => {
            if (!this.connected || !this.sessionId) return;

            try {
                const messages = await supabaseREST.select(
                    'sync_messages',
                    `session_id=eq.${this.sessionId}&source=eq.console&created_at=gt.${new Date(lastChecked).toISOString()}`
                );

                lastChecked = Date.now();

                if (messages && messages.length > 0) {
                    for (const msg of messages) {
                        if (this.messageHandler) {
                            this.messageHandler({
                                type: msg.message_type,
                                data: msg.payload
                            });
                        }
                    }
                }
            } catch (error) {
                // Silently fail polling errors
            }
        }, 2000);
    }
}
