-- Update bucket size limit to 10GB for 20-30 files of ~300MB each
UPDATE storage.buckets 
SET file_size_limit = 10737418240  -- 10GB
WHERE id = 'historical-data';

-- Add file_size column to datasets table to track storage usage
ALTER TABLE public.datasets 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;