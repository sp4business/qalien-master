# API Specification - Modern Stack
> **Status**: Migration Phase 1 - Frontend Only → Modern Stack  
> **Last Updated**: 7 Jan 2025  
> **Stack**: Vercel + Supabase + Clerk + Bedrock  

---

## 🚀 **Modern Stack Architecture Overview**

QAlien is migrating from AWS-heavy architecture to a modern stack:
- **Frontend**: Next.js 15 + React 19 + Vercel
- **Auth**: Clerk (multi-tenant organizations)
- **Database**: Supabase Postgres + pgvector
- **API**: Supabase Edge Functions (TypeScript)
- **Storage**: Supabase Storage (S3-compatible)
- **AI**: AWS Bedrock (Claude 3.5 Sonnet), Google Gemini 1.5 Pro, AssemblyAI
- **Email**: Resend

### **Migration Status**
- **Phase 1**: Frontend migration ✅ Complete
- **Phase 2**: Backend API migration to Edge Functions ✅ Complete
- **Phase 3**: Database migration to Postgres ✅ Complete
- **Phase 4**: Full production deployment ✅ Complete
- **Current**: AI Service optimization (Gemini integration) ✅ Complete

---

## 🏢 **Multi-Organization API Model**

### **Core Structure**
```
User → Organization → Brand → Creatives
```

### **Access Control**
- **Organization Level**: OrgAdmin/OrgMember
- **Brand Level**: Admin/Editor/Viewer
- **Complete Data Isolation** between organizations

---

## 📊 **API Endpoints (Target Architecture)**

### **Organization Management**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/organizations` | GET | `authenticated` | List user's organizations |
| `/api/organizations` | POST | `authenticated` | Create new organization |
| `/api/organizations/{id}/switch` | POST | `org_member` | Switch active organization |
| `/api/organizations/{id}/invite` | POST | `org_admin` | Invite user to organization |

### **Brand Management**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/brands` | GET | `org_member` | List brands in organization |
| `/api/brands` | POST | `org_admin` | Create new brand |
| `/api/brands/{id}` | GET | `brand_member` | Get brand details |
| `/api/brands/{id}` | PUT | `brand_admin` | Update brand |
| `/api/brands/{id}` | DELETE | `brand_admin` | Delete brand |

### **Creative Management**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/creatives` | GET | `brand_member` | List creatives |
| `/api/creatives` | POST | `brand_admin` | Upload creative |
| `/api/creatives/{id}` | GET | `brand_member` | Get creative details |
| `/api/creatives/{id}/analysis` | GET | `brand_member` | Get AI analysis |

### **Campaign Management (Implemented)**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/functions/v1/create-campaign` | POST | `authenticated` | Create new campaign |
| Direct Supabase Query | GET | `authenticated` | List campaigns via RLS |
| Real-time Subscription | WS | `authenticated` | Live campaign updates |

### **AI Analysis (Current Implementation)**
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/functions/v1/process-new-creative` | POST | `authenticated` | Queue creative for analysis |
| `/functions/v1/process-ai-job-queue` | POST | `service` | Process queued AI jobs (cron) |
| `/functions/v1/get-asset-upload-url` | POST | `authenticated` | Generate signed upload URL |
| `/functions/v1/link-campaign-asset` | POST | `authenticated` | Link uploaded asset to campaign |
| `/functions/v1/delete-campaign-asset` | DELETE | `authenticated` | Delete campaign asset |
| Real-time Subscription | WS | `authenticated` | Live analysis updates via Supabase |

---

## 🔐 **Authentication (Clerk Integration)**

### **JWT Claims Structure**
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "org_id": "current-org-uuid",
  "org_role": "OrgAdmin",
  "organizations": [
    {"org_id": "org-1", "role": "OrgAdmin"},
    {"org_id": "org-2", "role": "OrgMember"}
  ],
  "brands": [
    {"brand_id": "brand-1", "role": "Admin"},
    {"brand_id": "brand-2", "role": "Viewer"}
  ]
}
```

### **Organization Switching**
```typescript
// Switch organization context
await clerk.organizations.setActive({
  organization: "org-uuid-123"
});
```

---

## 🤖 **AI Services Architecture (Current Implementation)**

