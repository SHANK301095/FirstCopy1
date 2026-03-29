-- Create premium_trials table for 3-day trial system
CREATE TABLE public.premium_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '3 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.premium_trials ENABLE ROW LEVEL SECURITY;

-- Users can view their own trial
CREATE POLICY "Users can view their own trial" 
ON public.premium_trials 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can start their own trial (only once due to UNIQUE constraint)
CREATE POLICY "Users can start their own trial" 
ON public.premium_trials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to check if user has active trial
CREATE OR REPLACE FUNCTION public.has_active_trial(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.premium_trials 
    WHERE user_id = _user_id 
    AND expires_at > now()
  );
END;
$$;

-- Update is_premium_user function to include trial check
CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has premium role
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = 'premium'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has active trial
  IF EXISTS (
    SELECT 1 FROM public.premium_trials 
    WHERE user_id = _user_id 
    AND expires_at > now()
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;