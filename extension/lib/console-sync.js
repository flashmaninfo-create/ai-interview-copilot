// Console Sync - Handles real-time sync with the console dashboard via Supabase

import { supabaseREST } from './supabase-config.js';

export class ConsoleSync {
    constructor() {
        this.token = null;
        this.sessionId = null;
        this.connected = false;
        this.messageHandler = null;
        this.pollInterval = null;
        this.lastProcessedId = null; // Track handled messages to avoid duplicates
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
        // Poll for console commands every 1 second (faster responsiveness)
        let lastChecked = Date.now();

        console.log('[ConsoleSync] Starting polling for session:', this.sessionId);

        this.pollInterval = setInterval(async () => {
            if (!this.connected || !this.sessionId) return;

            try {
                // Buffer period: query 5 seconds overlap to ensure nothing is missed due to clock drift
                const queryTime = new Date(lastChecked - 5000).toISOString();

                // Update local time BEFORE fetch to capture window
                // If fetch takes 1s, next poll will cover that 1s gap
                lastChecked = Date.now();

                const messages = await supabaseREST.select(
                    'sync_messages',
                    `session_id=eq.${this.sessionId}&source=eq.console&created_at=gt.${queryTime}`
                );

                if (messages && messages.length > 0) {
                    console.log(`[ConsoleSync] Polled ${messages.length} messages`);
                    // Sort by time to process in order
                    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                    for (const msg of messages) {
                        // Prevent re-processing messages we've already seen
                        if (this.lastProcessedId === msg.id) continue;
                        this.lastProcessedId = msg.id;

                        if (this.messageHandler) {
                            console.log(`[ConsoleSync] Processing message: ${msg.message_type}`, msg.payload);
                            this.messageHandler({
                                type: msg.message_type,
                                data: msg.payload
                            });
                        }
                    }
                }

                lastChecked = queryTime;
            } catch (error) {
                console.error('[ConsoleSync] Polling error:', error);
            }
        }, 1000); // Poll every 1 second for faster response
    }
}
