-- Add phone column to waitlist
ALTER TABLE public.sentinel_waitlist 
ADD COLUMN phone TEXT UNIQUE;

-- Make email optional (for existing signups)
ALTER TABLE public.sentinel_waitlist 
ALTER COLUMN email DROP NOT NULL;