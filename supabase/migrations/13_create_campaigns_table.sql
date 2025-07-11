-- Create the table for Campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,

  -- These are the fields we will implement in the modal
  name TEXT NOT NULL,
  campaign_type TEXT,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  budget NUMERIC, -- Using NUMERIC for currency is best practice

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow users to see campaigns that belong to their organization.
CREATE POLICY "Users can view campaigns in their org" 
ON public.campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id = campaigns.brand_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);

-- RLS Policy: Allow users to create campaigns for brands in their organization.
CREATE POLICY "Org members can create campaigns" 
ON public.campaigns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id = campaigns.brand_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);

-- Create indexes for performance
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);