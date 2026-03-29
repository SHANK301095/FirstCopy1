-- Drop and recreate the view with security_invoker to enforce RLS from underlying table
DROP VIEW IF EXISTS public.broker_connections_safe;

CREATE VIEW public.broker_connections_safe
WITH (security_invoker = on)
AS
SELECT
    id,
    user_id,
    broker_type,
    display_name,
    account_id,
    status,
    token_expiry,
    last_sync_at,
    metadata,
    created_at,
    updated_at
FROM public.broker_connections;

-- Grant access only to authenticated users (not anon)
REVOKE ALL ON public.broker_connections_safe FROM anon;
REVOKE ALL ON public.broker_connections_safe FROM public;
GRANT SELECT ON public.broker_connections_safe TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.broker_connections_safe IS 'Safe view of broker_connections that excludes sensitive tokens. RLS enforced via security_invoker from underlying broker_connections table.';