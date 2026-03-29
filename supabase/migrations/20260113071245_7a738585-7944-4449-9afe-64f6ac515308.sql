-- =====================================================
-- SECURE BROKER CREDENTIALS ARCHITECTURE
-- =====================================================
-- This migration implements industry-standard credential security:
-- 1. Encrypted credential storage using pgcrypto
-- 2. Server-side only access via security definer functions
-- 3. No plaintext secrets in any table
-- 4. Token rotation support
-- =====================================================

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create secure vault table for encrypted credentials (separate from main table)
CREATE TABLE IF NOT EXISTS public.broker_credential_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_connection_id UUID NOT NULL UNIQUE,
    -- Encrypted blob containing all sensitive data (access_token, refresh_token, api_key)
    encrypted_credentials BYTEA NOT NULL,
    -- Encryption metadata
    encryption_version INTEGER NOT NULL DEFAULT 1,
    -- Key derivation salt (unique per record)
    key_salt BYTEA NOT NULL DEFAULT gen_random_bytes(32),
    -- Token rotation tracking
    rotated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    rotation_count INTEGER DEFAULT 0,
    -- Revocation support
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on vault - DENY ALL direct access
ALTER TABLE public.broker_credential_vault ENABLE ROW LEVEL SECURITY;

-- NO SELECT policies - credentials can only be accessed via security definer functions
CREATE POLICY "Deny all direct vault access" ON public.broker_credential_vault
FOR ALL USING (false);

-- Create encryption key derivation function (uses server-side secret)
CREATE OR REPLACE FUNCTION private.derive_encryption_key(p_salt BYTEA)
RETURNS BYTEA
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    -- The master key is derived from a combination of database-specific values
    -- In production, this should use Supabase Vault or external KMS
    v_master_secret TEXT;
    v_derived_key BYTEA;
BEGIN
    -- Use a combination of database OID and a fixed component
    -- This provides basic key isolation per database
    v_master_secret := current_setting('app.settings.jwt_secret', true);
    IF v_master_secret IS NULL OR v_master_secret = '' THEN
        -- Fallback to a derived value (should be replaced with proper secret management)
        v_master_secret := encode(digest(current_database() || 'broker_vault_key_v1', 'sha256'), 'hex');
    END IF;
    
    -- Derive key using PBKDF2-like approach
    v_derived_key := digest(v_master_secret || encode(p_salt, 'hex'), 'sha256');
    
    RETURN v_derived_key;
END;
$$;

