-- Drop existing policies
DROP POLICY IF EXISTS "Users can view golden set creatives in their org" ON public.golden_set_creatives;
DROP POLICY IF EXISTS "Users can create golden set creatives for their org brands" ON public.golden_set_creatives;

-- Create simpler RLS policies that work with our current auth setup
-- For now, allow authenticated users to create golden set records
CREATE POLICY "Authenticated users can create golden set creatives"
ON public.golden_set_creatives FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view all golden set creatives
CREATE POLICY "Authenticated users can view golden set creatives"
ON public.golden_set_creatives FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to update golden set creatives
CREATE POLICY "Authenticated users can update golden set creatives"
ON public.golden_set_creatives FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete golden set creatives
CREATE POLICY "Authenticated users can delete golden set creatives"
ON public.golden_set_creatives FOR DELETE
TO authenticated
USING (true);