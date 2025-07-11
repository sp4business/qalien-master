-- Add mime_type column to campaign_assets table
ALTER TABLE public.campaign_assets 
ADD COLUMN mime_type TEXT;