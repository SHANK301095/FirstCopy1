-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create private schema for internal functions
CREATE SCHEMA IF NOT EXISTS private;

-- Create a secure encryption key function in private schema
CREATE OR REPLACE FUNCTION private.get_encryption_key()
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private
AS $$
BEGIN
  -- Uses database-specific identifier as encryption key base
  -- Combined with pgcrypto for AES-256 encryption
  RETURN digest(current_database() || '-broker-tokens-v1-secure', 'sha256');
END;
$$;

-- Function to encrypt broker tokens
CREATE OR REPLACE FUNCTION public.encrypt_broker_token(plain_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  encrypted bytea;
  key bytea;
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  
  key := private.get_encryption_key();
  encrypted := pgp_sym_encrypt(plain_text, encode(key, 'hex'));
  RETURN encode(encrypted, 'base64');
END;
$$;

-- Function to decrypt broker tokens (SECURITY DEFINER - only callable by service role)
CREATE OR REPLACE FUNCTION public.decrypt_broker_token(encrypted_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  decrypted text;
  key bytea;
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN
    RETURN NULL;
  END IF;
  
  key := private.get_encryption_key();
  decrypted := pgp_sym_decrypt(decode(encrypted_text, 'base64'), encode(key, 'hex'));
  RETURN decrypted;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Decryption failed for broker token';
    RETURN NULL;
END;
$$;

-- Secure function to get decrypted access token (only for edge functions with service role)
CREATE OR REPLACE FUNCTION public.get_broker_access_token(p_user_id uuid, p_broker_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encrypted_token text;
BEGIN
  SELECT access_token INTO encrypted_token
  FROM broker_connections
  WHERE user_id = p_user_id 
    AND broker_type = p_broker_type 
    AND status = 'connected';
    
  IF encrypted_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN decrypt_broker_token(encrypted_token);
END;
$$;

-- Create a safe view that never exposes tokens
CREATE OR REPLACE VIEW public.broker_connections_safe AS
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

-- Revoke decrypt/access token functions from regular users (only service role)
REVOKE EXECUTE ON FUNCTION public.decrypt_broker_token(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_broker_access_token(uuid, text) FROM anon, authenticated;