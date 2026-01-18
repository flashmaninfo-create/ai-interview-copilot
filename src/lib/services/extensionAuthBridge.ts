/**
 * Extension Auth Bridge
 *
 * Provides utilities for sharing authentication state between
 * the web console and the Chrome extension.
 *
 * The extension can:
 * 1. Listen for auth state via postMessage
 * 2. Use tokens directly with Supabase client
 * 3. Subscribe to token refresh events
 */

import { authService } from './authService';
import { supabase } from '../supabase';

// ============================================================================
// Types
// ============================================================================

export interface ExtensionAuthPayload {
    type: 'AUTH_STATE_CHANGE';
    data: {
        isAuthenticated: boolean;
        userId?: string;
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
    };
}

export interface ExtensionTokenRequest {
    type: 'REQUEST_AUTH_TOKENS';
}

// ============================================================================
// Extension Auth Bridge
// ============================================================================

export const extensionAuthBridge = {
    /**
     * Initialize the bridge to listen for extension requests
     * and broadcast auth state changes
     */
    initialize() {
        // Listen for token requests from extension
        window.addEventListener('message', this.handleExtensionMessage.bind(this));

        // Broadcast auth state on changes
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                this.broadcastAuthState(true, session?.user?.id, session);
            } else if (event === 'SIGNED_OUT') {
                this.broadcastAuthState(false);
            }
        });

        console.log('[ExtensionAuthBridge] Initialized');
    },

    /**
     * Handle messages from extension
     */
    handleExtensionMessage(event: MessageEvent) {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) {
            return;
        }

        const message = event.data as ExtensionTokenRequest;

        if (message?.type === 'REQUEST_AUTH_TOKENS') {
            this.sendTokensToExtension();
        }
    },

    /**
     * Send current tokens to extension
     */
    async sendTokensToExtension() {
        const tokens = await authService.getTokensForExtension();

        const payload: ExtensionAuthPayload = {
            type: 'AUTH_STATE_CHANGE',
            data: tokens
                ? {
                    isAuthenticated: true,
                    userId: (await supabase.auth.getUser()).data.user?.id,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    expiresAt: tokens.expiresAt,
                }
                : {
                    isAuthenticated: false,
                },
        };

        // Post to extension content script
        window.postMessage(payload, window.location.origin);

        // Also dispatch custom event for extension popup
        window.dispatchEvent(
            new CustomEvent('xtroon-auth-state', {
                detail: payload.data,
            })
        );
    },

    /**
     * Broadcast auth state to extension
     */
    broadcastAuthState(
        isAuthenticated: boolean,
        userId?: string,
        session?: { access_token: string; refresh_token: string; expires_at?: number } | null
    ) {
        const payload: ExtensionAuthPayload = {
            type: 'AUTH_STATE_CHANGE',
            data: {
                isAuthenticated,
                userId,
                accessToken: session?.access_token,
                refreshToken: session?.refresh_token,
                expiresAt: session?.expires_at,
            },
        };

        window.postMessage(payload, window.location.origin);
        window.dispatchEvent(
            new CustomEvent('xtroon-auth-state', {
                detail: payload.data,
            })
        );
    },

    /**
     * Generate a one-time pairing code for extension
     * This is a more secure alternative to sharing tokens directly
     */
    async generatePairingCode(): Promise<string | null> {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
            return null;
        }

        // Generate a short-lived code
        // In production, this would be stored in a temporary table
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Store in session storage for verification
        sessionStorage.setItem(
            `pairing_${code}`,
            JSON.stringify({
                userId: session.data.session.user.id,
                expires: Date.now() + 5 * 60 * 1000, // 5 minutes
            })
        );

        return code;
    },

    /**
     * Verify a pairing code from extension
     */
    verifyPairingCode(code: string): { userId: string } | null {
        const stored = sessionStorage.getItem(`pairing_${code}`);
        if (!stored) {
            return null;
        }

        const data = JSON.parse(stored);
        if (Date.now() > data.expires) {
            sessionStorage.removeItem(`pairing_${code}`);
            return null;
        }

        // Remove after use
        sessionStorage.removeItem(`pairing_${code}`);
        return { userId: data.userId };
    },
};

/**
 * Hook to use extension auth bridge in React components
 */
export function useExtensionAuth() {
    return {
        sendTokens: () => extensionAuthBridge.sendTokensToExtension(),
        generatePairingCode: () => extensionAuthBridge.generatePairingCode(),
    };
}

export default extensionAuthBridge;
