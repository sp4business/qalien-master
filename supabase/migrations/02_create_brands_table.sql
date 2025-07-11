-- Create brands table (QAlien-specific, references Clerk org IDs)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id VARCHAR(255) NOT NULL, -- References Clerk organization
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  -- Brand Guidelines
  logo_files TEXT[] DEFAULT '{}',
  color_palette TEXT[] DEFAULT '{}', 
  tone_keywords TEXT[] DEFAULT '{}',
  approved_terms TEXT[] DEFAULT '{}',
  banned_terms TEXT[] DEFAULT '{}',
  required_disclaimers TEXT[] DEFAULT '{}',
  
  -- Layout Rules
  safe_zone_config JSONB DEFAULT '{}',
  
  -- Metadata
  created_by_clerk_id VARCHAR(255) NOT NULL, -- References Clerk user
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brands_clerk_org_id ON brands(clerk_org_id);
CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_created_by ON brands(created_by_clerk_id);

-- Enable Row Level Security
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see brands in their organization
CREATE POLICY "Users can view brands in their org" ON brands
  FOR SELECT USING (clerk_org_id = public.clerk_org_id());

-- RLS Policy: Only org admins can create brands
CREATE POLICY "Org admins can create brands" ON brands
  FOR INSERT WITH CHECK (
    clerk_org_id = public.clerk_org_id() AND 
    public.clerk_org_role() = 'admin'
  );

-- RLS Policy: Only org admins can update brands
CREATE POLICY "Org admins can update brands" ON brands
  FOR UPDATE USING (
    clerk_org_id = public.clerk_org_id() AND 
    public.clerk_org_role() = 'admin'
  );

-- RLS Policy: Only org admins can delete brands
CREATE POLICY "Org admins can delete brands" ON brands
  FOR DELETE USING (
    clerk_org_id = public.clerk_org_id() AND 
    public.clerk_org_role() = 'admin'
  );