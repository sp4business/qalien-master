-- Add currency and country columns to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN country VARCHAR(100);