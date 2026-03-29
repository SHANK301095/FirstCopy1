-- Create storage bucket for historical trading data
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'historical-data', 
  'historical-data', 
  false,
  3221225472, -- 3GB limit
  ARRAY['text/csv', 'application/octet-stream', 'text/plain']
);

-- RLS policies for historical-data bucket

-- Users can view their own files
CREATE POLICY "Users can view own historical data"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'historical-data' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload to their own folder
CREATE POLICY "Users can upload own historical data"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'historical-data' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update own historical data"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'historical-data' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete own historical data"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'historical-data' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);