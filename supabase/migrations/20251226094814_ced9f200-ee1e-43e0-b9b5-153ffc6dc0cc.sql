-- =============================================
-- STRATEGY MARKETPLACE TABLES
-- =============================================

-- Table for publicly shared strategies
CREATE TABLE public.marketplace_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  price DECIMAL(10, 2) DEFAULT 0.00,
  is_free BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  download_count INTEGER DEFAULT 0,
  rating_avg DECIMAL(3, 2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  preview_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for strategy ratings and reviews
CREATE TABLE public.strategy_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_strategy_id UUID NOT NULL REFERENCES public.marketplace_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  is_helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(marketplace_strategy_id, user_id)
);

-- Table for strategy downloads/purchases
CREATE TABLE public.strategy_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_strategy_id UUID NOT NULL REFERENCES public.marketplace_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(marketplace_strategy_id, user_id)
);

-- Table for strategy favorites/bookmarks
CREATE TABLE public.strategy_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace_strategy_id UUID NOT NULL REFERENCES public.marketplace_strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(marketplace_strategy_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.marketplace_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_favorites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR marketplace_strategies
-- =============================================

-- Anyone can view marketplace strategies (public)
CREATE POLICY "Anyone can view marketplace strategies"
ON public.marketplace_strategies
FOR SELECT
USING (true);

-- Authors can insert their own strategies
CREATE POLICY "Authors can share their strategies"
ON public.marketplace_strategies
FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own strategies
CREATE POLICY "Authors can update their strategies"
ON public.marketplace_strategies
FOR UPDATE
USING (auth.uid() = author_id);

-- Authors can delete their own strategies
CREATE POLICY "Authors can delete their strategies"
ON public.marketplace_strategies
FOR DELETE
USING (auth.uid() = author_id);

-- =============================================
-- RLS POLICIES FOR strategy_ratings
-- =============================================

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings"
ON public.strategy_ratings
FOR SELECT
USING (true);

-- Users can add their own ratings
CREATE POLICY "Users can add ratings"
ON public.strategy_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings"
ON public.strategy_ratings
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings"
ON public.strategy_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES FOR strategy_downloads
-- =============================================

-- Users can view their own downloads
CREATE POLICY "Users can view own downloads"
ON public.strategy_downloads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can record their own downloads
CREATE POLICY "Users can record downloads"
ON public.strategy_downloads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Downloads cannot be updated
CREATE POLICY "Downloads cannot be updated"
ON public.strategy_downloads
FOR UPDATE
USING (false);

-- Users can remove their download history
CREATE POLICY "Users can remove download history"
ON public.strategy_downloads
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES FOR strategy_favorites
-- =============================================

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
ON public.strategy_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
ON public.strategy_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Favorites cannot be updated
CREATE POLICY "Favorites cannot be updated"
ON public.strategy_favorites
FOR UPDATE
USING (false);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
ON public.strategy_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update rating averages when a new rating is added
CREATE OR REPLACE FUNCTION public.update_strategy_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.marketplace_strategies
    SET 
      rating_avg = (
        SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
        FROM public.strategy_ratings
        WHERE marketplace_strategy_id = NEW.marketplace_strategy_id
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM public.strategy_ratings
        WHERE marketplace_strategy_id = NEW.marketplace_strategy_id
      ),
      updated_at = now()
    WHERE id = NEW.marketplace_strategy_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marketplace_strategies
    SET 
      rating_avg = (
        SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
        FROM public.strategy_ratings
        WHERE marketplace_strategy_id = OLD.marketplace_strategy_id
      ),
      rating_count = (
        SELECT COUNT(*)
        FROM public.strategy_ratings
        WHERE marketplace_strategy_id = OLD.marketplace_strategy_id
      ),
      updated_at = now()
    WHERE id = OLD.marketplace_strategy_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for rating updates
CREATE TRIGGER update_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.strategy_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_strategy_rating();

-- Function to increment download count
CREATE OR REPLACE FUNCTION public.increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketplace_strategies
  SET 
    download_count = download_count + 1,
    updated_at = now()
  WHERE id = NEW.marketplace_strategy_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for download count
CREATE TRIGGER increment_download_trigger
AFTER INSERT ON public.strategy_downloads
FOR EACH ROW
EXECUTE FUNCTION public.increment_download_count();

-- Create indexes for performance
CREATE INDEX idx_marketplace_strategies_category ON public.marketplace_strategies(category);
CREATE INDEX idx_marketplace_strategies_author ON public.marketplace_strategies(author_id);
CREATE INDEX idx_marketplace_strategies_rating ON public.marketplace_strategies(rating_avg DESC);
CREATE INDEX idx_marketplace_strategies_downloads ON public.marketplace_strategies(download_count DESC);
CREATE INDEX idx_strategy_ratings_strategy ON public.strategy_ratings(marketplace_strategy_id);
CREATE INDEX idx_strategy_downloads_user ON public.strategy_downloads(user_id);
CREATE INDEX idx_strategy_favorites_user ON public.strategy_favorites(user_id);