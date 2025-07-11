# Data Schemas - Modern Stack
> **Status**: Migration to Supabase Postgres  
> **Last Updated**: 7 Jan 2025  
> **Purpose**: Comprehensive schemas for QAlien entities on modern stack

---

## 🚀 **Modern Stack Data Model**

### **Stack Components**
- **Database**: Supabase Postgres (JSONB support)
- **Schema**: SQL with UUID primary keys
- **Security**: Row Level Security (RLS) policies
- **Search**: pgvector for AI embeddings
- **Storage**: Supabase Storage (S3-compatible)

### **Core Architecture**
```
User → Organization → Brand → Creative
     └─ Clerk Auth    └─ Postgres    └─ Supabase Storage
```

---

## 🏢 **Organization Schema**

### **Organizations Table**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  industry VARCHAR(100),
  asset_quota_gb INTEGER DEFAULT 100,
  billing_email VARCHAR(255),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
```

### **Organization Memberships Table**
```sql
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('admin', 'member')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'disabled')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Indexes
CREATE INDEX idx_org_memberships_org_id ON organization_memberships(org_id);
CREATE INDEX idx_org_memberships_user_id ON organization_memberships(user_id);
```

---

## 👤 **User Schema**

### **Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  last_org_id UUID REFERENCES organizations(id),
  default_org_id UUID REFERENCES organizations(id),
  slack_webhook TEXT,
  slack_user_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
```

---

## 🎨 **Brand Schema**

### **Brands Table**
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
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
  website TEXT,
  
  -- Layout Rules
  safe_zone_config JSONB DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brands_org_id ON brands(org_id);
CREATE INDEX idx_brands_name ON brands(name);
```

### **Brand Memberships Table**
```sql
CREATE TABLE brand_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('admin', 'editor', 'viewer')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'disabled')),
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(brand_id, user_id)
);

