-- Create storage bucket for campaign assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets',
  'campaign-assets',
  true,
  52428800, -- 50MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for the storage bucket
CREATE POLICY "Users can upload campaign assets" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-assets' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Public can view campaign assets" ON storage.objects
FOR SELECT
USING (bucket_id = 'campaign-assets');

CREATE POLICY "Users can update their campaign assets" ON storage.objects
FOR UPDATE
USING (bucket_id = 'campaign-assets' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'campaign-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their campaign assets" ON storage.objects
FOR DELETE
USING (bucket_id = 'campaign-assets' AND auth.uid() IS NOT NULL);