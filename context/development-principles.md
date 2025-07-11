# Development Principles - Modern Stack
> **Status**: Migration to Vercel + Supabase + Clerk  
> **Last Updated**: 7 Jan 2025  
> **Purpose**: Development guidelines for QAlien's modern stack migration

---

## 🚀 **Modern Stack Development Philosophy**

### **"Faster 2025" Principles**
1. **Zero DevOps**: No YAML, no infrastructure configuration
2. **Push to Deploy**: Git commits automatically deploy
3. **Integrated Tooling**: All tools work together seamlessly
4. **Developer Experience First**: Optimize for development speed
5. **Built-in Best Practices**: Security, performance, and monitoring included

### **Stack Components**
- **Frontend**: Next.js 15 + React 19 + TypeScript
- **Hosting**: Vercel (auto-deploy, CDN, edge functions)
- **Auth**: Clerk (multi-tenant, zero config)
- **Database**: Supabase (Postgres + real-time + storage)
- **API**: Supabase Edge Functions (TypeScript)
- **AI**: AWS Bedrock (via Edge Functions)
- **Email**: Resend (developer-friendly)

---

## 🏗 **Project Structure**

### **Frontend Architecture (qa-alien-master)**
```
qa-alien-master/
├── src/
│   ├── app/                    # Next.js 15 app router
│   │   ├── (auth)/            # Auth-protected routes
│   │   ├── (public)/          # Public routes
│   │   ├── api/               # API routes (if needed)
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ui/                # Base UI components
│   │   ├── auth/              # Auth components
│   │   ├── organization/      # Org management
│   │   ├── brand/            # Brand components
│   │   └── creative/         # Creative components
│   ├── lib/
│   │   ├── clerk.ts          # Clerk configuration
│   │   ├── supabase.ts       # Supabase client
│   │   ├── utils.ts          # Utilities
│   │   └── validations.ts    # Zod schemas
│   ├── hooks/
│   │   ├── useAuth.ts        # Auth hooks
│   │   ├── useOrganization.ts # Org hooks
│   │   └── useBrands.ts      # Brand hooks
│   ├── types/
│   │   └── index.ts          # TypeScript definitions
│   └── styles/
│       └── globals.css       # Tailwind + custom styles
├── supabase/
│   ├── functions/            # Edge Functions
│   ├── migrations/           # Database migrations
│   └── config.toml          # Supabase configuration
├── package.json
├── tailwind.config.js
├── next.config.js
└── tsconfig.json
```

### **Backend Architecture (Supabase)**
```
supabase/
├── functions/
│   ├── organizations/        # Org management
│   ├── brands/              # Brand CRUD
│   ├── creatives/           # Creative processing
│   ├── ai-analysis/         # Bedrock integration
│   └── _shared/             # Shared utilities
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_organizations.sql
│   ├── 003_create_brands.sql
│   └── 004_create_creatives.sql
├── seed.sql                # Development data
└── config.toml
```

---

## 💻 **Development Workflow**

### **Local Development**
```bash
# Start development server
npm run dev

# Start Supabase locally
supabase start

# Run Edge Functions locally
supabase functions serve

# Apply database migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.ts
```

### **Deployment Process**
```bash
# Frontend deployment (automatic)
git push origin main  # Vercel auto-deploys

# Database migrations
supabase db push --project-ref PROJECT_ID

# Edge Functions deployment
supabase functions deploy --project-ref PROJECT_ID

# Environment variables
vercel env add
```

---

## 🎯 **Multi-Organization Development**

### **Core Architecture Rules**

#### **1. Organization-First Data Access**
```typescript
// ✅ CORRECT - Always filter by organization first
export async function getBrands(orgId: string) {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('org_id', orgId)  // Organization filter first
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

// ❌ WRONG - No organization filtering
export async function getBrands() {
  const supabase = useSupabaseClient()
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}
```

#### **2. URL-Driven State Management**
```typescript
// ✅ CORRECT - URL as source of truth
'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export function BusinessCenter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org')
  
  // Derive state from URL
  const { data: organizations } = useOrganizations()
  const selectedOrg = organizations?.find(o => o.id === orgId)
  
  const handleOrgSwitch = (newOrgId: string) => {
    router.push(`/?org=${newOrgId}`)  // Update URL immediately
  }
  
  return (
    <div>
      {selectedOrg ? (
        <BrandsList orgId={selectedOrg.id} />
      ) : (
        <OrganizationsList onSelect={handleOrgSwitch} />
      )}
    </div>
  )
}

// ❌ WRONG - Local state causes navigation issues
export function BusinessCenter() {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [view, setView] = useState<'orgs' | 'brands'>('orgs')
  
  // State lost on page refresh or navigation
  return (
    <div>
      {view === 'orgs' ? (
        <OrganizationsList onSelect={setSelectedOrg} />
      ) : (
        <BrandsList orgId={selectedOrg?.id} />
      )}
    </div>
  )
}
```

