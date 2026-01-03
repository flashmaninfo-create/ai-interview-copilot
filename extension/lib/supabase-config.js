// Supabase REST API Configuration

const SUPABASE_URL = 'https://vabwmzmxgdhrlwvwxuxq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYndtem14Z2Rocmx3dnd4dXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDMxNDksImV4cCI6MjA4MzAxOTE0OX0.Cfe9nm10ERvdYnl4hO_2JbfEFJKAzdb91RpbgIxUuBE';

// Store access token for authenticated requests
let accessToken = null;

async function getAccessToken() {
    try {
        const stored = await chrome.storage.local.get(['supabase_access_token']);
        return stored.supabase_access_token || accessToken || null;
    } catch (e) {
        return accessToken || null;
    }
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

            // Store token
            await chrome.storage.local.set({ supabase_access_token: accessToken });

            return { success: true, user: data.user, token: accessToken };
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

    // Get current user's credit balance
    async getCredits() {
        const result = await this.rpcCall('get_my_credit_balance');
        if (result.success) {
            return { success: true, balance: result.balance };
        }
        return { success: false, balance: 0, error: result.error || result.message };
    },

    // Complete a session and deduct credit
    async completeSession(sessionId, score = null, summary = null) {
        const params = { p_session_id: sessionId };
        if (score !== null) params.p_score = score;
        if (summary !== null) params.p_summary = summary;

        const result = await this.rpcCall('complete_session', params);
        return result;
    },

    // Get active LLM configuration (provider + model + API key)
    async getLLMConfig() {
        const result = await this.rpcCall('get_active_llm_config');
        return result;
    }
};

// Load stored token on initialization
(async () => {
    try {
        const stored = await chrome.storage.local.get(['supabase_access_token']);
        if (stored.supabase_access_token) {
            accessToken = stored.supabase_access_token;
        }
    } catch (e) {
        // Ignore
    }
})();
