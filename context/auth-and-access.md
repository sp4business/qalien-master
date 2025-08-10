# Authentication & Access Control - Modern Stack
> **Status**: Migration to Clerk + Supabase RLS  
> **Last Updated**: 7 Jan 2025  
> **Stack**: Clerk Auth + Supabase Row Level Security

---

## 🚀 **Modern Authentication Architecture**

### **Stack Components**
- **Authentication**: Clerk (multi-tenant organizations)
- **Authorization**: Supabase Row Level Security (RLS)
- **Database**: Supabase Postgres
- **Frontend**: Next.js 15 + Clerk React components
- **Session Management**: Clerk JWT + Supabase Auth

### **Key Benefits**
- **Zero auth boilerplate** - Clerk handles all auth flows
- **Built-in multi-tenancy** - Native organization support
- **Automatic security** - RLS enforces data isolation
- **Real-time updates** - Supabase realtime with auth context

---

## 🏢 **Multi-Organization Model**

### **Hierarchy Structure**
```
User → Organization → Brand → Creative
     └─ Organization Role (admin/member)
                    └─ Brand Role (admin/editor/viewer)
```

### **Organization-First Security**
- **Complete data isolation** between organizations
- **Organization switching** via Clerk organizations
- **Automatic permission inheritance** from org to brand level
- **User-controlled integrations** (Slack, email)

---

## 🔐 **Clerk Integration**

### **Organization Setup**
```typescript
// clerk-config.ts
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: [/* your theme */],
        variables: {
          colorPrimary: '#37B34A'
        }
      }}
    >
      {children}
    </ClerkProvider>
  )
}
```

### **Organization Context**
```typescript
// useOrganization hook
import { useOrganization } from '@clerk/nextjs'

export function useQAlienOrganization() {
  const { organization, isLoaded } = useOrganization()
  
  return {
    currentOrg: organization,
    orgId: organization?.id,
    orgRole: organization?.membership?.role,
    isOrgAdmin: organization?.membership?.role === 'admin',
    isLoaded
  }
}
```

### **User Authentication**
```typescript
// useAuth hook
import { useAuth, useUser } from '@clerk/nextjs'

export function useQAlienAuth() {
  const { userId, isLoaded: authLoaded } = useAuth()
  const { user, isLoaded: userLoaded } = useUser()
  
  return {
    userId,
    user,
    isAuthenticated: !!userId,
    isLoaded: authLoaded && userLoaded
  }
}
```

---

## 🛡️ **Access Control Levels**

### **Organization Roles**
| Role | Permissions |
|------|-------------|
| **admin** | • Create/manage all brands<br>• Invite/remove org members<br>• Manage org settings<br>• Access all org data |
| **member** | • Access assigned brands only<br>• Cannot create brands<br>• Cannot manage org members |

### **Brand Roles**
| Role | Permissions |
|------|-------------|
| **admin** | • Full brand management<br>• Invite/remove team members<br>• Upload/analyze creatives<br>• Export data |
| **editor** | • Upload/analyze creatives<br>• Edit brand settings<br>• Cannot manage team |
| **viewer** | • View brand reports only<br>• Cannot upload or edit |

### **Permission Inheritance**
```typescript
// Permission checking utility
export function checkPermission(
  user: any,
  resource: 'organization' | 'brand' | 'creative',
  action: 'read' | 'write' | 'admin',
  resourceId?: string
) {
  // Organization admins have admin access to all resources
  if (user.orgRole === 'admin') {
    return true
  }
  
  // Brand-specific permissions
  if (resource === 'brand' && resourceId) {
    const brandMembership = user.brandMemberships?.[resourceId]
    if (!brandMembership) return false
    
    if (action === 'admin') return brandMembership.role === 'admin'
    if (action === 'write') return ['admin', 'editor'].includes(brandMembership.role)
    if (action === 'read') return ['admin', 'editor', 'viewer'].includes(brandMembership.role)
  }
  
  return false
}
```

---

## 🔒 **Row Level Security (RLS)**

### **User Authentication Function**
```sql
-- Function to get current user ID from Clerk
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM users 
    WHERE clerk_id = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Organization Access Policies**
```sql
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

-- Organization memberships: Users can see their own memberships
CREATE POLICY "org_membership_access" ON organization_memberships
  FOR ALL USING (
    user_id = auth.current_user_id()
    OR
    EXISTS (
      SELECT 1 FROM organization_memberships om2
      WHERE om2.org_id = organization_memberships.org_id
        AND om2.user_id = auth.current_user_id()
        AND om2.role = 'admin'
        AND om2.status = 'active'
    )
  );