### **Google Gemini 1.5 Pro** (Primary Creative Analysis)
**Purpose**: Comprehensive video and image analysis for brand compliance
- **Model**: `gemini-1.5-pro`
- **Capabilities**: 
  - Logo compliance checking
  - Color palette analysis  
  - Brand tone assessment
  - Disclaimer compliance
  - Layout compliance
  - UGC vs Produced classification
  - Multi-modal content understanding

**Video Processing Limits**:
- Maximum size: 20MB (inline processing)
- Supported formats: MP4 (H.264), WebM, MOV, AVI, 3GPP, FLV, MPG, WMV
- Unsupported: HEVC/H.265 (requires conversion to H.264)

### **AWS Bedrock Claude 3.5 Sonnet**
**Purpose**: Brand vocabulary and pronunciation analysis
- **Model**: `anthropic.claude-3-5-sonnet-20240620-v1:0`
- **Capabilities**: 
  - Brand name pronunciation checking
  - Banned/approved vocabulary analysis
  - Text-based compliance assessment
  - PDF guideline extraction

### **AssemblyAI**
**Purpose**: Audio transcription
- **Capabilities**: 
  - High-accuracy speech-to-text
  - Word-level timestamps
  - Language detection
  - Confidence scoring

### **AI Job Queue System**
**Database Table**: `ai_job_queue`
**Processing**: Cron job every minute with atomic dequeuing
**Features**: 
- Race condition prevention
- Error handling and retry logic
- Real-time status updates
- Exponential backoff for rate limiting

---

## 💾 **Database Schema (Supabase Postgres)**

### **Organizations Table**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Organization Memberships**
```sql
CREATE TABLE organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50) CHECK (role IN ('OrgAdmin', 'OrgMember')),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);
```

### **Brands Table** (Current Implementation)
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id VARCHAR(255) NOT NULL, -- References Clerk organization
  name VARCHAR(255) NOT NULL,
  description TEXT,
  industry VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  
  -- Brand Guidelines  
  logo_files TEXT[] DEFAULT '{}',
  color_palette TEXT[] DEFAULT '{}',
  tone_keywords TEXT[] DEFAULT '{}', -- Used by Gemini for tone analysis
  approved_terms TEXT[] DEFAULT '{}',
  banned_terms TEXT[] DEFAULT '{}',
  required_disclaimers TEXT[] DEFAULT '{}',
  phonetic_pronunciation TEXT, -- For pronunciation checking
  
  -- Layout Rules
  safe_zone_config JSONB DEFAULT '{}',
  
  -- Metadata
  created_by_clerk_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Campaign Assets Table** (Current Implementation)
```sql  
CREATE TABLE campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  storage_path TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  
  -- Analysis Results
  source_properties JSONB,
  ugc_detection_data JSONB,
  creative_type TEXT CHECK (creative_type IN ('UGC', 'Produced')),
  legend_results JSONB, -- Comprehensive compliance analysis from Gemini
  raw_transcript_data JSONB, -- Complete AssemblyAI transcript
  frontend_report JSONB, -- User-facing compliance report
  overall_status TEXT CHECK (overall_status IN ('pass', 'warn', 'fail')),
  compliance_score INTEGER,
  
  -- Processing Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **AI Job Queue Table**
```sql
CREATE TABLE ai_job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES campaign_assets(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);
```

### **Team Invitations Table**
```sql
CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  scope_type TEXT CHECK (scope_type IN ('organization', 'brand')),
  scope_id TEXT NOT NULL,
  invited_by TEXT NOT NULL,
  clerk_invitation_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

---

## 🎯 **Edge Functions (Supabase)**

### **Function Structure**
```typescript
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

export default async function handler(req: Request) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Your logic here
  
  return new Response(
    JSON.stringify({ success: true }),
    { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    }
  )
}
```

### **AI Analysis Function**
```typescript
import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime'

export default async function handler(req: Request) {
  const bedrock = new BedrockRuntime({
    region: 'us-east-1',
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? ''
    }
  })

  const response = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: 'Analyze this creative for brand compliance...'
        }
      ],
      max_tokens: 1000
    })
  })

  return new Response(JSON.stringify(response))
}
```

