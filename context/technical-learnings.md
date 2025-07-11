# Technical Learnings - Modern Stack
> **Status**: Migration to Vercel + Supabase + Bedrock  
> **Last Updated**: 7 Jan 2025  
> **Purpose**: Technical solutions and learnings for modern stack migration

---

## 🚀 **Modern Stack Architecture Learnings**

### **Key Technology Decisions**
- **Frontend**: Next.js 15 + React 19 + Vercel (auto-deploy)
- **Auth**: Clerk (zero-config multi-tenancy)
- **Database**: Supabase Postgres + RLS (automatic security)
- **API**: Supabase Edge Functions (TypeScript)
- **AI**: AWS Bedrock (via Edge Functions)
- **Storage**: Supabase Storage (S3-compatible)
- **Email**: Resend (developer-friendly)

### **Benefits Over AWS Stack**
1. **Zero DevOps**: No YAML, no infrastructure management
2. **Instant Deploy**: Git push → live in seconds
3. **Better DX**: Integrated tooling, real-time debugging
4. **Automatic Scaling**: Built-in edge distribution
5. **Cost Predictable**: No surprise AWS bills

---

## 🔧 **Supabase Edge Functions Development**

### **Edge Function Architecture**
```typescript
// Modern Edge Function pattern
import { createClient } from '@supabase/supabase-js'
import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime'

export default async function handler(req: Request) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const bedrock = new BedrockRuntime({
    region: 'us-east-1',
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!
    }
  })
  
  try {
    // Business logic here
    const result = await processRequest(supabase, bedrock, req)
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

### **Key Edge Function Patterns**

#### **1. Authentication Integration**
```typescript
// Get user from Clerk JWT
const authHeader = req.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')

const { data: { user } } = await supabase.auth.getUser(token)
if (!user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

#### **2. Database Operations with RLS**
```typescript
// RLS automatically enforces access control
const { data: brands } = await supabase
  .from('brands')
  .select('*')
  .eq('org_id', orgId)
  // RLS automatically filters by user's organization access
```

#### **3. Bedrock Integration**
```typescript
// AI analysis with Bedrock
const response = await bedrock.invokeModel({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  body: JSON.stringify({
    messages: [
      {
        role: 'user',
        content: `Analyze this creative for brand compliance: ${imageData}`
      }
    ],
    max_tokens: 2000
  })
})

const result = JSON.parse(new TextDecoder().decode(response.body))
```

---

## 🎨 **PDF Analysis with Bedrock**

### **Modern PDF Processing Pipeline**
```typescript
// Edge Function: PDF Analysis
export default async function handler(req: Request) {
  const { pdfUrl, brandId } = await req.json()
  
  // 1. Download PDF from Supabase Storage
  const { data: pdfData } = await supabase.storage
    .from('brand-guidelines')
    .download(pdfUrl)
  
  // 2. Convert to images using Deno FFI (if needed)
  // Or use Bedrock's native PDF processing
  
  // 3. Analyze with Bedrock
  const analysis = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract brand colors, logos, and verbal identity from this PDF'
            },
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64PdfData
              }
            }
          ]
        }
      ]
    })
  })
  
  // 4. Store results in Supabase
  const { data: result } = await supabase
    .from('pdf_analysis')
    .insert({
      brand_id: brandId,
      colors: extractedColors,
      logos: extractedLogos,
      verbal_identity: extractedVerbals,
      status: 'completed'
    })
  
  return Response.json(result)
}
```

### **Advantages Over Lambda + Docker**
1. **No Container Management**: Edge Functions run Deno runtime
2. **Instant Cold Start**: Sub-100ms initialization
3. **Automatic Scaling**: Handles traffic spikes seamlessly
4. **Built-in Observability**: Real-time logs and metrics
5. **TypeScript Native**: Better development experience

---

## 🔐 **Authentication & Security**

### **Clerk + Supabase Integration**
```typescript
// JWT Template for Supabase (in Clerk Dashboard)
{
  "aud": "authenticated",
  "exp": {{date.unix_timestamp + 3600}},
  "iat": {{date.unix_timestamp}},
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "clerk_id": "{{user.id}}",
    "org_id": "{{org.id}}",
    "org_role": "{{org.role}}"
  }
}
```

### **Row Level Security (RLS) Patterns**
```sql
-- Automatic data isolation
CREATE POLICY "users_own_data" ON brands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.org_id = brands.org_id
        AND om.user_id = auth.current_user_id()
        AND om.status = 'active'
    )
  );
```

### **Security Benefits**
1. **Automatic Authorization**: RLS enforces access control
2. **JWT Validation**: Clerk handles token verification
3. **API Security**: Built-in CORS, rate limiting
4. **Data Isolation**: Complete tenant separation

---

## 📊 **Real-time Features**

### **Supabase Realtime Integration**
```typescript
// Real-time creative analysis updates
const supabase = createClient(url, key)

const subscription = supabase
  .channel('creative_analysis')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'creatives',
      filter: `brand_id=eq.${brandId}`
    },
    (payload) => {
      // Update UI with new analysis results
      setCreativeStatus(payload.new.status)
      setAnalysisResults(payload.new.analysis_results)
    }
  )
  .subscribe()
```

### **Real-time Patterns**
1. **Live Status Updates**: Creative processing progress
2. **Collaborative Editing**: Multi-user brand editing
3. **Instant Notifications**: Team member invitations
4. **Analytics Dashboards**: Real-time compliance metrics

---

## 🎯 **Vector Search with pgvector**

### **Golden Set Similarity Search**
```sql
-- Create embedding table
CREATE TABLE creative_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES creatives(id),
  embedding vector(1536),
  is_golden BOOLEAN DEFAULT false
);

-- Create vector index
CREATE INDEX idx_creative_embeddings_vector 
ON creative_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### **Similarity Search Queries**
```typescript
// Find similar creatives
const { data: similarCreatives } = await supabase
  .from('creative_embeddings')
  .select(`
    *,
    creatives!inner(
      id,
      filename,
      file_url
    )
  `)
  .eq('creatives.brand_id', brandId)
  .eq('is_golden', true)
  .order('embedding <-> $1', { ascending: true })
  .limit(5)
```

### **Vector Search Benefits**
1. **Native Support**: No external vector database
2. **SQL Integration**: Combine with relational queries
3. **Performance**: Optimized for similarity search
4. **Simplicity**: No additional infrastructure

---

## 🚀 **Deployment & DevOps**

### **Vercel Deployment Pipeline**
```bash
# Automatic deployment on git push
git push origin main  # Vercel auto-deploys

# Manual deployment
vercel --prod

# Preview deployments
vercel  # Creates preview URL for testing
```

### **Supabase Database Migrations**
```bash
# Generate migration
supabase migration new add_campaigns_table

# Apply locally
supabase db push

# Apply to production
supabase db push --project-ref PROJECT_ID
```

### **Edge Functions Deployment**
```bash
# Deploy single function
supabase functions deploy analyze-creative

# Deploy all functions
supabase functions deploy --project-ref PROJECT_ID
```

### **Environment Management**
```typescript
// Type-safe environment variables
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string()
})