```

### **Brand Access Policies**
```sql
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

-- Brand memberships: Users can see brands they have access to
CREATE POLICY "brand_membership_access" ON brand_memberships
  FOR ALL USING (
    user_id = auth.current_user_id()
    OR
    EXISTS (
      SELECT 1 FROM brand_memberships bm2
      WHERE bm2.brand_id = brand_memberships.brand_id
        AND bm2.user_id = auth.current_user_id()
        AND bm2.role = 'admin'
        AND bm2.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM organization_memberships om
      JOIN brands b ON om.org_id = b.org_id
      WHERE b.id = brand_memberships.brand_id
        AND om.user_id = auth.current_user_id()
        AND om.role = 'admin'
        AND om.status = 'active'
    )
  );
```

### **Creative Access Policies**
```sql
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

## 🔄 **Supabase Client Integration**

### **Authenticated Client**
```typescript
// supabase-client.ts
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'

export function useSupabaseClient() {
  const { getToken } = useAuth()
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getToken({ template: 'supabase' })
          
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: token ? `Bearer ${token}` : ''
            }
          })
        }
      }
    }
  )
  
  return supabase
}
```

### **JWT Template Configuration**
```typescript
// Clerk JWT template for Supabase
{
  "aud": "authenticated",
  "exp": {{date.unix_timestamp + 3600}},
  "iat": {{date.unix_timestamp}},
  "iss": "https://clerk.dev",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "app_metadata": {
    "provider": "clerk",
    "providers": ["clerk"]
  },
  "user_metadata": {
    "clerk_id": "{{user.id}}",
    "email": "{{user.primary_email_address.email_address}}",
    "name": "{{user.first_name}} {{user.last_name}}",
    "org_id": "{{org.id}}",
    "org_role": "{{org.role}}",
    "org_slug": "{{org.slug}}"
  }
}
```

---

## 🎛️ **Organization Management**

### **Organization Creation**
```typescript
// Create organization and sync to Supabase
export async function createOrganization(name: string, slug: string) {
  // Create in Clerk
  const clerkOrg = await clerk.organizations.create({
    name,
    slug
  })
  
  // Sync to Supabase
  const supabase = useSupabaseClient()
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      clerk_org_id: clerkOrg.id,
      name: clerkOrg.name,
      slug: clerkOrg.slug,
      created_by: auth.current_user_id()
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}
```

### **Organization Switching**
```typescript
// Switch organization context
export async function switchOrganization(orgId: string) {
  await clerk.organizations.setActive({ organization: orgId })
  
  // Update user's last active org
  const supabase = useSupabaseClient()
  await supabase
    .from('users')
    .update({ last_org_id: orgId })
    .eq('clerk_id', auth.uid())
}
```

### **Team Invitation System** (Current Implementation)
```typescript
// Edge Function: invite-team-members
export async function inviteTeamMembers(invitations: Array<{
  email: string;
  role: string;
  scope_type: 'organization' | 'brand';
  scope_id: string;
}>) {
  const results = []
  
  for (const invitation of invitations) {
    try {
      // Create Clerk organization invitation
      const clerkResponse = await fetch(
        `https://api.clerk.dev/v1/organizations/${invitation.scope_id}/invitations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email_address: invitation.email,
            role: invitation.role
          })
        }
      )
      
      if (clerkResponse.ok) {
        const clerkInvitation = await clerkResponse.json()
        
        // Track invitation in database
        const { error: dbError } = await supabase
          .from('team_invitations')
          .insert({
            email: invitation.email,
            role: invitation.role,
            scope_type: invitation.scope_type,
            scope_id: invitation.scope_id,
            invited_by: clerkUserId,
            clerk_invitation_id: clerkInvitation.id,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          })
        
        results.push({
          email: invitation.email,
          success: true,
          clerk_invitation_id: clerkInvitation.id
        })
      } else {
        results.push({
          email: invitation.email,
          success: false,
          error: 'Failed to send invitation'
        })
      }
    } catch (error) {
      results.push({
        email: invitation.email,
        success: false,
        error: error.message
      })
    }
  }
  
  return { results }
}
```

### **Invitation Flow**
1. **Admin initiates invitation** via UI
2. **Edge function processes batch** of invitations
3. **Clerk creates organization invitation** 
4. **Database tracks invitation status**
5. **Email sent to invitee** (via Clerk)
6. **User accepts invitation** through Clerk flow
7. **Automatic sync** to QAlien permissions

---

## 🔧 **Frontend Components**

### **Organization Switcher**
```typescript
// components/OrganizationSwitcher.tsx
import { OrganizationSwitcher } from '@clerk/nextjs'