#### **3. Context-Aware Navigation**
```typescript
// ✅ CORRECT - Always preserve context
export function BrandCard({ brand }: { brand: Brand }) {
  const searchParams = useSearchParams()
  const orgId = searchParams.get('org')
  
  const handleClick = () => {
    router.push(`/brands/${brand.id}?org=${orgId}`)  // Preserve org context
  }
  
  return (
    <div onClick={handleClick}>
      <h3>{brand.name}</h3>
    </div>
  )
}

// ❌ WRONG - Lose context on navigation
export function BrandCard({ brand }: { brand: Brand }) {
  const handleClick = () => {
    router.push(`/brands/${brand.id}`)  // Context lost
  }
  
  return (
    <div onClick={handleClick}>
      <h3>{brand.name}</h3>
    </div>
  )
}
```

---

## 🔐 **Security Best Practices**

### **Row Level Security (RLS)**
```sql
-- Always enable RLS on all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create policies that enforce organization isolation
CREATE POLICY "brands_org_access" ON brands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.org_id = brands.org_id
        AND om.user_id = auth.current_user_id()
        AND om.status = 'active'
    )
  );
```

### **Input Validation**
```typescript
// Always validate inputs with Zod
import { z } from 'zod'

const createBrandSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  org_id: z.string().uuid(),
  industry: z.string().optional()
})

export async function createBrand(data: unknown) {
  const validatedData = createBrandSchema.parse(data)
  // Proceed with validated data
}
```

### **Environment Variables**
```typescript
// env.mjs - Type-safe environment variables
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  RESEND_API_KEY: z.string()
})

export const env = envSchema.parse(process.env)
```

---

## 🎨 **UI/UX Patterns**

### **Component Structure**
```typescript
// components/ui/Button.tsx - Base UI component
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### **Loading States**
```typescript
// hooks/useLoadingStates.ts
export function useLoadingStates() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const execute = async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await asyncFn()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setIsLoading(false)
    }
  }
  
  return { isLoading, error, execute }
}
```

### **Error Boundaries**
```typescript
// components/ErrorBoundary.tsx
'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }
  
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }
  
  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-2">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      )
    }
    
    return this.props.children
  }
}
```

---

## 📊 **Data Fetching Patterns**

### **React Query Setup**
```typescript
// lib/react-query.ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        if (error.status === 404) return false
        return failureCount < 3
      }
    }
  }
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### **Custom Hooks**
```typescript
// hooks/useBrands.ts
import { useQuery } from '@tanstack/react-query'
import { useSupabaseClient } from '@/lib/supabase'

export function useBrands(orgId?: string) {
  const supabase = useSupabaseClient()
  
  return useQuery({
    queryKey: ['brands', orgId],
    queryFn: async () => {
      if (!orgId) return []
      
      const { data, error } = await supabase
        .from('brands')
        .select(`
          *,
          brand_memberships!inner(
            role,
            status
          )
        `)
        .eq('org_id', orgId)
        .eq('brand_memberships.status', 'active')
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
// hooks/useCreateBrand.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateBrand() {
  const queryClient = useQueryClient()
  const supabase = useSupabaseClient()
  
  return useMutation({
    mutationFn: async (brandData: CreateBrandInput) => {
      const { data, error } = await supabase
        .from('brands')
        .insert(brandData)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onMutate: async (newBrand) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['brands', newBrand.org_id] })
      
      // Snapshot previous value
      const previousBrands = queryClient.getQueryData(['brands', newBrand.org_id])
      
      // Optimistically update
      queryClient.setQueryData(['brands', newBrand.org_id], (old: any) => [
        ...old,
        { ...newBrand, id: 'temp-id', created_at: new Date() }
      ])
      
      return { previousBrands }
    },
    onError: (err, newBrand, context) => {
      // Rollback on error
      queryClient.setQueryData(['brands', newBrand.org_id], context?.previousBrands)
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['brands', variables.org_id] })
    }
  })
}
```

---

## 🔧 **Edge Functions Development**

