
import { supabase } from '../supabase';
import type { Database } from '../../types/database.types';

type LLMProvider = Database['public']['Tables']['llm_providers']['Row'];
type LLMModel = Database['public']['Tables']['llm_models']['Row'];
type LLMProviderInsert = Database['public']['Tables']['llm_providers']['Insert'];
type LLMModelInsert = Database['public']['Tables']['llm_models']['Insert'];

export interface ModelResolution {
    provider: LLMProvider;
    model: LLMModel;
    source: 'user_preference' | 'admin_default' | 'fallback';
}

export const llmService = {
    /**
     * Get all providers (Admin only should see keys)
     */
    async getProviders(): Promise<{ data: LLMProvider[]; error: Error | null }> {
        const { data, error } = await supabase
            .from('llm_providers')
            .select('*')
            .order('name');
        return { data: data || [], error };
    },

    /**
     * Get a single provider
     */
    async getProvider(id: string): Promise<{ data: LLMProvider | null; error: Error | null }> {
        const { data, error } = await supabase
            .from('llm_providers')
            .select('*')
            .eq('id', id)
            .single();
        return { data: data || null, error };
    },

    /**
     * Create or Update Provider
     * If api_key is empty string/undefined in updates, do not overwrite existing unless null explicitly passed?
     * Supabase update: passes what is in object.
     */
    async upsertProvider(provider: LLMProviderInsert): Promise<{ error: Error | null }> {
        // Prepare payload, removing undefined fields if necessary, or just trust caller.
        const { error } = await supabase
            .from('llm_providers')
            .upsert(provider);
        return { error };
    },

    /**
     * Delete Provider
     */
    async deleteProvider(id: string): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('llm_providers')
            .delete()
            .eq('id', id);
        return { error };
    },

    /**
     * Enable a provider and disable all others (Single Active Provider)
     */
    async enableProvider(providerId: string): Promise<{ error: Error | null }> {
        // 1. Disable all others
        const { error: disableError } = await supabase
            .from('llm_providers')
            .update({ enabled: false })
            .neq('id', providerId);

        if (disableError) return { error: disableError };

        // 2. Enable target
        const { error } = await supabase
            .from('llm_providers')
            .update({ enabled: true })
            .eq('id', providerId);

        return { error };
    },

    /**
     * Get models for a provider
     */
    async getModels(providerId: string): Promise<{ data: LLMModel[]; error: Error | null }> {
        const { data, error } = await supabase
            .from('llm_models')
            .select('*')
            .eq('provider_id', providerId)
            .order('name');
        return { data: data || [], error };
    },

    /**
     * Get ALL enabled models (for User Settings)
     */
    async getAvailableModels(): Promise<{ data: LLMModel[]; error: Error | null }> {
        // Join provider to ensure provider is enabled too
        const { data, error } = await supabase
            .from('llm_models')
            .select('*, llm_providers!inner(enabled)') // inner join filters models where provider is enabled?
            .eq('enabled', true)
            .eq('llm_providers.enabled', true);

        return { data: data || [], error };
    },

    /**
     * Upsert Model
     */
    async upsertModel(model: LLMModelInsert): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('llm_models')
            .upsert(model);
        return { error };
    },

    /**
     * Delete Model
     */
    async deleteModel(id: string): Promise<{ error: Error | null }> {
        const { error } = await supabase
            .from('llm_models')
            .delete()
            .eq('id', id);
        return { error };
    },

    /**
     * Resolve the best model for a user/task
     */
    async resolveModel(_userId: string): Promise<{ data: ModelResolution | null; error: Error | null }> {
        try {
            // 1. Check User Preference
            // 1. User Preference (DEPRECATED/REMOVED)
            // Users no longer choose models. Admin controls this globally.
            /*
            const prefId = localStorage.getItem('preferred_model_id');
            if (prefId) { ... }
            */

            // 2. Get Subscription Plan Limits (TODO: Check plan features)
            // const sub = await subscriptionService.getSubscription(userId);
            // Check if plan allows specific models? 
            // Phase 7 "Plan features" might have "access_to_gpt4".

            // 3. Fallback to Admin Default (First enabled model?)
            // Let's try to find *any* enabled model.

            const { data: models, error } = await this.getAvailableModels();
            if (error || !models || models.length === 0) {
                return { data: null, error: new Error('No available models found') };
            }

            // Simple Logic: Pick the first one (or cheapest?)
            // Improvement: Define a "default" flag in DB. For now, first one.
            const selectedModel = models[0];

            // Fetch full provider details (keys)
            const { data: provider } = await this.getProvider(selectedModel.provider_id);
            if (!provider) return { data: null, error: new Error('Provider not found') };

            return {
                data: {
                    provider,
                    model: selectedModel,
                    source: 'fallback' // or 'admin_default'
                },
                error: null
            };

        } catch (err) {
            console.error("Resolution error:", err);
            return { data: null, error: err as Error };
        }
    }
};
