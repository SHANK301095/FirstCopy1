-- Check if user has premium role
CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
    AND role::text = 'premium'
  )
$$;

-- Get daily usage count for a feature
CREATE OR REPLACE FUNCTION public.get_daily_ai_usage(_user_id uuid, _feature text)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::int, 0)
  FROM public.ai_usage
  WHERE user_id = _user_id
    AND feature = _feature
    AND created_at >= CURRENT_DATE
$$;