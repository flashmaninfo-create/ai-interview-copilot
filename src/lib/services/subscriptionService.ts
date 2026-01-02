import { supabase } from '../supabase';
import type { Database } from '../../types/database.types';

type Plan = Database['public']['Tables']['plans']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export const subscriptionService = {
    /**
     * Get all active plans
     */

    /**
     * Get all active plans
     */
    async getPlans(): Promise<Plan[]> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('price_monthly', { ascending: true });

        if (error) {
            console.error('Error fetching plans:', error);
            return [];
        }

        return data || [];
    },

    /**
     * Get user's current subscription with plan details
     */
    async getSubscription(userId: string): Promise<Subscription & { plans: Plan } | null> {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*, plans(*)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching subscription:', error);
        }

        return data as (Subscription & { plans: Plan }) || null;
    },

    /**
     * Subscribe to a plan (Delegates to planService)
     */
    async subscribe(userId: string, planId: string): Promise<{ success: boolean; error?: string }> {
        // Use dynamically imported planService to avoid circular dep if any, though here it is fine to strict import if structure allows.
        // We will assume standard import is fine.
        const { planService } = await import('./planService');

        const { error } = await planService.assignPlanToUser(userId, planId);

        if (error) {
            console.error('Subscription error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    }
};