-- Indexes
CREATE INDEX idx_brand_memberships_brand_id ON brand_memberships(brand_id);
CREATE INDEX idx_brand_memberships_user_id ON brand_memberships(user_id);

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
```

---

## 🎯 **Creative Schema**

### **Creatives Table**
```sql
CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  
  -- File Information
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  -- Media Properties
  duration_seconds DECIMAL(10,2),
  width INTEGER,
  height INTEGER,
  aspect_ratio DECIMAL(5,2),
  
  -- Creative Type
  creative_type VARCHAR(20) DEFAULT 'UGC' CHECK (creative_type IN ('UGC', 'Produced')),
  ugc_score INTEGER DEFAULT 0 CHECK (ugc_score >= 0 AND ugc_score <= 4),
  
  -- Analysis Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_results JSONB,
  overall_status VARCHAR(20) CHECK (overall_status IN ('pass', 'warn', 'fail')),
  compliance_score INTEGER CHECK (compliance_score >= 0 AND compliance_score <= 100),
  
  -- Timestamps
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_creatives_org_id ON creatives(org_id);
CREATE INDEX idx_creatives_brand_id ON creatives(brand_id);
CREATE INDEX idx_creatives_campaign_id ON creatives(campaign_id);
CREATE INDEX idx_creatives_status ON creatives(status);
CREATE INDEX idx_creatives_uploaded_at ON creatives(uploaded_at DESC);
```

### **Creative Analysis Table**
```sql
CREATE TABLE creative_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES creatives(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Analysis Metadata
  legend_version VARCHAR(10) DEFAULT '1.0',
  ai_model_version VARCHAR(50),
  analysis_timestamp TIMESTAMP DEFAULT NOW(),
  
  -- Results
  tag_results JSONB NOT NULL,
  citations_meta JSONB DEFAULT '{}',
  overall_status VARCHAR(20) CHECK (overall_status IN ('pass', 'warn', 'fail')),
  confidence_score DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_creative_analysis_creative_id ON creative_analysis(creative_id);
CREATE INDEX idx_creative_analysis_brand_id ON creative_analysis(brand_id);
```

---

## 🚀 **Campaign Schema**

### **Campaigns Table**
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Campaign Details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50),
  strategy VARCHAR(20) CHECK (strategy IN ('organic', 'paid', 'hybrid')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  
  -- Date Range
  start_date DATE,
  end_date DATE,
  
  -- Budget and Performance
  budget_amount DECIMAL(15,2),
  budget_currency VARCHAR(3) DEFAULT 'USD',
  actual_spend DECIMAL(15,2) DEFAULT 0,
  revenue_target DECIMAL(15,2),
  actual_revenue DECIMAL(15,2) DEFAULT 0,
  
  -- Targeting
  target_markets TEXT[] DEFAULT '{}',
  target_age_min INTEGER,
  target_age_max INTEGER,
  target_gender VARCHAR(20),
  target_interests TEXT[] DEFAULT '{}',
  
  -- Distribution
  distribution_channels TEXT[] DEFAULT '{}',
  primary_platform VARCHAR(50),
  
  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX idx_campaigns_brand_id ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
```

---

## 📊 **Analytics Schema**

### **Creative Embeddings Table (pgvector)**
```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE creative_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES creatives(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI embedding dimension
  is_golden BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX idx_creative_embeddings_vector ON creative_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Regular indexes
CREATE INDEX idx_creative_embeddings_creative_id ON creative_embeddings(creative_id);
CREATE INDEX idx_creative_embeddings_brand_id ON creative_embeddings(brand_id);
CREATE INDEX idx_creative_embeddings_is_golden ON creative_embeddings(is_golden);
```

### **PDF Analysis Table**
```sql
CREATE TABLE pdf_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- File Information
  filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  
  -- Analysis Status
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  
  -- Extracted Data
  colors JSONB DEFAULT '[]',
  logos JSONB DEFAULT '[]',
  verbal_identity JSONB DEFAULT '{}',
  
  -- Metadata
  pages_analyzed INTEGER DEFAULT 0,
  overall_confidence DECIMAL(5,2),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_pdf_analysis_brand_id ON pdf_analysis(brand_id);
CREATE INDEX idx_pdf_analysis_org_id ON pdf_analysis(org_id);
CREATE INDEX idx_pdf_analysis_status ON pdf_analysis(status);
```

---

## 🔐 **Row Level Security (RLS)**

### **Organization Access Policies**
```sql
-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE creatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE creative_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_analysis ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM users 
    WHERE clerk_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations: Users can only see orgs they belong to
CREATE POLICY "organization_access" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.org_id = organizations.id
        AND om.user_id = auth.current_user_id()
        AND om.status = 'active'
    )
  );

-- Brands: Access via organization membership
CREATE POLICY "brand_access" ON brands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.org_id = brands.org_id
        AND om.user_id = auth.current_user_id()
        AND om.status = 'active'
    )
  );

-- Creatives: Access via brand membership or org admin
CREATE POLICY "creative_access" ON creatives
  FOR ALL USING (
    -- Direct brand membership
    EXISTS (
      SELECT 1 FROM brand_memberships bm
      WHERE bm.brand_id = creatives.brand_id
        AND bm.user_id = auth.current_user_id()
        AND bm.status = 'active'
    )
    OR
    -- Organization admin access
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.org_id = creatives.org_id
        AND om.user_id = auth.current_user_id()
        AND om.role = 'admin'
        AND om.status = 'active'
    )
  );
```

---

## 📋 **JSON Schema Examples**

### **Brand Configuration (JSONB)**
```json
{
  "id": "brand-uuid-123",
  "org_id": "org-uuid-456",
  "name": "Nespresso",
  "description": "Premium coffee experience",
  "industry": "Food & Beverage",
  "color_palette": ["#000000", "#FFFFFF", "#5C3D2E"],
  "tone_keywords": ["premium", "sophisticated", "inviting"],
  "approved_terms": ["Nespresso", "Original", "Vertuo"],
  "banned_terms": ["free refill", "discount"],
  "required_disclaimers": ["© Nespresso 2025"],
  "safe_zone_config": {
    "logo_area": "top-left",
    "text_area_pct_max": 20
  },
  "created_at": "2025-01-07T10:00:00Z"
}
```

### **Creative Analysis Results (JSONB)**
```json
{
  "legend_version": "1.0",
  "creative_type": "UGC",
  "analysis_timestamp": "2025-01-07T10:05:00Z",
  "tag_results": {
    "logos_iconography": {
      "status": "pass",
      "confidence": 0.94,
      "notes": "Primary logo detected in safe zone"
    },
    "colors_palette": {
      "status": "pass",
      "dominant_hex": ["#5C3D2E", "#000000"],
      "deltaE_max": 4.1,
      "notes": "Colors within brand palette tolerance"
    },
    "brand_vocabulary": {
      "status": "pass",
      "notes": "No banned terms found, approved terms present"
    },
    "brand_tone": {
      "status": "warn",
      "llm_score": 0.78,
      "notes": "Tone slightly more casual than brand guidelines"
    },
    "disclaimers_required_language": {
      "status": "fail",
      "notes": "Required copyright notice missing"
    },
    "layout_safe_zone": {
      "status": "pass",
      "text_area_pct": 15.5,
      "notes": "Layout follows brand guidelines"
    },
    "golden_set_similarity": {
      "status": "pass",
      "similarity": 0.85,
      "notes": "High similarity to approved examples"
    }
  },
  "overall_status": "warn"
}
```

### **Campaign Analytics (JSONB)**
```json
{
  "id": "campaign-uuid-789",
  "org_id": "org-uuid-456",
  "brand_id": "brand-uuid-123",
  "name": "Summer 2025 Launch",
  "campaign_type": "Product Launch",
  "strategy": "hybrid",
  "status": "active",
  "start_date": "2025-07-01",
  "end_date": "2025-08-31",
  "budget_amount": 50000.00,
  "budget_currency": "USD",
  "actual_spend": 25000.00,
  "revenue_target": 200000.00,
  "actual_revenue": 62500.00,
  "target_markets": ["United States", "Canada"],
  "target_age_min": 25,
  "target_age_max": 45,
  "target_interests": ["Fashion", "Technology"],
  "distribution_channels": ["Instagram", "TikTok"],
  "primary_platform": "Instagram",
  "created_at": "2025-01-07T09:00:00Z"
}
```

### **PDF Analysis Results (JSONB)**
```json
{
  "colors": [
    {
      "hex": "#e60000",
      "rgb": [230, 0, 0],
      "frequency": 0.45,
      "confidence": "high",
      "source": "text_extraction",
      "source_detail": "hex_code"
    },
    {
      "hex": "#c7141a",
      "rgb": [199, 20, 26],
      "frequency": 0.35,
      "confidence": "high",
      "source": "text_extraction",
      "source_detail": "Pantone 186 C"
    }
  ],
  "logos": [
    {
      "s3_key": "organizations/org-uuid/brands/brand-uuid/logos/extracted-logo-1.png",
      "confidence": 0.85,
      "page_number": 3,
      "bounding_box": {
        "x": 100,
        "y": 200,
        "width": 300,
        "height": 150
      }
    }
  ],
  "verbal_identity": {
    "tone": "Premium, sophisticated, inviting",
    "approved_terms": ["Premium", "Exceptional", "Sustainable"],
    "banned_terms": ["Cheap", "Discount", "Sale"],
    "required_disclaimers": ["© All rights reserved"]
  }
}
```

---

## 🔍 **Query Patterns**

### **Organization-Scoped Queries**
```sql
-- Get all brands for a user's current organization
SELECT b.* FROM brands b
JOIN organization_memberships om ON b.org_id = om.org_id
WHERE om.user_id = auth.current_user_id() 
  AND om.status = 'active'
  AND b.org_id = $1;

-- Get all creatives for an organization
SELECT c.* FROM creatives c
JOIN organization_memberships om ON c.org_id = om.org_id
WHERE om.user_id = auth.current_user_id()
  AND om.status = 'active'
  AND c.org_id = $1
ORDER BY c.uploaded_at DESC;
```

### **Brand-Specific Queries**
```sql
-- Get creatives for a specific brand
SELECT c.* FROM creatives c
WHERE c.brand_id = $1
  AND EXISTS (
    SELECT 1 FROM brand_memberships bm
    WHERE bm.brand_id = c.brand_id
      AND bm.user_id = auth.current_user_id()
      AND bm.status = 'active'
  )
ORDER BY c.uploaded_at DESC;

-- Get compliance analytics for a brand
SELECT 
  COUNT(*) as total_creatives,
  COUNT(*) FILTER (WHERE overall_status = 'pass') as approved_count,
  COUNT(*) FILTER (WHERE overall_status = 'warn') as warning_count,
  COUNT(*) FILTER (WHERE overall_status = 'fail') as failed_count,
  AVG(compliance_score) as avg_compliance_score
FROM creatives
WHERE brand_id = $1
  AND status = 'completed';
```

### **Vector Similarity Queries**
```sql
-- Find similar creatives using pgvector
SELECT 
  c.id,
  c.filename,
  ce.embedding <-> $1 as distance
FROM creative_embeddings ce
JOIN creatives c ON ce.creative_id = c.id
WHERE ce.brand_id = $2
  AND ce.is_golden = true
ORDER BY ce.embedding <-> $1
LIMIT 5;

-- Golden set similarity analysis
SELECT 
  AVG(1 - (ce.embedding <-> $1)) as similarity_score
FROM creative_embeddings ce
WHERE ce.brand_id = $2
  AND ce.is_golden = true;
```

---

## 🔄 **Migration Strategy**

### **Phase 1: Schema Creation**
1. Create all tables with UUID primary keys
2. Setup RLS policies for data isolation
3. Create indexes for query performance
4. Enable pgvector extension

### **Phase 2: Data Migration**
1. Export data from DynamoDB
2. Transform to PostgreSQL format
3. Migrate users and organizations
4. Migrate brands and creatives
5. Verify data integrity

### **Phase 3: Application Integration**
1. Update API endpoints for Supabase
2. Implement RLS-aware queries
3. Test data isolation
4. Deploy incrementally

---

## 🎯 **Performance Considerations**

### **Indexing Strategy**
- **Primary keys**: UUID with B-tree indexes
- **Foreign keys**: Indexes on all FK columns
- **Query patterns**: Composite indexes for common filters
- **Vector search**: IVFFlat indexes for embeddings

### **Query Optimization**
- **RLS policies**: Efficient with proper indexes
- **JSONB queries**: GIN indexes for complex queries
- **Pagination**: Cursor-based with timestamps
- **Caching**: Built-in Supabase query caching

### **Scaling Considerations**
- **Read replicas**: For analytics queries
- **Partitioning**: By organization for large datasets
- **Connection pooling**: Built-in with Supabase
- **Real-time**: Optimized for specific tables

---

This modern schema provides enterprise-grade data modeling with complete multi-organization isolation, advanced search capabilities, and high performance while maintaining all the business logic and compliance tracking features of the original system.