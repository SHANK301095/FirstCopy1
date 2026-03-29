
-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Add referral_code column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view own referrals as referrer" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view own referrals as referred" ON public.referrals
  FOR SELECT USING (auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_id OR auth.uid() = referrer_id);

CREATE POLICY "Users can update own referrals as referrer" ON public.referrals
  FOR UPDATE USING (auth.uid() = referrer_id);

CREATE POLICY "Block anonymous referrals" ON public.referrals
  FOR ALL USING (false);

-- Function to generate referral code on signup
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Get display name from the new profile
  v_name := UPPER(REGEXP_REPLACE(COALESCE(NEW.display_name, NEW.username, 'USER'), '[^A-Za-z]', '', 'g'));
  v_name := LEFT(v_name, 6);
  
  -- Pad if too short
  IF LENGTH(v_name) < 3 THEN
    v_name := v_name || 'MMC';
  END IF;
  
  -- Generate unique code
  LOOP
    v_code := v_name || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  NEW.referral_code := v_code;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate referral code
CREATE TRIGGER trg_generate_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION public.generate_referral_code();

-- Backfill existing profiles without referral codes
DO $$
DECLARE
  r RECORD;
  v_name TEXT;
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  FOR r IN SELECT id, display_name, username FROM public.profiles WHERE referral_code IS NULL LOOP
    v_name := UPPER(REGEXP_REPLACE(COALESCE(r.display_name, r.username, 'USER'), '[^A-Za-z]', '', 'g'));
    v_name := LEFT(v_name, 6);
    IF LENGTH(v_name) < 3 THEN
      v_name := v_name || 'MMC';
    END IF;
    LOOP
      v_code := v_name || LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
      SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = v_code) INTO v_exists;
      EXIT WHEN NOT v_exists;
    END LOOP;
    UPDATE public.profiles SET referral_code = v_code WHERE id = r.id;
  END LOOP;
END;
$$;
