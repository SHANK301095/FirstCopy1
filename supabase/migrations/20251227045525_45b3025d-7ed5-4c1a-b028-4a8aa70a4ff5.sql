-- Add symbol column to datasets table for Symbol Folders
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS symbol TEXT DEFAULT 'UNKNOWN';

-- Add date range columns for datasets
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS range_from_ts BIGINT,
ADD COLUMN IF NOT EXISTS range_to_ts BIGINT,
ADD COLUMN IF NOT EXISTS timeframe TEXT DEFAULT 'Unknown',
ADD COLUMN IF NOT EXISTS source_name TEXT;

-- Add username column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for symbol lookups
CREATE INDEX IF NOT EXISTS idx_datasets_symbol ON public.datasets(symbol);
CREATE INDEX IF NOT EXISTS idx_datasets_user_symbol ON public.datasets(user_id, symbol);

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update the handle_new_user function to also set username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, username)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'username', NULL)
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;