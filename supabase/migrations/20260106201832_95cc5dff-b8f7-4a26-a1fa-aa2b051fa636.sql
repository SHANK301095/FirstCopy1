-- Move sensitive phone numbers out of public.profiles into a private table

CREATE TABLE IF NOT EXISTS public.profile_private_data (
  user_id UUID NOT NULL PRIMARY KEY,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_private_data ENABLE ROW LEVEL SECURITY;

-- RLS: users can manage only their own private data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profile_private_data' AND policyname = 'Users can view own private profile data'
  ) THEN
    CREATE POLICY "Users can view own private profile data"
    ON public.profile_private_data
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profile_private_data' AND policyname = 'Users can insert own private profile data'
  ) THEN
    CREATE POLICY "Users can insert own private profile data"
    ON public.profile_private_data
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profile_private_data' AND policyname = 'Users can update own private profile data'
  ) THEN
    CREATE POLICY "Users can update own private profile data"
    ON public.profile_private_data
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profile_private_data' AND policyname = 'Users can delete own private profile data'
  ) THEN
    CREATE POLICY "Users can delete own private profile data"
    ON public.profile_private_data
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_profile_private_data_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profile_private_data_updated_at ON public.profile_private_data;
CREATE TRIGGER set_profile_private_data_updated_at
BEFORE UPDATE ON public.profile_private_data
FOR EACH ROW
EXECUTE FUNCTION public.set_profile_private_data_updated_at();

-- Backfill existing phones
INSERT INTO public.profile_private_data (user_id, phone)
SELECT id, phone
FROM public.profiles
WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
SET phone = EXCLUDED.phone;

-- Remove phone from public profiles to prevent any exposure via public reads
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;
