-- Add raw_transcript_data column to campaign_assets table
-- This will store the complete transcript response from AssemblyAI including word-level timestamps
ALTER TABLE public.campaign_assets
  ADD COLUMN raw_transcript_data JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.campaign_assets.raw_transcript_data IS 'Complete transcript data from AssemblyAI including word-level timestamps for verbal compliance analysis';

-- Create index for potential future search functionality
CREATE INDEX idx_campaign_assets_raw_transcript_data ON public.campaign_assets USING gin(raw_transcript_data) WHERE raw_transcript_data IS NOT NULL;