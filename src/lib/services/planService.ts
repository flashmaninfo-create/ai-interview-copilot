
import { supabase } from '../supabase';
import type { Database } from '../../types/database.types';
import { creditService } from './creditService';

type Plan = Database['public']['Tables']['plans']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];
type PlanInsert = Database['public']['Tables']['plans']['Insert'];
type PlanUpdate = Database['public']['Tables']['plans']['Update'];

export const planService = {
    /**
     * Get all active plans for public display
     */
    async getActivePlans(): Promise<{ data: Plan[]; error: Error | null }> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('is_active', true)
            .order('price_monthly', { ascending: true });

        return { data: data || [], error };
    },

    /**
     * Get all plans (admin use)
     */
    async getAllPlans(): Promise<{ data: Plan[]; error: Error | null }> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('price_monthly', { ascending: true });

        return { data: data || [], error };
    },

    /**
     * Get single plan by ID
     */
    async getPlan(id: string): Promise<{ data: Plan | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('id', id)
            .single();

        return { data: data || null, error };
    },

    /**
     * Create a new plan
     */
    async createPlan(plan: PlanInsert): Promise<{ data: Plan | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('plans')
            .insert(plan)
            .select()
            .single();

        return { data: data || null, error };
    },

    /**
     * Update an existing plan
     */
    async updatePlan(id: string, updates: PlanUpdate): Promise<{ data: Plan | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('plans')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        return { data: data || null, error };
    },

    /**
     * Delete (or soft delete) a plan
     */
    async deletePlan(id: string): Promise<{ error: Error | null }> {
        // Ideally just soft delete, but for CRUD completeness we'll allow delete if no constraints
        const { error } = await supabase
            .from('plans')
            .delete()
            .eq('id', id);
        return { error };
    },

    /**
     * Assign a plan to a user (Create/Update Subscription)
     */
    async assignPlanToUser(userId: string, planId: string): Promise<{ data: Subscription | null; error: Error | null }> {
        // 1. Get Plan Details
        const { data: plan, error: planError } = await this.getPlan(planId);
        if (planError || !plan) {
            return { data: null, error: planError || new Error('Plan not found') };
        }

        // 2. Handle specific logic for downgrades/upgrades if needed.
        // For now, simpler "switch immediately" logic.

        // 3. Update/Insert Subscription
        // We use UPSERT on user_id if we enforce 1 sub per user, but table PK is ID.
        // Needs logic to find existing active sub or just insert new one and cancel old?
        // Let's assume 1 active sub per user.

        // First cancel any existing active subscription for safety (if multiple allowed in DB design)
        // OR just Upsert if we have a constraint. 
        // Let's try to look for existing first.
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        let subOp;
        if (existingSub) {
            subOp = supabase
                .from('subscriptions')
                .update({
                    plan_id: planId,
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'active'
                })
                .eq('id', existingSub.id)
                .select()
                .single();
        } else {
            subOp = supabase
                .from('subscriptions')
                .insert({
                    user_id: userId,
                    plan_id: planId,
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                })
                .select()
                .single();
        }

        const { data: subData, error: subError } = await subOp;
        if (subError) {
            return { data: null, error: subError };
        }

        // 4. Allocate Credits
        // "Immediate" allocation strategy. 
        // Note: For downgrades, we might want to NOT add credits or handle pro-rata.
        // The requirement "Preserve credit rules" suggests we should add credits if it's a paid plan or refresh.
        // Simple logic: If switching plans, grant the new plan's monthly credits immediately?
        // Or should we trust the `credits_ledger` is separate?
        // Task: "Each plan MUST include: Credit allocation"
        // Let's add the credits.
        if (plan.credits_monthly > 0) {
            await creditService.addCredits(
                userId,
                plan.credits_monthly,
                `Plan subscription: ${plan.name}`
            );
        }

        return { data: subData as unknown as Subscription, error: null };
    },

    /**
     * Check if user has access to a feature (Server-side gate helper)
     */
    async checkFeatureAccess(userId: string, featureKey: string): Promise<boolean> {
        // 1. Get User's Active Plan
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan_id, plans(*)') // join plans
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (!sub || !sub.plans) return false; // No plan = no access? Or check Free plan?

        // 2. Check Plan Features
        // features is Json type. specific structure depends on Admin input.
        // We assume features is an array of strings for now.
        const plan = sub.plans as unknown as Plan;
        if (Array.isArray(plan.features)) {
            // Simple string match or complex object?
            // "Limits" could be objects e.g. { "max_interviews": 10 }
            // For simple "Access", check string existence
            return plan.features.some((f: any) => f === featureKey || (typeof f === 'string' && f.includes(featureKey)));
        }

        return false;
    }
};
