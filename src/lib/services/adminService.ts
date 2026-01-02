import { supabase } from '../supabase';
import type { Database } from '../../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type LLMProvider = Database['public']['Tables']['llm_providers']['Row'];
type LLMModel = Database['public']['Tables']['llm_models']['Row'];

export const adminService = {
    // === Users ===
    async getUsers() {
        // In a real app, this should be paginated and likely an Edge Function
        // because "profiles" might be RLS restricted to only admin view.
        // Assuming RLS policy "Admins view all" is set.
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
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

    // === LLM Providers ===
    async getProviders() {
        const { data, error } = await supabase
            .from('llm_providers')
            .select('*')
            .order('name');

        if (error) throw error;
        return data as LLMProvider[];
    },

    async toggleProvider(id: string, enabled: boolean) {
        const { error } = await supabase
            .from('llm_providers')
            .update({ enabled })
            .eq('id', id);

        if (error) throw error;
    },

    async updateProviderKey(id: string, apiKey: string) {
        // Ideally this goes to an Edge Function to encrypt before storing
        const { error } = await supabase
            .from('llm_providers')
            .update({ api_key: apiKey }) // WARNING: Storing plain text for now, needs encryption in prod
            .eq('id', id);

        if (error) throw error;
    },

    async createProvider(name: string, slug: string) {
        const { data, error } = await supabase
            .from('llm_providers')
            .insert({ name, slug, enabled: true })
            .select()
            .single();

        if (error) throw error;
        return data as LLMProvider;
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
    // Assuming we might have a logs table or fetch from auth logs
    async getSystemLogs() {
        // Mocking for now as specific log table wasn't in original schema but requested in UI
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

        if (error && error.code !== 'PGRST116') throw error; // Ignore not found
        return data?.value || null;
    },

    async setAppConfig(key: string, value: any) {
        const { error } = await supabase
            .from('app_config')
            .upsert({ key, value });

        if (error) throw error;
    },

    // === Plans ===
    async getPlans() {
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('price_monthly');

        if (error) throw error;
        return data as Database['public']['Tables']['plans']['Row'][];
    },

    async createPlan(name: string, price: number, credits: number, features: string[]) {
        const { data, error } = await supabase
            .from('plans')
            .insert({
                name,
                price_monthly: price,
                credits_monthly: credits,
                features: features, // JSON array
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async togglePlan(id: string, isActive: boolean) {
        const { error } = await supabase
            .from('plans')
            .update({ is_active: isActive })
            .eq('id', id);

        if (error) throw error;
    }
};