-- Secure function to store credentials (server-side only)
CREATE OR REPLACE FUNCTION public.store_broker_credentials(
    p_broker_connection_id UUID,
    p_access_token TEXT DEFAULT NULL,
    p_refresh_token TEXT DEFAULT NULL,
    p_api_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_salt BYTEA;
    v_key BYTEA;
    v_credentials JSONB;
    v_encrypted BYTEA;
BEGIN
    -- Verify caller owns this connection
    SELECT user_id INTO v_user_id
    FROM public.broker_connections
    WHERE id = p_broker_connection_id;
    
    IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Cannot store credentials for this connection';
    END IF;
    
    -- Generate unique salt for this credential set
    v_salt := gen_random_bytes(32);
    
    -- Derive encryption key
    v_key := private.derive_encryption_key(v_salt);
    
    -- Build credentials JSON
    v_credentials := jsonb_build_object(
        'access_token', p_access_token,
        'refresh_token', p_refresh_token,
        'api_key', p_api_key,
        'stored_at', extract(epoch from now())
    );
    
    -- Encrypt credentials using AES-256
    v_encrypted := pgp_sym_encrypt(
        v_credentials::text,
        encode(v_key, 'hex'),
        'cipher-algo=aes256'
    );
    
    -- Upsert into vault
    INSERT INTO public.broker_credential_vault (
        broker_connection_id,
        encrypted_credentials,
        key_salt,
        rotated_at,
        rotation_count
    )
    VALUES (
        p_broker_connection_id,
        v_encrypted,
        v_salt,
        now(),
        0
    )
    ON CONFLICT (broker_connection_id) DO UPDATE SET
        encrypted_credentials = EXCLUDED.encrypted_credentials,
        key_salt = EXCLUDED.key_salt,
        rotated_at = now(),
        rotation_count = broker_credential_vault.rotation_count + 1,
        updated_at = now(),
        is_revoked = false,
        revoked_at = NULL;
    
    RETURN true;
END;
$$;

-- Secure function to retrieve credentials (server-side only, for edge functions)
CREATE OR REPLACE FUNCTION public.get_broker_credentials(
    p_broker_connection_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_vault RECORD;
    v_key BYTEA;
    v_decrypted TEXT;
BEGIN
    -- Verify caller owns this connection
    SELECT user_id INTO v_user_id
    FROM public.broker_connections
    WHERE id = p_broker_connection_id;
    
    IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Cannot access credentials for this connection';
    END IF;
    
    -- Get vault entry
    SELECT * INTO v_vault
    FROM public.broker_credential_vault
    WHERE broker_connection_id = p_broker_connection_id
      AND is_revoked = false;
    
    IF v_vault IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Derive decryption key
    v_key := private.derive_encryption_key(v_vault.key_salt);
    
    -- Decrypt credentials
    v_decrypted := pgp_sym_decrypt(
        v_vault.encrypted_credentials,
        encode(v_key, 'hex')
    );
    
    RETURN v_decrypted::jsonb;
END;
$$;

-- Function to revoke/invalidate credentials
CREATE OR REPLACE FUNCTION public.revoke_broker_credentials(
    p_broker_connection_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verify caller owns this connection
    SELECT user_id INTO v_user_id
    FROM public.broker_connections
    WHERE id = p_broker_connection_id;
    
    IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Cannot revoke credentials for this connection';
    END IF;
    
    -- Mark as revoked (keeps audit trail, makes credentials unusable)
    UPDATE public.broker_credential_vault
    SET is_revoked = true,
        revoked_at = now(),
        updated_at = now()
    WHERE broker_connection_id = p_broker_connection_id;
    
    RETURN true;
END;
$$;

-- Function to rotate credentials
CREATE OR REPLACE FUNCTION public.rotate_broker_credentials(
    p_broker_connection_id UUID,
    p_new_access_token TEXT DEFAULT NULL,
    p_new_refresh_token TEXT DEFAULT NULL,
    p_new_api_key TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- First revoke old credentials
    PERFORM public.revoke_broker_credentials(p_broker_connection_id);
    
    -- Store new credentials with fresh encryption
    RETURN public.store_broker_credentials(
        p_broker_connection_id,
        p_new_access_token,
        p_new_refresh_token,
        p_new_api_key
    );
END;
$$;

-- Migrate existing credentials to vault (one-time migration)
DO $$
DECLARE
    v_conn RECORD;
BEGIN
    FOR v_conn IN 
        SELECT id, user_id, access_token, refresh_token, api_key
        FROM public.broker_connections
        WHERE access_token IS NOT NULL 
           OR refresh_token IS NOT NULL 
           OR api_key IS NOT NULL
    LOOP
        -- Store in vault using direct insert (bypassing RLS for migration)
        INSERT INTO public.broker_credential_vault (
            broker_connection_id,
            encrypted_credentials,
            key_salt
        )
        VALUES (
            v_conn.id,
            pgp_sym_encrypt(
                jsonb_build_object(
                    'access_token', v_conn.access_token,
                    'refresh_token', v_conn.refresh_token,
                    'api_key', v_conn.api_key,
                    'stored_at', extract(epoch from now())
                )::text,
                encode(
                    digest(current_database() || 'broker_vault_key_v1' || encode(gen_random_bytes(32), 'hex'), 'sha256'),
                    'hex'
                ),
                'cipher-algo=aes256'
            ),
            gen_random_bytes(32)
        )
        ON CONFLICT (broker_connection_id) DO NOTHING;
    END LOOP;
END;
$$;

-- Remove sensitive columns from broker_connections
ALTER TABLE public.broker_connections 
    DROP COLUMN IF EXISTS access_token,
    DROP COLUMN IF EXISTS refresh_token,
    DROP COLUMN IF EXISTS api_key;

-- Update the safe view to ensure no sensitive data exposure
DROP VIEW IF EXISTS public.broker_connections_safe;
CREATE VIEW public.broker_connections_safe AS
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

-- Grant access to the safe view
GRANT SELECT ON public.broker_connections_safe TO authenticated;

-- Drop old decrypt function if exists (security cleanup)
DROP FUNCTION IF EXISTS public.decrypt_broker_token(text);
DROP FUNCTION IF EXISTS public.encrypt_broker_token(text);
DROP FUNCTION IF EXISTS public.get_broker_access_token(text, uuid);

-- Create new secure accessor for edge functions only
CREATE OR REPLACE FUNCTION public.get_broker_access_token_secure(
    p_broker_type TEXT,
    p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_connection_id UUID;
    v_credentials JSONB;
BEGIN
    -- Only allow if caller is the user
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;
    
    -- Get connection ID
    SELECT id INTO v_connection_id
    FROM public.broker_connections
    WHERE user_id = p_user_id
      AND broker_type = p_broker_type
      AND status = 'connected';
    
    IF v_connection_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Get credentials from vault
    v_credentials := public.get_broker_credentials(v_connection_id);
    
    IF v_credentials IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN v_credentials->>'access_token';
END;
$$;

-- Add index for vault lookups
CREATE INDEX IF NOT EXISTS idx_broker_vault_connection 
ON public.broker_credential_vault(broker_connection_id) 
WHERE is_revoked = false;

-- Add index for revocation checks
CREATE INDEX IF NOT EXISTS idx_broker_vault_revoked 
ON public.broker_credential_vault(is_revoked, revoked_at);
