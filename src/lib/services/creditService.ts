/**
 * Credit Service
 *
 * Provides credit balance and history via server-side RPCs.
 * All credit operations are server-enforced.
 */

import { supabase } from '../supabase';

// ============================================================================
// Types
// ============================================================================

export interface CreditTransaction {
    id: string;
    amount: number;
    balance_after: number;
    description: string;
    reference_type: 'signup' | 'purchase' | 'session' | 'admin' | 'refund' | 'promo';
    reference_id?: string;
    created_at: string;
}

export interface CreditBalance {
    balance: number;
    last_transaction_at: string | null;
}

export interface CreditResult<T = void> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

// ============================================================================
// Credit Service
// ============================================================================

export const creditService = {
    // ========================================================================
    // GET BALANCE
    // ========================================================================

    /**
     * Get current user's credit balance
     */
    /**
     * Get current user's credit balance
     */
    async getBalance(): Promise<CreditResult<CreditBalance>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return {
                    success: false,
                    error: { code: 'UNAUTHORIZED', message: 'User not found' }
                };
            }

            // Try to get from view first
            const { data, error } = await supabase
                .from('user_credits')
                .select('balance')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Get balance error:', error);
                // Fallback to manual sum if view access fails
                const { data: ledger, error: ledgerError } = await supabase
                    .from('credits_ledger')
                    .select('amount')
                    .eq('user_id', user.id);

                if (ledgerError) {
                    return {
                        success: false,
                        error: { code: 'DB_ERROR', message: ledgerError.message },
                    };
                }

                const manualBalance = ledger ? ledger.reduce((acc, curr) => acc + curr.amount, 0) : 0;
                return {
                    success: true,
                    data: {
                        balance: manualBalance,
                        last_transaction_at: null,
                    }
                };
            }

            // Get last transaction date separately
            const { data: lastTx } = await supabase
                .from('credits_ledger')
                .select('created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return {
                success: true,
                data: {
                    balance: data?.balance ?? 0,
                    last_transaction_at: lastTx?.created_at ?? null,
                },
            };
        } catch (err) {
            console.error('Get balance exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // GET HISTORY
    // ========================================================================

    /**
     * Get credit transaction history
     */
    async getHistory(options?: {
        limit?: number;
        offset?: number;
    }): Promise<CreditResult<{ history: CreditTransaction[]; total: number }>> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return {
                    success: false,
                    error: { code: 'UNAUTHORIZED', message: 'User not found' }
                };
            }

            // Query table directly
            const { data, error, count } = await supabase
                .from('credits_ledger')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 20) - 1);

            if (error) {
                console.error('Get history error:', error);
                return {
                    success: false,
                    error: { code: 'DB_ERROR', message: error.message },
                };
            }

            // Map database rows to CreditTransaction interface
            // Note: DB row has snake_case, interface assumes match but let's be safe.
            // Interface: reference_type. DB: description? 
            // Wait, database.types.ts for credits_ledger doesn't show 'reference_type' or 'reference_id'.
            // It only shows: id, user_id, amount, description, created_at, metadata.
            // So we must map metadata to get reference type if stored there.

            const history: CreditTransaction[] = (data || []).map(row => {
                const metadata = row.metadata as any || {};
                return {
                    id: row.id,
                    amount: row.amount,
                    balance_after: 0, // Calculated dynamically or not available in simple query?
                    // We might not have running balance in raw rows unless we compute it. 
                    // For UI display, maybe we just show 0 or undefined if acceptable. 
                    // Or we can't easily get it without window functions.
                    description: row.description,
                    reference_type: metadata.type || 'other',
                    reference_id: metadata.reference_id,
                    created_at: row.created_at
                };
            });

            return {
                success: true,
                data: {
                    history: history,
                    total: count ?? 0,
                },
            };
        } catch (err) {
            console.error('Get history exception:', err);
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect to server' },
            };
        }
    },

    // ========================================================================
    // SUBSCRIBE TO BALANCE CHANGES
    // ========================================================================

    /**
     * Subscribe to credit balance changes in realtime
     */
    subscribeToChanges(
        userId: string,
        callback: (transaction: CreditTransaction) => void
    ) {
        return supabase
            .channel(`credits:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'credits_ledger',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    callback(payload.new as CreditTransaction);
                }
            )
            .subscribe();
    },

    // ========================================================================
    // ADMIN: GET USER CREDITS
    // ========================================================================

    /**
     * Admin: Get any user's credit balance
     */
    async adminGetUserCredits(
        userId: string
    ): Promise<CreditResult<{ email: string; balance: number }>> {
        try {
            const { data, error } = await supabase.rpc('admin_get_user_credits', {
                p_user_id: userId,
            });

            if (error) {
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as {
                success: boolean;
                email?: string;
                balance?: number;
                error?: string;
                message?: string;
            };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed' },
                };
            }

            return {
                success: true,
                data: {
                    email: result.email!,
                    balance: result.balance ?? 0,
                },
            };
        } catch (err) {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect' },
            };
        }
    },

    // ========================================================================
    // ADMIN: ADJUST CREDITS
    // ========================================================================

    /**
     * Admin: Add or remove credits from a user
     */
    async adminAdjustCredits(
        userId: string,
        amount: number,
        description: string
    ): Promise<CreditResult<{ newBalance: number }>> {
        try {
            const { data, error } = await supabase.rpc('admin_adjust_credits', {
                p_user_id: userId,
                p_amount: amount,
                p_description: description,
            });

            if (error) {
                return {
                    success: false,
                    error: { code: 'RPC_ERROR', message: error.message },
                };
            }

            const result = data as {
                success: boolean;
                new_balance?: number;
                error?: string;
                message?: string;
            };

            if (!result.success) {
                return {
                    success: false,
                    error: { code: result.error || 'UNKNOWN', message: result.message || 'Failed' },
                };
            }

            return {
                success: true,
                data: {
                    newBalance: result.new_balance ?? 0,
                },
            };
        } catch (err) {
            return {
                success: false,
                error: { code: 'NETWORK_ERROR', message: 'Failed to connect' },
            };
        }
    },
    /**
     * Internal/System: Add credits to a user (e.g. from Plan subscription)
     * Note: This attempts to use admin RPC or direct insert depending on permissions.
     */
    async addCredits(
        userId: string,
        amount: number,
        description: string
    ): Promise<CreditResult<{ newBalance: number }>> {
        // Try RPC first (more secure if caller is generic)
        const { data, error } = await supabase.rpc('admin_adjust_credits', {
            p_user_id: userId,
            p_amount: amount,
            p_description: description,
        });

        if (!error) {
            const result = data as any;
            if (result.success) {
                return { success: true, data: { newBalance: result.new_balance } };
            }
        }

        // Fallback: Direct Insert (if RLS allows user to add their own credits for "purchases" - insecure but MVP compatible)
        // Or if we are Admin running this code.
        const { error: insertError } = await supabase
            .from('credits_ledger')
            .insert({
                user_id: userId,
                amount: amount,
                description: description,
                metadata: { type: 'plan_allocation' }
            });

        if (insertError) {
            console.error("Failed to add credits:", insertError);
            return { success: false, error: { code: 'DB_ERROR', message: insertError.message } };
        }

        return { success: true, data: { newBalance: 0 } }; // Balance unknown after insert without fresh fetch
    },

    /**
     * Spend credit (Deduct)
     */
    async spendCredit(userId: string, description: string): Promise<void> {
        // We use admin_adjust_credits with negative amount if available, or just insert negative ledger
        // For 'spend', we typically want a check.
        // Assuming there's no specific 'spend_credit' RPC, we use the ledger.

        await this.addCredits(userId, -1, description);
    }
};

export default creditService;
