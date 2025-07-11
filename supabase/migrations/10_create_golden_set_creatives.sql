-- Create the table for Golden Set creatives
CREATE TABLE public.golden_set_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Foreign key linking each creative back to its parent brand
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  -- The path to the file in Supabase Storage
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size BIGINT, -- Added for tracking file sizes
  -- Status for future ML processing; will remain 'pending' for now
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  -- Metadata for future ML results
  ml_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_golden_set_brand_id ON public.golden_set_creatives(brand_id);
CREATE INDEX idx_golden_set_status ON public.golden_set_creatives(status);

-- Enable Row Level Security
ALTER TABLE public.golden_set_creatives ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow users to see creatives that belong to their organization
CREATE POLICY "Users can view golden set creatives in their org"
ON public.golden_set_creatives FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id = golden_set_creatives.brand_id 
    AND brands.clerk_org_id = auth.jwt() ->> 'org_id'
  )
);

-- RLS Policy: Allow users to create golden set creatives for brands in their org
CREATE POLICY "Users can create golden set creatives for their org brands"
ON public.golden_set_creatives FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.brands 
    WHERE brands.id = golden_set_creatives.brand_id 
    AND brands.clerk_org_id = auth.jwt() ->> 'org_id'
  )
);

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_golden_set_creatives_updated_at 
BEFORE UPDATE ON public.golden_set_creatives 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();