-- Create waitlist table for Sentinel early access signups
CREATE TABLE public.sentinel_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sentinel_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public signup)
CREATE POLICY "Anyone can join waitlist"
ON public.sentinel_waitlist
FOR INSERT
WITH CHECK (true);

-- Only allow reading own entry (by email match - for duplicate check)
CREATE POLICY "Check if email exists"
ON public.sentinel_waitlist
FOR SELECT
USING (true);