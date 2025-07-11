# Database Architecture - Modern Stack
> **Status**: Migration to Supabase Postgres + pgvector  
> **Last Updated**: 7 Jan 2025  
> **Purpose**: Complete database schema for multi-organization SaaS with AI vector search

---

## 🏗 **Architecture Overview**

### **Modern Stack Components**
- **Database**: Supabase Postgres 15+ 
- **Vector Search**: pgvector extension
- **Real-time**: Supabase Realtime
- **Storage**: Supabase Storage (S3-compatible)
- **Auth Integration**: Clerk + Row Level Security

### **Multi-Organization Model**
```
User → Organization → Brand → Creatives
     └─ Organization Membership (OrgAdmin/OrgMember)
                    └─ Brand Membership (Admin/Editor/Viewer)
```

---

## 📊 **Core Tables**

### **Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  last_org_id UUID REFERENCES organizations(id),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
```

### **Organizations Table**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  industry VARCHAR(100),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_created_by ON organizations(created_by);
```

### **Organization Memberships Table**
```sql
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  status VARCHAR(50) CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_memberships_org_id ON organization_memberships(org_id);
CREATE INDEX idx_org_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX idx_org_memberships_role ON organization_memberships(role);
```

---

## 🏢 **Brand Management**

### **Brands Table**
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100),
  description TEXT,
  industry VARCHAR(100),
  website_url TEXT,
  
  -- Brand Guidelines
  guidelines_url TEXT,
  color_palette JSONB DEFAULT '[]',
  fonts JSONB DEFAULT '[]',
  logos JSONB DEFAULT '[]',
  
  -- Brand Voice
  tone_keywords TEXT[],
  approved_terms TEXT[],
  banned_terms TEXT[],
  required_disclaimers TEXT[],
  
  -- Settings
  compliance_threshold DECIMAL(3,2) DEFAULT 0.8,
  auto_analysis BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(org_id, slug)
);

-- Golden Set Creatives Table
CREATE TABLE golden_set_creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  creative_type TEXT NOT NULL CHECK (creative_type IN ('UGC', 'Produced')),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_golden_set_creatives_brand_id ON golden_set_creatives(brand_id);

-- Indexes
CREATE INDEX idx_brands_org_id ON brands(org_id);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brands_created_by ON brands(created_by);
```

### **Brand Memberships Table**
```sql
CREATE TABLE brand_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  status VARCHAR(50) CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_id, user_id)
);

-- Indexes
CREATE INDEX idx_brand_memberships_brand_id ON brand_memberships(brand_id);
CREATE INDEX idx_brand_memberships_user_id ON brand_memberships(user_id);
CREATE INDEX idx_brand_memberships_role ON brand_memberships(role);
```

---

## 🎨 **Creative Management**

### **Creatives Table**
```sql
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- File Information
  filename VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  -- Creative Properties
  width INTEGER,
  height INTEGER,
  duration_seconds DECIMAL(8,2),
  
  -- Analysis Results
  analysis_status VARCHAR(50) DEFAULT 'pending',
  analysis_results JSONB DEFAULT '{}',
  compliance_score DECIMAL(5,2),
  overall_status VARCHAR(50) CHECK (overall_status IN ('pass', 'warning', 'fail')),
  
  -- AI Analysis
  ai_analysis_id TEXT,
  ai_analysis_timestamp TIMESTAMP,
  ai_model_version VARCHAR(50),
  
  -- Metadata
  tags TEXT[],
  is_golden BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_creatives_org_id ON creatives(org_id);
CREATE INDEX idx_creatives_brand_id ON creatives(brand_id);
CREATE INDEX idx_creatives_campaign_id ON creatives(campaign_id);
CREATE INDEX idx_creatives_status ON creatives(analysis_status);
CREATE INDEX idx_creatives_created_at ON creatives(created_at DESC);
```

### **Creative Analysis Table**
```sql
CREATE TABLE creative_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES creatives(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL,
  
  -- Analysis Details
  results JSONB NOT NULL,
  confidence_score DECIMAL(5,2),
  model_version VARCHAR(50),
  
  -- Compliance Breakdown
  logo_compliance JSONB,
  color_compliance JSONB,
  text_compliance JSONB,
  layout_compliance JSONB,
  
  -- Metadata
  processing_time_ms INTEGER,
  analyzed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_creative_analysis_creative_id ON creative_analysis(creative_id);
CREATE INDEX idx_creative_analysis_type ON creative_analysis(analysis_type);
CREATE INDEX idx_creative_analysis_analyzed_at ON creative_analysis(analyzed_at DESC);
```

---

## 🚀 **Campaign Management**

### **Campaigns Table (Updated 2025-07-11)**
```sql
-- Actual implementation in production
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Core Campaign Details
  name TEXT NOT NULL,
  campaign_type TEXT,
  description TEXT,
  
  -- Timeline
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  -- Budget (simplified for MVP)
  budget NUMERIC,
  currency VARCHAR(3) DEFAULT 'USD',
  country VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at DESC);

