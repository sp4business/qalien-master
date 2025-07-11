-- Create campaign_assets table to link uploaded assets to campaigns
CREATE TABLE public.campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  asset_name TEXT,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- Will be updated by AI later
  compliance_score INTEGER, -- Will be populated by AI later
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_campaign_assets_campaign_id ON public.campaign_assets(campaign_id);
CREATE INDEX idx_campaign_assets_created_at ON public.campaign_assets(created_at DESC);

-- Enable RLS
ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view assets for campaigns in their organization
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

-- RLS Policy: Users can insert assets for campaigns in their organization
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

-- RLS Policy: Users can update assets for campaigns in their organization
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

-- RLS Policy: Users can delete assets for campaigns in their organization
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