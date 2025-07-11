-- Create RLS policies for brand-assets bucket
-- Note: These policies apply to the storage.objects table

-- Allow authenticated users to upload files to brand-assets bucket
CREATE POLICY "Authenticated users can upload to brand-assets"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'brand-assets' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update brand-assets"
ON storage.objects FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete brand-assets"
ON storage.objects FOR DELETE 
TO authenticated
USING (
  bucket_id = 'brand-assets' AND
  auth.uid() IS NOT NULL
);

-- Allow public read access (since bucket is public)
CREATE POLICY "Anyone can view brand-assets"
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'brand-assets');