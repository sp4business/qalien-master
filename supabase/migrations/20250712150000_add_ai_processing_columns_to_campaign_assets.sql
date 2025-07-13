-- Add AI processing columns to campaign_assets table for QAlien AI Processing Pipeline
ALTER TABLE public.campaign_assets
  ADD COLUMN source_properties JSONB,         -- Raw file metadata (width, height, etc.)
  ADD COLUMN ugc_detection_data JSONB,        -- Intermediate UGC votes & score
  ADD COLUMN creative_type TEXT,              -- Final 'UGC' or 'Produced' classification
  ADD COLUMN creative_type_override TEXT,     -- For manual user overrides
  ADD COLUMN legend_results JSONB,            -- The detailed JSON report from all checks
  ADD COLUMN frontend_report JSONB,           -- A simplified checklist for the UI
  ADD COLUMN overall_status TEXT;             -- Final 'pass', 'warn', or 'fail' status

-- Add check constraint for creative_type values
ALTER TABLE public.campaign_assets
  ADD CONSTRAINT creative_type_check 
  CHECK (creative_type IN ('UGC', 'Produced', NULL));

-- Add check constraint for creative_type_override values
ALTER TABLE public.campaign_assets
  ADD CONSTRAINT creative_type_override_check 
  CHECK (creative_type_override IN ('UGC', 'Produced', NULL));

-- Add check constraint for overall_status values
ALTER TABLE public.campaign_assets
  ADD CONSTRAINT overall_status_check 
  CHECK (overall_status IN ('pass', 'warn', 'fail', NULL));

-- Create indexes for better query performance
CREATE INDEX idx_campaign_assets_creative_type ON public.campaign_assets(creative_type);
CREATE INDEX idx_campaign_assets_overall_status ON public.campaign_assets(overall_status);
CREATE INDEX idx_campaign_assets_legend_results ON public.campaign_assets USING GIN (legend_results);
CREATE INDEX idx_campaign_assets_frontend_report ON public.campaign_assets USING GIN (frontend_report);

-- Add comments for documentation
COMMENT ON COLUMN public.campaign_assets.source_properties IS 'Raw file metadata including dimensions, file size, format details, etc.';
COMMENT ON COLUMN public.campaign_assets.ugc_detection_data IS 'Intermediate UGC detection votes and confidence scores from AI analysis';
COMMENT ON COLUMN public.campaign_assets.creative_type IS 'Final classification: UGC (User Generated Content) or Produced (Professional)';
COMMENT ON COLUMN public.campaign_assets.creative_type_override IS 'Manual override for creative type classification by users';
COMMENT ON COLUMN public.campaign_assets.legend_results IS 'Detailed JSON report containing all AI compliance check results';
COMMENT ON COLUMN public.campaign_assets.frontend_report IS 'Simplified compliance checklist optimized for UI display';
COMMENT ON COLUMN public.campaign_assets.overall_status IS 'Final compliance status: pass, warn, or fail';