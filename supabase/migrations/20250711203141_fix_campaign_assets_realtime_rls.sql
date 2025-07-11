-- Enable realtime for campaign_assets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_assets;

-- Ensure RLS policies work with realtime
-- The existing policies should already handle this, but let's make sure they're optimized

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view campaign assets in their org" ON public.campaign_assets;
DROP POLICY IF EXISTS "Users can insert campaign assets in their org" ON public.campaign_assets;
DROP POLICY IF EXISTS "Users can update campaign assets in their org" ON public.campaign_assets;
DROP POLICY IF EXISTS "Users can delete campaign assets in their org" ON public.campaign_assets;

-- Recreate policies with proper joins for realtime
CREATE POLICY "Users can view campaign assets in their org" 
ON public.campaign_assets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    JOIN public.brands ON campaigns.brand_id = brands.id
    WHERE campaigns.id = campaign_assets.campaign_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);

CREATE POLICY "Users can insert campaign assets in their org" 
ON public.campaign_assets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    JOIN public.brands ON campaigns.brand_id = brands.id
    WHERE campaigns.id = campaign_assets.campaign_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);

CREATE POLICY "Users can update campaign assets in their org" 
ON public.campaign_assets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    JOIN public.brands ON campaigns.brand_id = brands.id
    WHERE campaigns.id = campaign_assets.campaign_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);

CREATE POLICY "Users can delete campaign assets in their org" 
ON public.campaign_assets FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    JOIN public.brands ON campaigns.brand_id = brands.id
    WHERE campaigns.id = campaign_assets.campaign_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);