-- Fix security definer view issue by recreating as regular view with proper RLS
DROP VIEW IF EXISTS public.broker_connections_safe;

-- Create as regular view (not security definer)
CREATE OR REPLACE VIEW public.broker_connections_safe 
WITH (security_invoker = true) AS
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

-- Ensure RLS is enforced on the base table
ALTER TABLE public.broker_connections FORCE ROW LEVEL SECURITY;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.broker_connections_safe TO authenticated;