-- Row Level Security Policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Users can view campaigns in their organization
CREATE POLICY "Users can view campaigns in their org" 
ON campaigns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM brands 
    WHERE brands.id = campaigns.brand_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);

-- Users can create campaigns for their organization's brands
CREATE POLICY "Org members can create campaigns" 
ON campaigns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM brands 
    WHERE brands.id = campaigns.brand_id 
    AND brands.clerk_org_id = public.clerk_org_id()
  )
);
```

### **Campaign Status Computation**
Status is computed dynamically based on dates rather than stored:
- **Draft**: start_date is in the future or null
- **Active**: current date is between start_date and end_date
- **Completed**: current date is after end_date

### **Future Campaign Extensions**
```sql
-- Planned additions for full campaign tracking
ALTER TABLE campaigns ADD COLUMN actual_spend DECIMAL(12,2) DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN roi_percentage DECIMAL(5,2);
ALTER TABLE campaigns ADD COLUMN target_demographics JSONB DEFAULT '{}';
ALTER TABLE campaigns ADD COLUMN distribution_channels TEXT[];
ALTER TABLE campaigns ADD COLUMN created_by_clerk_id VARCHAR(255);
```

---

## 🔍 **AI & Vector Search**

### **Enable pgvector Extension**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### **Brand Guidelines Embeddings**
```sql
CREATE TABLE brand_guidelines_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Content
  content_type VARCHAR(50) NOT NULL, -- 'text', 'image', 'logo'
  content_text TEXT,
  content_url TEXT,
  
  -- Vector Data
  embedding vector(1536), -- OpenAI ada-002 dimensions
  
  -- Metadata
  page_number INTEGER,
  section_title VARCHAR(255),
  confidence_score DECIMAL(5,2),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX idx_brand_guidelines_embeddings_vector 
ON brand_guidelines_embeddings 
USING ivfflat (embedding vector_cosine_ops);

-- Other indexes
CREATE INDEX idx_brand_guidelines_embeddings_brand_id 
ON brand_guidelines_embeddings(brand_id);
```

### **Creative Analysis Embeddings**
```sql
CREATE TABLE creative_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES creatives(id) ON DELETE CASCADE,
  
  -- Embedding Data
  embedding vector(1536),
  embedding_type VARCHAR(50) NOT NULL, -- 'visual', 'text', 'audio'
  
  -- Analysis Context
  frame_timestamp DECIMAL(8,2), -- For video analysis
  text_content TEXT,
  
  -- Metadata
  model_version VARCHAR(50),
  confidence_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX idx_creative_embeddings_vector 
ON creative_embeddings 
USING ivfflat (embedding vector_cosine_ops);

-- Other indexes
CREATE INDEX idx_creative_embeddings_creative_id 
ON creative_embeddings(creative_id);
```

---

## 🔐 **Row Level Security (RLS)**

### **Enable RLS on All Tables**
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_guidelines_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_embeddings ENABLE ROW LEVEL SECURITY;
```

### **Organization-Level Policies**
```sql
-- Users can only see their own record
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = clerk_id);

-- Organization access based on membership
CREATE POLICY "Organization members can view org" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_memberships 
      WHERE org_id = organizations.id 
      AND user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
      AND status = 'active'
    )
  );

-- Brand access based on organization membership
CREATE POLICY "Brand access via org membership" ON brands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_memberships 
      WHERE org_id = brands.org_id 
      AND user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
      AND status = 'active'
    )
  );
```

### **Brand-Level Policies**
```sql
-- Creative access based on brand membership
CREATE POLICY "Creative access via brand membership" ON creatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brand_memberships bm
      JOIN brands b ON b.id = bm.brand_id
      WHERE bm.brand_id = creatives.brand_id
      AND bm.user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
      AND bm.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN brands b ON b.org_id = om.org_id
      WHERE b.id = creatives.brand_id
      AND om.user_id = (SELECT id FROM users WHERE clerk_id = auth.uid()::text)
      AND om.status = 'active'
    )
  );
```

---

