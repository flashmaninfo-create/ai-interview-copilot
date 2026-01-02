-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    avatar_url TEXT
);

-- 2. Credits Ledger (Atomic Transactions)
CREATE TABLE public.credits_ledger (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount INTEGER NOT NULL, -- Positive for add, negative for spend
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metadata JSONB
);

-- View for Current Balance (Use this for checking credits)
CREATE OR REPLACE VIEW public.user_credits AS
SELECT 
    user_id,
    SUM(amount) as balance
FROM public.credits_ledger
GROUP BY user_id;

-- 3. LLM Providers (Admin Managed)
CREATE TABLE public.llm_providers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- e.g. 'openai', 'anthropic'
    api_key TEXT, -- Encrypted/Hidden in real implementation
    enabled BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE public.llm_models (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES public.llm_providers(id),
    name TEXT NOT NULL, -- Display Name
    model_id TEXT NOT NULL, -- API Model ID (e.g. 'gpt-4')
    enabled BOOLEAN DEFAULT true,
    cost_per_token NUMERIC(10, 8) DEFAULT 0
);

-- 4. Interview Sessions
CREATE TABLE public.interview_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'failed', 'cancelled')),
    role TEXT NOT NULL,
    type TEXT NOT NULL, -- technical, behavioral
    difficulty TEXT DEFAULT 'medium',
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC(3, 1),
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Session Transcripts/Events
CREATE TABLE public.session_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.interview_sessions(id) NOT NULL,
    type TEXT NOT NULL, -- 'user_msg', 'ai_msg', 'system_event'
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Plans & Pricing
CREATE TABLE public.plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- Free, Pro, Enterprise
    slug TEXT UNIQUE NOT NULL,
    price_monthly INTEGER NOT NULL, -- in cents
    credits_monthly INTEGER NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    transcript JSONB[] DEFAULT '{}',
    score INTEGER, -- 0-100 or 0-10
    summary TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    plan_id UUID REFERENCES public.plans(id) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. App Configuration (Admin Settings)
CREATE TABLE public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- RLS POLICIES --

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can see own, Admins can see all
CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Credits: Users view own ledger, Admins view all
CREATE POLICY "Users view own credits" ON public.credits_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Sessions: Users view own, Admins view all
CREATE POLICY "Users view own sessions" ON public.interview_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert sessions" ON public.interview_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions" ON public.interview_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Events: Users view own session events
CREATE POLICY "Users view own session events" ON public.session_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions
            WHERE id = session_events.session_id AND user_id = auth.uid()
        )
    );

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  
  -- Give free starter credits
  INSERT INTO public.credits_ledger (user_id, amount, description)
  VALUES (new.id, 1, 'Welcome Bonus');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- LLM Providers/Models:
CREATE POLICY "Admins full access llm_providers" ON public.llm_providers
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Public read llm_models" ON public.llm_models
    FOR SELECT USING (enabled = true);

CREATE POLICY "Admins full access llm_models" ON public.llm_models
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Plans: Public Read, Admin Write
CREATE POLICY "Public read plans" ON public.plans
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins full access plans" ON public.plans
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Subscriptions: Users View Own, Admins View All
CREATE POLICY "Users view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins full access subscriptions" ON public.subscriptions
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- App Config: Public Read, Admin Write
CREATE POLICY "Public read app_config" ON public.app_config
    FOR SELECT USING (true);

CREATE POLICY "Admins write app_config" ON public.app_config
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
