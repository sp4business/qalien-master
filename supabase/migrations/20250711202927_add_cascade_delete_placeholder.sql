-- Placeholder for future cascade delete relationships
-- When AI analysis tables are added, they should reference campaign_assets with ON DELETE CASCADE

-- Example structure for future tables:
/*
CREATE TABLE IF NOT EXISTS public.campaign_asset_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.campaign_assets(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL,
  analysis_results JSONB,
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_asset_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.campaign_assets(id) ON DELETE CASCADE,
  embedding vector(1536),
  embedding_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_asset_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.campaign_assets(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
*/

-- This migration serves as documentation for the cascade delete strategy