### **Function Structure**
```typescript
// supabase/functions/brands/index.ts
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

export default async function handler(req: Request) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    // Get user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }
    
    // Route based on method
    switch (req.method) {
      case 'GET':
        return await getBrands(supabase, user.id)
      case 'POST':
        return await createBrand(supabase, user.id, await req.json())
      default:
        return new Response('Method not allowed', { status: 405 })
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}
```

### **AI Integration**
```typescript
// supabase/functions/ai-analysis/index.ts
import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime'

export default async function handler(req: Request) {
  const bedrock = new BedrockRuntime({
    region: 'us-east-1',
    credentials: {
      accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') ?? '',
      secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? ''
    }
  })
  
  const { creativeUrl, brandGuidelines } = await req.json()
  
  // Analyze creative with Bedrock
  const response = await bedrock.invokeModel({
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: `Analyze this creative for brand compliance:
            Creative: ${creativeUrl}
            Brand Guidelines: ${brandGuidelines}
            
            Return a JSON object with compliance scores.`
        }
      ],
      max_tokens: 1000
    })
  })
  
  const result = JSON.parse(new TextDecoder().decode(response.body))
  
  return new Response(JSON.stringify(result))
}
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
// __tests__/components/BrandCard.test.tsx
import { render, screen } from '@testing-library/react'
import { BrandCard } from '@/components/brand/BrandCard'

describe('BrandCard', () => {
  it('renders brand name correctly', () => {
    const brand = {
      id: 'test-id',
      name: 'Test Brand',
      org_id: 'org-id'
    }
    
    render(<BrandCard brand={brand} />)
    
    expect(screen.getByText('Test Brand')).toBeInTheDocument()
  })
})
```

### **Integration Tests**
```typescript
// __tests__/api/brands.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/brands'

describe('/api/brands', () => {
  it('returns brands for authenticated user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer valid-token'
      }
    })
    
    await handler(req, res)
    
    expect(res._getStatusCode()).toBe(200)
    expect(JSON.parse(res._getData())).toHaveProperty('brands')
  })
})
```

---

## 📈 **Performance Optimization**

### **Bundle Analysis**
```bash
# Analyze bundle size
npm run build
npm run analyze

# Check for unused dependencies
npx depcheck

# Optimize images
next/image automatically optimizes images
```

### **Database Optimization**
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_brands_org_id_created_at 
ON brands(org_id, created_at DESC);

-- Use partial indexes for filtered queries
CREATE INDEX idx_active_memberships 
ON organization_memberships(org_id, user_id) 
WHERE status = 'active';
```

### **Caching Strategy**
```typescript
// lib/cache.ts
import { unstable_cache } from 'next/cache'

export const getCachedBrands = unstable_cache(
  async (orgId: string) => {
    // Fetch brands
    return brands
  },
  ['brands'],
  { revalidate: 60 } // Cache for 1 minute
)
```

---

## 🚨 **Error Handling**

### **API Error Handling**
```typescript
// lib/api-error.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status }
    )
  }
  
  console.error('Unexpected error:', error)
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### **Client Error Handling**
```typescript
// hooks/useErrorHandler.ts
import { toast } from 'sonner'

export function useErrorHandler() {
  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      toast.error(error.message)
    } else {
      toast.error('An unexpected error occurred')
    }
    
    // Log to error tracking service
    console.error('Error:', error)
  }
  
  return { handleError }
}
```

---

## 📋 **Code Quality Standards**

### **ESLint Configuration**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-console': 'warn'
  }
}
```

### **Prettier Configuration**
```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 80
}
```

### **TypeScript Configuration**
```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 🎯 **Migration Checklist**

### **Phase 1: Frontend Migration**
- [ ] Create qa-alien-master repository
- [ ] Copy frontend code from original repo
- [ ] Remove AWS dependencies
- [ ] Setup Clerk authentication
- [ ] Add Supabase client
- [ ] Implement mock API responses
- [ ] Deploy to Vercel

### **Phase 2: Backend Migration**
- [ ] Setup Supabase project
- [ ] Create database schema
- [ ] Implement Edge Functions
- [ ] Setup RLS policies
- [ ] Connect to Bedrock
- [ ] Test API endpoints

### **Phase 3: Data Migration**
- [ ] Export data from DynamoDB
- [ ] Transform data format
- [ ] Import to Supabase
- [ ] Verify data integrity
- [ ] Update application queries

### **Phase 4: Production**
- [ ] DNS cutover
- [ ] Monitor performance
- [ ] Optimize queries
- [ ] Decommission AWS resources

---

This development framework provides a solid foundation for building QAlien on the modern stack while maintaining all the multi-organization functionality and business logic of the original system.