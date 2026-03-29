
-- Affiliates table
CREATE TABLE public.affiliates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  affiliate_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  platform text,
  channel_url text,
  subscriber_count text,
  trading_niche text,
  applicant_name text,
  applicant_email text,
  commission_rate numeric NOT NULL DEFAULT 0.30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own affiliate" ON public.affiliates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own affiliate" ON public.affiliates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all affiliates" ON public.affiliates FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update affiliates" ON public.affiliates FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block anonymous affiliates" ON public.affiliates FOR ALL USING (false);

-- Affiliate clicks table
CREATE TABLE public.affiliate_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  ip_hash text,
  user_agent text,
  converted boolean NOT NULL DEFAULT false,
  referred_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own clicks" ON public.affiliate_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_clicks.affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Authenticated can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all clicks" ON public.affiliate_clicks FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block anonymous clicks" ON public.affiliate_clicks FOR ALL USING (false);

-- Affiliate commissions table
CREATE TABLE public.affiliate_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.affiliates WHERE id = affiliate_commissions.affiliate_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all commissions" ON public.affiliate_commissions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update commissions" ON public.affiliate_commissions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Block anonymous commissions" ON public.affiliate_commissions FOR ALL USING (false);
