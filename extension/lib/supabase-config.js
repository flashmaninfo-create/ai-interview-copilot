// Supabase REST API Configuration

const SUPABASE_URL = 'https://vabwmzmxgdhrlwvwxuxq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYndtem14Z2Rocmx3dnd4dXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDMxNDksImV4cCI6MjA4MzAxOTE0OX0.Cfe9nm10ERvdYnl4hO_2JbfEFJKAzdb91RpbgIxUuBE';

// Store access token and refresh token for authenticated requests
let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = null;

// Parse JWT to get expiration
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// Check if token is expired or about to expire (within 5 minutes)
function isTokenExpired() {
    if (!tokenExpiresAt) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= (tokenExpiresAt - 300); // 5 minute buffer
}

async function getAccessToken() {
    try {
        // Check if we need to refresh
        if (isTokenExpired() && refreshToken) {
            console.log('[SupabaseREST] Token expired or expiring soon, refreshing...');
            const refreshed = await supabaseREST.refreshSession();
            if (refreshed.success) {
                console.log('[SupabaseREST] Token refreshed successfully');
            } else {
                console.error('[SupabaseREST] Token refresh failed:', refreshed.error);
            }
        }

        const stored = await chrome.storage.local.get(['supabase_access_token']);
        return stored.supabase_access_token || accessToken || null;
    } catch (e) {
        return accessToken || null;
    }
}

// Allow external callers (e.g., background.js handleAuthSync) to update tokens immediately
export function setTokens(newAccessToken, newRefreshToken = null, expiresAt = null) {
    accessToken = newAccessToken;
    if (newRefreshToken) refreshToken = newRefreshToken;
    if (expiresAt) tokenExpiresAt = expiresAt;
    console.log('[SupabaseREST] Tokens updated externally, expires at:', tokenExpiresAt ? new Date(tokenExpiresAt * 1000).toLocaleTimeString() : 'N/A');
}

