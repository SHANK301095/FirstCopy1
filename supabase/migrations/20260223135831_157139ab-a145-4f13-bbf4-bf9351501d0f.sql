ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trader_goal text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamp with time zone DEFAULT NULL;