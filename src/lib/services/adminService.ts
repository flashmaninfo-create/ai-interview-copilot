import { supabase } from '../supabase';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type DBProvider = Database['public']['Tables']['llm_providers']['Row'];
type LLMModel = Database['public']['Tables']['llm_models']['Row'];
type DBPlan = Database['public']['Tables']['plans']['Row'];

export interface CreditPlan {
    id: string;
    name: string;
    price: number;
    credits: number;
    features: string[];
    popular?: boolean;
    currency?: string;
    active: boolean;
}

export interface LLMProvider {
    id: string;
    name: string;
    provider: string; // 'openai' | 'anthropic' | 'google' | 'custom'
    apiKey: string;
    enabled: boolean;
    isCustom: boolean;
    baseUrl?: string;
}

export const adminService = {
    // === Users ===
    async getUsers() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Profile[];
    },

    async updateUserRole(userId: string, role: 'user' | 'admin') {
        const { error } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', userId);

        if (error) throw error;
    },

    async updateAdminProfile(userId: string, updates: { full_name?: string }) {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId);

        if (error) throw error;
    },

    async updateAdminPassword(userId: string, newPassword: string) {
        const { error } = await supabase.rpc('admin_update_user_password', {
            target_user_id: userId,
            new_password: newPassword
        });

        if (error) throw error;
    },

    async deleteUser(userId: string) {
        const { error } = await supabase.rpc('admin_delete_user', {
            target_user_id: userId
        });

        if (error) throw error;
    },

    // New RPC to fetch users with ban status
    async getRegisteredUsers() {
        // We use the RPC to get ban status as well
        const { data, error } = await supabase.rpc('admin_get_users_with_status');
        
        if (error) throw error;
        return data as (Profile & { banned_until: string | null })[];
    },

    async toggleUserBan(userId: string, banUntil: string | null) {
        const { error } = await supabase.rpc('admin_toggle_ban_user', {
            target_user_id: userId,
            ban_until: banUntil
        });
        if (error) throw error;
    },

    // === Contact Messages ===
    async getContactMessages() {
        const { data, error } = await supabase
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data as {
            id: string;
            first_name: string;
            last_name: string;
            email: string;
            subject: string;
            message: string;
            status: 'read' | 'unread';
            created_at: string;
        }[];
    },

    async updateMessageStatus(id: string, status: 'read' | 'unread') {
        const { error } = await supabase
            .from('contact_messages')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    },

    async deleteMessage(id: string) {
        const { error } = await supabase
            .from('contact_messages')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createAdmin(email: string, password: string, fullName: string) {
        // Create a temporary client to avoid logging out the current admin
        const tempClient = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: false // Critical: Don't persist this session
                }
            }
        );

        // 1. Create the user
        const { data: authData, error: authError } = await tempClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');

        // 2. Update the profile role to admin immediately
        // Note: This requires the current admin (authenticated client) to perform the update
        // because the new user (tempClient) might not have permission to set their own role to admin depending on RLS.
        // We use the main `supabase` client here which is authenticated as the current admin.
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ 
                role: 'admin',
                full_name: fullName // Ensure name is set in profile
            })
            .eq('id', authData.user.id);

        if (profileError) {
            // If we fail to make them admin, we should probably warn or try to cleanup
            console.error('Failed to promote new user to admin:', profileError);
            throw new Error('User created but failed to promote to admin: ' + profileError.message);
        }

        return authData.user;
    },

    // === LLM Providers ===
    async getProviders(): Promise<LLMProvider[]> {
        const { data, error } = await supabase
            .from('llm_providers')
            .select('*')
            .order('name');

        if (error) throw error;
        
        return (data as DBProvider[]).map(p => ({
            id: p.id,
            name: p.name,
            provider: p.slug, // Assuming slug stores 'openai', 'anthropic' etc.
            apiKey: p.api_key_encrypted || '', // In real app, this should be handled carefully
            enabled: p.enabled,
            isCustom: p.slug === 'custom' || p.slug === 'local', // heuristic
            baseUrl: p.api_base_url || undefined
        }));
    },

    async getProvider(id: string): Promise<LLMProvider | null> {
        const { data, error } = await supabase
            .from('llm_providers')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        const p = data as DBProvider;
        return {
            id: p.id,
            name: p.name,
            provider: p.slug,
            apiKey: p.api_key_encrypted || '',
            enabled: p.enabled,
            isCustom: p.slug === 'custom' || p.slug === 'local',
            baseUrl: p.api_base_url || undefined
        };
    },

    async saveProvider(provider: LLMProvider) {
        // Map frontend interface back to DB columns
        const dbPayload = {
            id: provider.id,
            name: provider.name,
            slug: provider.provider, // Storing provider type in slug
            api_key_encrypted: provider.apiKey, // Assuming plain text for now as per previous comment
            enabled: provider.enabled,
            api_base_url: provider.baseUrl || null,
            // Config could store extra fields if needed
            config: provider.isCustom ? { custom: true } : null 
        };

        const { error } = await supabase
            .from('llm_providers')
            .upsert(dbPayload);

        if (error) throw error;
    },

    async deleteProvider(id: string) {
        const { error } = await supabase
            .from('llm_providers')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async toggleProvider(id: string, enabled: boolean) {
        const { error } = await supabase
            .from('llm_providers')
            .update({ enabled })
            .eq('id', id);

        if (error) throw error;
    },

    // === LLM Models ===
    async getModels(providerId: string) {
        const { data, error } = await supabase
            .from('llm_models')
            .select('*')
            .eq('provider_id', providerId)
            .order('name');

        if (error) throw error;
        return data as LLMModel[];
    },

    async createModel(providerId: string, name: string, modelId: string, costPerToken: number) {
        const { data, error } = await supabase
            .from('llm_models')
            .insert({
                provider_id: providerId,
                name,
                model_id: modelId,
                cost_per_token: costPerToken,
                enabled: true
            })
            .select()
            .single();

        if (error) throw error;
        return data as LLMModel;
    },

    async toggleModel(id: string, enabled: boolean) {
        const { error } = await supabase
            .from('llm_models')
            .update({ enabled })
            .eq('id', id);

        if (error) throw error;
    },

    // === System Logs ===
    async getSystemLogs() {
        return [
            { id: '1', time: new Date().toISOString(), event: 'System Start', user: 'system', details: 'Server initialized' }
        ];
    },

    // === App Config ===
    async getAppConfig(key: string) {
        const { data, error } = await supabase
            .from('app_config')
            .select('value')
            .eq('key', key)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data?.value || null;
    },

    async setAppConfig(key: string, value: any) {
        const { error } = await supabase
            .from('app_config')
            .upsert({ key, value });

        if (error) throw error;
    },

    // === Plans ===
    async getCreditPlans(): Promise<CreditPlan[]> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('price_monthly');

        if (error) throw error;
        const plans = data as DBPlan[];

        return plans.map(p => ({
            id: p.id,
            name: p.name,
            price: p.price_monthly,
            credits: p.credits_monthly,
            features: Array.isArray(p.features) ? p.features.map(String) : [],
            active: p.is_active ?? false,
            // Defaults as these aren't in DB yet
            popular: false,
            currency: 'INR'
        }));
    },

    async getCreditPlan(id: string): Promise<CreditPlan | null> {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        
        const p = data as DBPlan;
        return {
            id: p.id,
            name: p.name,
            price: p.price_monthly,
            credits: p.credits_monthly,
            features: Array.isArray(p.features) ? p.features.map(String) : [],
            active: p.is_active ?? false,
            popular: false,
            currency: 'INR'
        };
    },

    async saveCreditPlan(plan: CreditPlan) {
        const slug = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        const dbPayload = {
            id: plan.id,
            name: plan.name,
            slug: slug,
            price_monthly: plan.price,
            credits_monthly: plan.credits,
            features: plan.features,
            is_active: plan.active,
            // Not storing popular/currency in DB yet as per schema
        };

        const { error } = await supabase
            .from('plans')
            .upsert(dbPayload);

        if (error) throw error;
    },

    async deleteCreditPlan(id: string) {
        const { error } = await supabase
            .from('plans')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
