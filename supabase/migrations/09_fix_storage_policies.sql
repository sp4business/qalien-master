-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload to brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view brand-assets" ON storage.objects;

-- Create new policies that work with anonymous uploads
-- Allow anyone to upload to brand-assets (since we're using anon key)
CREATE POLICY "Anyone can upload to brand-assets"
ON storage.objects FOR INSERT 
TO anon
WITH CHECK (bucket_id = 'brand-assets');

-- Allow anyone to view files in brand-assets
CREATE POLICY "Anyone can view brand-assets"
ON storage.objects FOR SELECT 
TO anon
USING (bucket_id = 'brand-assets');

-- Allow anyone to update files in brand-assets
CREATE POLICY "Anyone can update brand-assets"
ON storage.objects FOR UPDATE 
TO anon
USING (bucket_id = 'brand-assets');

-- Allow anyone to delete files in brand-assets
CREATE POLICY "Anyone can delete brand-assets"
ON storage.objects FOR DELETE 
TO anon
USING (bucket_id = 'brand-assets');