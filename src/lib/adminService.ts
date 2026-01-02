import type { LLMProvider, LLMModel } from '../types/admin';
import { mockProviders } from '../types/admin';

/**
 * Admin Service - Mock implementation
 * In production, these would call Supabase tables
 */

let providers = [...mockProviders];

export async function getProviders(): Promise<{ data: LLMProvider[]; error: Error | null }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
    return { data: providers, error: null };
}

export async function updateProvider(
    id: string,
    updates: Partial<LLMProvider>
): Promise<{ data: LLMProvider | null; error: Error | null }> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const index = providers.findIndex(p => p.id === id);
    if (index === -1) {
        return { data: null, error: new Error('Provider not found') };
    }

    providers[index] = { ...providers[index], ...updates };
    return { data: providers[index], error: null };
}

export async function setProviderApiKey(
    id: string,
    apiKey: string
): Promise<{ error: Error | null }> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const index = providers.findIndex(p => p.id === id);
    if (index === -1) {
        return { error: new Error('Provider not found') };
    }

    // In production, this would securely store the key
    providers[index].api_key_set = apiKey.length > 0;
    return { error: null };
}

export async function getModels(
    providerId: string
): Promise<{ data: LLMModel[]; error: Error | null }> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const provider = providers.find(p => p.id === providerId);
    if (!provider) {
        return { data: [], error: new Error('Provider not found') };
    }

    return { data: provider.models, error: null };
}

export async function updateModel(
    providerId: string,
    modelId: string,
    updates: Partial<LLMModel>
): Promise<{ data: LLMModel | null; error: Error | null }> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const providerIndex = providers.findIndex(p => p.id === providerId);
    if (providerIndex === -1) {
        return { data: null, error: new Error('Provider not found') };
    }

    const modelIndex = providers[providerIndex].models.findIndex(m => m.id === modelId);
    if (modelIndex === -1) {
        return { data: null, error: new Error('Model not found') };
    }

    providers[providerIndex].models[modelIndex] = {
        ...providers[providerIndex].models[modelIndex],
        ...updates,
    };

    return { data: providers[providerIndex].models[modelIndex], error: null };
}
