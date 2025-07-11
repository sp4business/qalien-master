-- Add guidelines_pdf_url column to brands table
ALTER TABLE brands 
ADD COLUMN guidelines_pdf_url TEXT;

-- Add index for performance
CREATE INDEX idx_brands_guidelines_pdf ON brands(guidelines_pdf_url);