---

## 📁 **File Storage (Supabase Storage)**

### **Bucket Structure**
```
qalien-storage/
├── organizations/{org_id}/
│   ├── brands/{brand_id}/
│   │   ├── guidelines/
│   │   ├── logos/
│   │   └── assets/
│   └── creatives/{creative_id}/
└── public/
    └── templates/
```

### **Upload Flow**
```typescript
// Generate upload URL
const { data, error } = await supabase.storage
  .from('qalien-storage')
  .createSignedUploadUrl(`organizations/${orgId}/creatives/${creativeId}`)

// Upload file
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('qalien-storage')
  .upload(filePath, file, {
    upsert: true,
    contentType: file.type
  })
```

---

## 🚀 **Migration Strategy**

### **Phase 1: Frontend Only (Current)**
- Extract frontend to qa-alien-master
- Remove AWS dependencies
- Add Clerk authentication
- Stub API calls with mock data
- Deploy to Vercel

### **Phase 2: Backend Migration**
- Setup Supabase project
- Implement Edge Functions
- Migrate authentication to Clerk
- Connect to Bedrock for AI

### **Phase 3: Database Migration**
- Export data from DynamoDB
- Transform to Postgres format
- Import to Supabase
- Update application queries

### **Phase 4: Production**
- DNS cutover
- Monitor and optimize
- Decommission AWS resources

---

## 🔍 **Error Handling**

### **Standard Error Response**
```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have admin access to brand",
    "details": {
      "org_id": "org-123",
      "brand_id": "brand-456",
      "user_role": "Viewer"
    }
  }
}
```

### **HTTP Status Codes**
- **200 OK**: Success
- **400 Bad Request**: Invalid request
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

---

## 📊 **Performance Considerations**

### **Database Optimization**
- Proper indexing on org_id, brand_id, user_id
- Row Level Security (RLS) policies
- Connection pooling via Supabase
- Query optimization with explain plans

### **Edge Functions**
- Keep functions under 50MB
- Optimize cold starts
- Cache frequently accessed data
- Use background tasks for long operations

### **Storage**
- CDN for static assets
- Compression for large files
- Lifecycle policies for old data
- Optimized image formats

---

## 🛠 **Development Tools**

### **Local Development**
```bash
# Start Supabase locally
supabase start

# Run Edge Functions locally
supabase functions serve

# Deploy functions
supabase functions deploy --project-ref PROJECT_ID
```

### **Database Management**
```bash
# Create migration
supabase migration new add_organizations

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

---

## 📦 **Campaign Management Implementation**

### **Edge Function: create-campaign**

The campaign creation edge function handles secure campaign creation with comprehensive validation and tracking.

#### **Request Format**
```typescript
POST /functions/v1/create-campaign
Authorization: Bearer <clerk_jwt_token>

{
  "brandId": "uuid",
  "campaignData": {
    "name": "Summer 2025 Campaign",
    "campaign_type": "Social Media",
    "description": "Summer product launch",
    "start_date": "2025-06-01",
    "end_date": "2025-08-31",
    "budget": 50000,
    "currency": "USD",
    "country": "United States"
  }
}
```

#### **Response Format**
```typescript
{
  "data": {
    "id": "uuid",
    "brand_id": "uuid",
    "name": "Summer 2025 Campaign",
    "campaign_type": "Social Media",
    "description": "Summer product launch",
    "start_date": "2025-06-01T00:00:00Z",
    "end_date": "2025-08-31T00:00:00Z",
    "budget": 50000,
    "currency": "USD",
    "country": "United States",
    "created_at": "2025-07-11T10:00:00Z"
  }
}
```

#### **Security Features**
1. **JWT Validation**: Clerk token required
2. **Brand Access Check**: Verifies user belongs to brand's organization
3. **Input Validation**: Required fields and data type checks
4. **RLS Enforcement**: Database-level security

#### **PostHog Integration**
When configured, tracks `campaign_created` events with:
- Campaign details (id, name, type)
- Budget information for revenue tracking
- Organization and user metadata
- Timestamp for analytics

---

This API specification provides the foundation for QAlien's modern stack migration while maintaining all the multi-organization functionality and business logic of the original system.