export const supabaseREST = {
    // Authentication
    async signIn(email, password) {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error_description || data.msg || 'Login failed' };
            }

            accessToken = data.access_token;
            refreshToken = data.refresh_token;

            // Parse token to get expiration
            const payload = parseJwt(accessToken);
            tokenExpiresAt = payload?.exp || null;

            // Store both tokens
            await chrome.storage.local.set({
                supabase_access_token: accessToken,
                supabase_refresh_token: refreshToken,
                supabase_token_expires: tokenExpiresAt
            });

            return { success: true, user: data.user, token: accessToken };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Refresh session using refresh token
    async refreshSession() {
        try {
            const stored = await chrome.storage.local.get(['supabase_refresh_token']);
            const storedRefreshToken = stored.supabase_refresh_token || refreshToken;

            if (!storedRefreshToken) {
                return { success: false, error: 'No refresh token available' };
            }

            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refresh_token: storedRefreshToken })
            });

            const data = await response.json();

            if (!response.ok) {
                // Clear tokens if refresh fails
                accessToken = null;
                refreshToken = null;
                tokenExpiresAt = null;
                await chrome.storage.local.remove(['supabase_access_token', 'supabase_refresh_token', 'supabase_token_expires']);
                return { success: false, error: data.error_description || data.msg || 'Token refresh failed' };
            }

            accessToken = data.access_token;
            refreshToken = data.refresh_token;

            // Parse token to get expiration
            const payload = parseJwt(accessToken);
            tokenExpiresAt = payload?.exp || null;

            // Store updated tokens
            await chrome.storage.local.set({
                supabase_access_token: accessToken,
                supabase_refresh_token: refreshToken,
                supabase_token_expires: tokenExpiresAt
            });

            console.log('[SupabaseREST] Session refreshed, expires at:', new Date(tokenExpiresAt * 1000).toLocaleTimeString());
            return { success: true, token: accessToken };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    async signUp(email, password) {
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                return { success: false, error: data.error_description || data.msg || 'Signup failed' };
            }

            if (data.access_token) {
                accessToken = data.access_token;
                await chrome.storage.local.set({ supabase_access_token: accessToken });
            }

            return { success: true, user: data.user, token: accessToken };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // Database operations
    async insert(table, data) {
        const token = await getAccessToken() || SUPABASE_KEY;

        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`[SupabaseREST] Insert failed on ${table}:`, error);
            throw new Error(error);
        }

        return response.json();
    },

    async update(table, data, filter) {
        const token = await getAccessToken() || SUPABASE_KEY;
        const filterStr = Object.entries(filter).map(([k, v]) => `${k}=eq.${v}`).join('&');

        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filterStr}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return true;
    },

    async select(table, filter = '') {
        const token = await getAccessToken() || SUPABASE_KEY;
        const url = filter ? `${SUPABASE_URL}/rest/v1/${table}?${filter}` : `${SUPABASE_URL}/rest/v1/${table}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error);
        }

        return response.json();
    },

    // RPC function calls
    async rpcCall(functionName, params = {}) {
        const token = await getAccessToken();
        if (!token) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const error = await response.text();
                console.error(`[SupabaseREST] RPC ${functionName} failed:`, error);
                return { success: false, error };
            }

            const data = await response.json();
            return data; // RPC returns the JSONB directly
        } catch (error) {
            console.error(`[SupabaseREST] RPC ${functionName} error:`, error);
            return { success: false, error: error.message };
        }
    },

    // Get current user's credit balance with robust fallbacks
    async getCredits() {
        const token = await getAccessToken();
        if (!token) {
            console.error('[SupabaseREST] getCredits failed: No access token available');
            return { success: false, balance: 0, error: 'Not authenticated' };
        }

        const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        let userData;
        try {
            userData = await userResponse.json();
        } catch (e) {
            console.error('[SupabaseREST] Failed to parse user data:', e);
            return { success: false, balance: 0, error: 'Failed to retrieve user data' };
        }

        const userId = userData?.id;

        if (!userId) {
            console.error('[SupabaseREST] getCredits failed: User ID not found in response', userData);
            return { success: false, balance: 0, error: 'User not authenticated' };
        }

        // Strategy 1: RPC (Best, consistent)
        const rpcResult = await this.rpcCall('get_my_credit_balance');
        if (rpcResult.success) {
            return { success: true, balance: rpcResult.balance };
        }
        console.warn('[SupabaseREST] RPC getCredits failed, trying fallbacks...');

        // Strategy 2: View (Fast, read-only)
        try {
            const viewResult = await this.select('user_credits', `user_id=eq.${userId}&select=balance`);
            if (viewResult && viewResult.length > 0) {
                return { success: true, balance: viewResult[0].balance };
            }
        } catch (e) {
            console.warn('[SupabaseREST] View getCredits failed:', e);
        }

        // Strategy 3: Ledger Sum (Slower, but source of truth)
        try {
            const ledgerResult = await this.select('credits_ledger', `user_id=eq.${userId}&select=amount`);
            if (ledgerResult) {
                const balance = ledgerResult.reduce((sum, row) => sum + (row.amount || 0), 0);
                return { success: true, balance: balance };
            }
        } catch (e) {
            console.error('[SupabaseREST] All credit fetch strategies failed:', e);
        }

        // Default to 0 if everything fails, but return error so UI knows
        return { success: false, balance: 0, error: 'Failed to fetch credits' };
    },

    // Complete a session and deduct credit with robust fallbacks
    async completeSession(sessionId, score = null, summary = null) {
        const params = { p_session_id: sessionId };
        if (score !== null) params.p_score = score;
        if (summary !== null) params.p_summary = summary;

        // Strategy 1: RPC (Atomic, best)
        const result = await this.rpcCall('complete_session', params);
        if (result.success) {
            return result;
        }

        console.warn('[SupabaseREST] RPC completeSession failed, using fallback deduction:', result.error);

        // Strategy 2: Manual Deduction + Update
        // This handles the case where the complex RPC fails but we still want to charge/complete.
        try {
            const token = await getAccessToken();
            const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
            });
            const userData = await userResponse.json();

            if (userData && userData.id) {
                // 1. Force deduct credit
                await this.insert('credits_ledger', {
                    user_id: userData.id,
                    amount: -1,
                    description: 'Interview Session (Manual Fallback)',
                    reference_type: 'session',
                    reference_id: sessionId,
                    created_by: userData.id
                });

                // 2. Mark session completed
                await this.update('interview_sessions',
                    {
                        status: 'completed',
                        ended_at: new Date().toISOString(),
                        credit_deducted: true
                    },
                    { id: sessionId }
                );

                console.log('[SupabaseREST] Fallback completion successful');

                // Get new balance to return
                const balanceRes = await this.getCredits();
                return {
                    success: true,
                    new_balance: balanceRes.balance,
                    message: 'Completed via fallback'
                };
            }
        } catch (e) {
            console.error('[SupabaseREST] Fallback completion failed:', e);
        }

        return result;
    },

    // Get active LLM configuration (provider + model + API key)
    async getLLMConfig() {
        console.log('[SupabaseREST] Fetching LLM config...');
        const result = await this.rpcCall('get_active_llm_config');
        console.log('[SupabaseREST] LLM config result:', JSON.stringify(result));
        return result;
    },

    // Alias for rpcCall for convenience
    async rpc(functionName, params = {}) {
        return this.rpcCall(functionName, params);
    }
};

// Load stored tokens on initialization
(async () => {
    try {
        const stored = await chrome.storage.local.get([
            'supabase_access_token',
            'supabase_refresh_token',
            'supabase_token_expires'
        ]);
        if (stored.supabase_access_token) {
            accessToken = stored.supabase_access_token;
        }
        if (stored.supabase_refresh_token) {
            refreshToken = stored.supabase_refresh_token;
        }
        if (stored.supabase_token_expires) {
            tokenExpiresAt = stored.supabase_token_expires;
        }
        console.log('[SupabaseREST] Loaded tokens, expires at:', tokenExpiresAt ? new Date(tokenExpiresAt * 1000).toLocaleTimeString() : 'N/A');
    } catch (e) {
        // Ignore
    }
})();