export function QAlienOrgSwitcher() {
  return (
    <OrganizationSwitcher
      appearance={{
        elements: {
          organizationSwitcherTrigger: 'border rounded-md p-2'
        }
      }}
      afterSelectOrganizationUrl="/"
      afterCreateOrganizationUrl="/"
    />
  )
}
```

### **Route Protection**
```typescript
// components/ProtectedRoute.tsx
import { useAuth, useOrganization } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export function ProtectedRoute({ 
  children,
  requireOrg = false,
  requireOrgRole = null 
}: {
  children: React.ReactNode
  requireOrg?: boolean
  requireOrgRole?: 'admin' | 'member' | null
}) {
  const { isLoaded, userId } = useAuth()
  const { organization } = useOrganization()
  const router = useRouter()
  
  if (!isLoaded) return <div>Loading...</div>
  
  if (!userId) {
    router.push('/sign-in')
    return null
  }
  
  if (requireOrg && !organization) {
    router.push('/select-organization')
    return null
  }
  
  if (requireOrgRole && organization?.membership?.role !== requireOrgRole) {
    return <div>Insufficient permissions</div>
  }
  
  return <>{children}</>
}
```

### **Brand Access Control**
```typescript
// components/BrandAccessControl.tsx
export function BrandAccessControl({ 
  brandId,
  requiredRole = 'viewer',
  children 
}: {
  brandId: string
  requiredRole?: 'admin' | 'editor' | 'viewer'
  children: React.ReactNode
}) {
  const { data: membership } = useQuery({
    queryKey: ['brand-membership', brandId],
    queryFn: async () => {
      const supabase = useSupabaseClient()
      const { data } = await supabase
        .from('brand_memberships')
        .select('role')
        .eq('brand_id', brandId)
        .eq('user_id', auth.current_user_id())
        .single()
      
      return data
    }
  })
  
  const hasAccess = checkBrandAccess(membership?.role, requiredRole)
  
  if (!hasAccess) {
    return <div>You don't have access to this brand</div>
  }
  
  return <>{children}</>
}
```

---

## 📊 **Data Fetching Patterns**

### **Organization Data**
```typescript
// hooks/useOrganizations.ts
export function useOrganizations() {
  const supabase = useSupabaseClient()
  
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_memberships!inner(
            role,
            status,
            joined_at
          )
        `)
        .eq('organization_memberships.status', 'active')
        .order('organization_memberships.joined_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })
}
```

### **Brand Data**
```typescript
// hooks/useBrands.ts
export function useBrands(orgId?: string) {
  const supabase = useSupabaseClient()
  
  return useQuery({
    queryKey: ['brands', orgId],
    queryFn: async () => {
      let query = supabase
        .from('brands')
        .select(`
          *,
          brand_memberships(
            role,
            status
          )
        `)
      
      if (orgId) {
        query = query.eq('org_id', orgId)
      }
      
      const { data, error } = await query.order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
    enabled: !!orgId
  })
}
```

---

## 🔍 **Security Best Practices**

### **Input Validation**
```typescript
// utils/validation.ts
import { z } from 'zod'

export const createBrandSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  org_id: z.string().uuid(),
  industry: z.string().optional()
})

export function validateBrandCreation(data: unknown) {
  return createBrandSchema.parse(data)
}
```

### **XSS Prevention**
```typescript
// utils/sanitize.ts
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeHtml(html: string) {
  return DOMPurify.sanitize(html)
}

export function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
```

### **Rate Limiting**
```typescript
// middleware/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true
})

export async function checkRateLimit(identifier: string) {
  const { success } = await ratelimit.limit(identifier)
  return success
}
```

---

## 🎯 **Migration Strategy**

### **Phase 1: Clerk Setup**
1. Install Clerk in Next.js application
2. Configure organization support
3. Create JWT template for Supabase
4. Setup organization switching

### **Phase 2: Supabase Integration**
1. Create user sync webhook
2. Implement RLS policies
3. Setup authenticated client
4. Test data isolation

### **Phase 3: Permission Migration**
1. Migrate existing permissions
2. Create brand memberships
3. Test access control
4. Deploy incrementally

---

This authentication architecture provides enterprise-grade security with zero auth boilerplate, complete data isolation, and seamless user experience while maintaining all the multi-organization functionality required by QAlien.