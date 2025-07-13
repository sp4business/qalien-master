-- Add phonetic pronunciation column to brands table
-- This will store the phonetic spelling of brand names for proper pronunciation
ALTER TABLE public.brands
ADD COLUMN phonetic_pronunciation TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.brands.phonetic_pronunciation IS 'Optional phonetic spelling of the brand name for proper pronunciation (e.g., "Nike" → "NYE-key")';

-- Create index for potential future search functionality
CREATE INDEX idx_brands_phonetic_pronunciation ON public.brands(phonetic_pronunciation) WHERE phonetic_pronunciation IS NOT NULL;