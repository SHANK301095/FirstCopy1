-- Add unique constraint on user_id + broker_type for upsert to work
ALTER TABLE public.broker_connections 
ADD CONSTRAINT broker_connections_user_broker_unique 
UNIQUE (user_id, broker_type);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_broker_connections_user_broker 
ON public.broker_connections(user_id, broker_type);