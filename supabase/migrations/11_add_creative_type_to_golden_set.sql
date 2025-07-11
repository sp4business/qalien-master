-- Add creative_type column to golden_set_creatives table
ALTER TABLE public.golden_set_creatives
ADD COLUMN creative_type TEXT NOT NULL DEFAULT 'Produced' CHECK (creative_type IN ('UGC', 'Produced'));

-- Update the default for future rows to not have a default
-- This ensures we explicitly set the type
ALTER TABLE public.golden_set_creatives 
ALTER COLUMN creative_type DROP DEFAULT;