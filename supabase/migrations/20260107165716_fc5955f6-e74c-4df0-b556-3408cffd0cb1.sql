-- Drop and recreate view with SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.broker_connections_safe;

CREATE VIEW public.broker_connections_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  broker_type,
  display_name,
  account_id,
  status,
  last_sync_at,
  token_expiry,
  metadata,
  created_at,
  updated_at
FROM broker_connections;

-- Grant access to authenticated users on the safe view
GRANT SELECT ON public.broker_connections_safe TO authenticated;