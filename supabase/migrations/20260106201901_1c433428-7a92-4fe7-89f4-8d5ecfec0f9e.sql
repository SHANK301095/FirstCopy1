-- Fix search_path for trigger function (security linter)
CREATE OR REPLACE FUNCTION public.set_profile_private_data_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