export const env = envSchema.parse(process.env)
```

---

## 🔍 **Debugging & Monitoring**

### **Modern Debugging Tools**
```typescript
// Edge Function debugging
console.log('Debug info:', { userId, brandId, timestamp: new Date() })

// Supabase query debugging
const { data, error } = await supabase
  .from('brands')
  .select('*')
  .eq('id', brandId)
  .single()

if (error) {
  console.error('Supabase error:', error)
}
```

### **Real-time Logs**
```bash
# Watch Edge Function logs
supabase functions logs --project-ref PROJECT_ID analyze-creative --follow

# Watch database logs
supabase logs --project-ref PROJECT_ID --type postgres
```

### **Performance Monitoring**
```typescript
// Built-in performance tracking
const startTime = performance.now()
const result = await processCreative(data)
const endTime = performance.now()

console.log(`Processing took ${endTime - startTime} milliseconds`)
```

---

## 📱 **Frontend Development Patterns**

### **React Query + Supabase**
```typescript
// Data fetching with React Query
function useBrands(orgId: string) {
  const supabase = useSupabaseClient()
  
  return useQuery({
    queryKey: ['brands', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!orgId
  })
}
```

### **Optimistic Updates**
```typescript
// Optimistic brand creation
const createBrandMutation = useMutation({
  mutationFn: async (brandData) => {
    const { data, error } = await supabase
      .from('brands')
      .insert(brandData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  onMutate: async (newBrand) => {
    // Optimistically update UI
    queryClient.setQueryData(['brands', orgId], (old) => [
      ...old,
      { ...newBrand, id: 'temp-id' }
    ])
  }
})
```

### **Real-time UI Updates**
```typescript
// Subscribe to real-time changes
useEffect(() => {
  const subscription = supabase
    .channel('brands')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'brands',
      filter: `org_id=eq.${orgId}`
    }, (payload) => {
      // Update React Query cache
      queryClient.invalidateQueries(['brands', orgId])
    })
    .subscribe()
  
  return () => subscription.unsubscribe()
}, [orgId])
```

---

## ⚡ **Performance Optimizations**

### **Database Query Optimization**
```sql
-- Efficient queries with proper indexes
CREATE INDEX CONCURRENTLY idx_brands_org_created 
ON brands(org_id, created_at DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_active_memberships 
ON organization_memberships(org_id, user_id) 
WHERE status = 'active';
```

### **Edge Function Performance**
```typescript
// Connection pooling and caching
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  {
    db: {
      schema: 'public'
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### **Frontend Performance**
```typescript
// Code splitting and lazy loading
const BrandDashboard = lazy(() => import('./components/BrandDashboard'))
const CreativeAnalysis = lazy(() => import('./components/CreativeAnalysis'))

// Image optimization
import Image from 'next/image'

<Image
  src={creativeUrl}
  alt="Creative preview"
  width={300}
  height={200}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

---

## 🔄 **Migration Learnings**

### **Data Migration Strategy**
```typescript
// Automated migration script
async function migrateBrands() {
  // 1. Export from DynamoDB
  const dynamoData = await exportDynamoData()
  
  // 2. Transform for Postgres
  const postgresData = transformToPostgres(dynamoData)
  
  // 3. Insert into Supabase
  for (const batch of chunk(postgresData, 1000)) {
    await supabase
      .from('brands')
      .insert(batch)
  }
}
```

### **Frontend Migration Patterns**
```typescript
// Progressive migration approach
function useBrandData(brandId: string) {
  // Try modern API first, fallback to legacy
  const { data: modernData } = useQuery({
    queryKey: ['brands-v2', brandId],
    queryFn: () => fetchFromSupabase(brandId),
    onError: () => {
      // Fallback to legacy API
      return fetchFromLegacyAPI(brandId)
    }
  })
  
  return modernData
}
```

### **Migration Validation**
```typescript
// Data integrity checks
async function validateMigration() {
  const supabaseCount = await supabase
    .from('brands')
    .select('*', { count: 'exact' })
  
  const dynamoCount = await dynamoClient
    .scan({ TableName: 'brands' })
    .promise()
  
  if (supabaseCount.count !== dynamoCount.Count) {
    throw new Error('Migration count mismatch')
  }
}
```

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: CORS in Edge Functions**
```typescript
// Add CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // Handle request
  const result = await processRequest(req)
  
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}
```

### **Issue 2: RLS Policy Debugging**
```sql
-- Debug RLS policies
SELECT * FROM pg_policies WHERE tablename = 'brands';

-- Test policy with specific user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM brands; -- Should only return user's brands
```

### **Issue 3: Vector Search Performance**
```sql
-- Optimize vector index
CREATE INDEX CONCURRENTLY idx_creative_embeddings_vector 
ON creative_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM creative_embeddings 
ORDER BY embedding <-> '[0.1, 0.2, ...]' 
LIMIT 10;
```

### **Issue 4: Edge Function Timeouts**
```typescript
// Implement timeout handling
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 25000)

try {
  const result = await fetch(url, { 
    signal: controller.signal 
  })
  clearTimeout(timeoutId)
  return result
} catch (error) {
  if (error.name === 'AbortError') {
    return Response.json({ error: 'Request timeout' }, { status: 408 })
  }
  throw error
}
```

---

## 📊 **Cost Optimization**

### **Modern Stack Cost Benefits**
1. **Predictable Pricing**: Fixed monthly costs vs AWS usage-based
2. **Included Features**: Auth, storage, CDN included
3. **No Cold Start Costs**: Edge Functions always warm
4. **Built-in Optimization**: Automatic caching, compression

### **Usage Monitoring**
```typescript
// Track API usage
const { data: usage } = await supabase
  .from('api_usage')
  .select('*')
  .eq('org_id', orgId)
  .gte('created_at', startDate)
  .lte('created_at', endDate)
```

---

## 🚀 **Future Enhancements**

### **Planned Modern Stack Features**
1. **Supabase Edge Functions v2**: Improved performance
2. **pgvector 0.5**: Better vector operations
3. **Supabase Auth v3**: Enhanced multi-tenancy
4. **Vercel Edge Config**: Global configuration
5. **Supabase Realtime v2**: Improved real-time features

### **AI Integration Roadmap**
1. **Bedrock Multimodal**: Video + audio analysis
2. **Custom Models**: Fine-tuned brand models
3. **Embedding Generation**: Automated similarity
4. **A/B Testing**: AI prompt optimization

---

This modern stack provides significant improvements in developer experience, performance, and cost-effectiveness while maintaining all the sophisticated brand compliance features of the original system.