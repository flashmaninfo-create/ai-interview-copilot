export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    created_at: string
                    role: 'user' | 'admin'
                    avatar_url: string | null
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    created_at?: string
                    role?: 'user' | 'admin'
                    avatar_url?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    created_at?: string
                    role?: 'user' | 'admin'
                    avatar_url?: string | null
                }
            }
            credits_ledger: {
                Row: {
                    id: string
                    user_id: string
                    amount: number
                    description: string
                    created_at: string
                    metadata: Json | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    amount: number
                    description: string
                    created_at?: string
                    metadata?: Json | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    amount?: number
                    description?: string
                    created_at?: string
                    metadata?: Json | null
                }
            }
            llm_providers: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    api_key: string | null
                    enabled: boolean
                    config: Json | null
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    api_key?: string | null
                    enabled?: boolean
                    config?: Json | null
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    api_key?: string | null
                    enabled?: boolean
                    config?: Json | null
                }
            }
            llm_models: {
                Row: {
                    id: string
                    provider_id: string
                    name: string
                    model_id: string
                    enabled: boolean
                    cost_per_token: number
                }
                Insert: {
                    id?: string
                    provider_id: string
                    name: string
                    model_id: string
                    enabled?: boolean
                    cost_per_token?: number
                }
                Update: {
                    id?: string
                    provider_id: string
                    name: string
                    model_id: string
                    enabled?: boolean
                    cost_per_token?: number
                }
            }
            plans: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    price_monthly: number
                    credits_monthly: number
                    features: Json | null
                    transcript: Json[] | null
                    score: number | null
                    summary: string | null
                    is_active: boolean | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    price_monthly: number
                    credits_monthly: number
                    features?: Json | null
                    transcript?: Json[] | null
                    score?: number | null
                    summary?: string | null
                    is_active?: boolean | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    price_monthly?: number
                    credits_monthly?: number
                    features?: Json | null
                    transcript?: Json[] | null
                    score?: number | null
                    summary?: string | null
                    is_active?: boolean | null
                    created_at?: string
                }
            }
            subscriptions: {
                Row: {
                    id: string
                    user_id: string
                    plan_id: string
                    status: 'active' | 'cancelled' | 'past_due' | null
                    current_period_start: string | null
                    current_period_end: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    plan_id: string
                    status?: 'active' | 'cancelled' | 'past_due' | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    plan_id?: string
                    status?: 'active' | 'cancelled' | 'past_due' | null
                    current_period_start?: string | null
                    current_period_end?: string | null
                    created_at?: string
                }
            }
            sync_messages: {
                Row: {
                    id: string
                    session_id: string
                    message_type: string
                    payload: Json | null
                    source: 'extension' | 'console'
                    created_at: string
                }
                Insert: {
                    id?: string
                    session_id: string
                    message_type: string
                    payload?: Json | null
                    source: 'extension' | 'console'
                    created_at?: string
                }
                Update: {
                    id?: string
                    session_id?: string
                    message_type?: string
                    payload?: Json | null
                    source?: 'extension' | 'console'
                    created_at?: string
                }
            }
            interview_sessions: {
                Row: {
                    id: string
                    user_id: string
                    status: 'created' | 'active' | 'completed' | 'failed' | 'cancelled' | null
                    role: string
                    type: string
                    difficulty: string | null
                    started_at: string | null
                    ended_at: string | null
                    score: number | null
                    summary: string | null
                    transcript: Json[] | null
                    questions: Json[] | null
                    ai_responses: Json[] | null
                    screenshots: Json[] | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    status?: 'created' | 'active' | 'completed' | 'failed' | 'cancelled' | null
                    role: string
                    type: string
                    difficulty?: string | null
                    started_at?: string | null
                    ended_at?: string | null
                    score?: number | null
                    summary?: string | null
                    transcript?: Json[] | null
                    questions?: Json[] | null
                    ai_responses?: Json[] | null
                    screenshots?: Json[] | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    status?: 'created' | 'active' | 'completed' | 'failed' | 'cancelled' | null
                    role?: string
                    type?: string
                    difficulty?: string | null
                    started_at?: string | null
                    ended_at?: string | null
                    score?: number | null
                    summary?: string | null
                    transcript?: Json[] | null
                    questions?: Json[] | null
                    ai_responses?: Json[] | null
                    screenshots?: Json[] | null
                    created_at?: string
                }
            }
        }
        Views: {
            user_credits: {
                Row: {
                    user_id: string
                    balance: number
                }
            }
        }
    }
}