## 🚀 **Migration Strategy**

### **Phase 1: Schema Creation**
```sql
-- Create all tables with proper constraints
-- Enable RLS policies
-- Create indexes for performance
-- Setup vector search capabilities
```

### **Phase 2: Data Migration**
```sql
-- Example migration from DynamoDB to Postgres
CREATE OR REPLACE FUNCTION migrate_brands()
RETURNS void AS $$
BEGIN
  INSERT INTO brands (id, org_id, name, description, created_at)
  SELECT 
    gen_random_uuid(),
    (SELECT id FROM organizations WHERE name = 'Default'),
    brand_name,
    brand_description,
    NOW()
  FROM legacy_brands;
END;
$$ LANGUAGE plpgsql;
```

### **Phase 3: Vector Data Population**
```sql
-- Populate brand guidelines embeddings
CREATE OR REPLACE FUNCTION populate_brand_embeddings()
RETURNS void AS $$
BEGIN
  -- Process brand guidelines and create embeddings
  -- This would be called from Edge Functions
END;
$$ LANGUAGE plpgsql;
```

---

## 📈 **Performance Optimization**

### **Query Optimization**
```sql
-- Complex query with proper indexes
SELECT c.*, b.name as brand_name, o.name as org_name
FROM creatives c
JOIN brands b ON c.brand_id = b.id
JOIN organizations o ON c.org_id = o.id
WHERE c.org_id = $1 
  AND c.analysis_status = 'completed'
  AND c.created_at > NOW() - INTERVAL '30 days'
ORDER BY c.created_at DESC
LIMIT 50;
```

### **Vector Search Optimization**
```sql
-- Find similar brand guidelines
SELECT bg.*, 
       (embedding <=> $1) as similarity
FROM brand_guidelines_embeddings bg
WHERE bg.brand_id = $2
ORDER BY embedding <=> $1
LIMIT 10;
```

### **Materialized Views**
```sql
-- Campaign performance summary
CREATE MATERIALIZED VIEW campaign_performance AS
SELECT 
  c.id,
  c.name,
  c.org_id,
  c.brand_id,
  COUNT(cr.id) as total_creatives,
  COUNT(CASE WHEN cr.overall_status = 'pass' THEN 1 END) as passed_creatives,
  AVG(cr.compliance_score) as avg_compliance_score
FROM campaigns c
LEFT JOIN creatives cr ON c.id = cr.campaign_id
GROUP BY c.id, c.name, c.org_id, c.brand_id;

-- Refresh policy
CREATE UNIQUE INDEX ON campaign_performance (id);
```

---

## 🔧 **Database Functions**

### **User Management Functions**
```sql
-- Get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_clerk_id TEXT)
RETURNS TABLE (
  org_id UUID,
  org_name VARCHAR(255),
  role VARCHAR(50),
  joined_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.name, om.role, om.joined_at
  FROM organizations o
  JOIN organization_memberships om ON o.id = om.org_id
  JOIN users u ON om.user_id = u.id
  WHERE u.clerk_id = user_clerk_id
    AND om.status = 'active'
  ORDER BY om.joined_at DESC;
END;
$$ LANGUAGE plpgsql;
```

### **Brand Analysis Functions**
```sql
-- Calculate brand compliance metrics
CREATE OR REPLACE FUNCTION calculate_brand_metrics(brand_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_creatives', COUNT(*),
    'passed_creatives', COUNT(CASE WHEN overall_status = 'pass' THEN 1 END),
    'avg_compliance_score', ROUND(AVG(compliance_score), 2),
    'last_analysis', MAX(updated_at)
  ) INTO result
  FROM creatives
  WHERE brand_id = brand_uuid
    AND analysis_status = 'completed';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## 🎯 **Monitoring & Maintenance**

### **Performance Monitoring**
```sql
-- Query performance monitoring
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND tablename IN ('creatives', 'brands', 'organizations')
ORDER BY tablename, attname;

-- Index usage monitoring
SELECT indexrelname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;
```

### **Maintenance Tasks**
```sql
-- Regular maintenance
ANALYZE; -- Update table statistics
VACUUM; -- Cleanup dead tuples
REINDEX; -- Rebuild indexes if needed

-- Vector index maintenance
REINDEX INDEX idx_brand_guidelines_embeddings_vector;
REINDEX INDEX idx_creative_embeddings_vector;
```

---

This database architecture provides a robust, scalable foundation for QAlien's multi-organization SaaS platform with AI-powered brand compliance analysis while maintaining all the security and performance requirements of the modern stack.