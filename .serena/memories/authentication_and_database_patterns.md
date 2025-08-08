# QAlien - Authentication and Database Patterns

## Authentication Flow
```
User → Clerk Authentication → JWT Token → Supabase RLS → Database Access
```

## Key Authentication Patterns

### 1. Clerk Integration
```typescript
import { useAuth } from '@clerk/nextjs';

// In components
const { user, isLoaded, isSignedIn } = useAuth();
```

### 2. Supabase Client Usage
```typescript
import { useSupabaseClient } from '@/lib/supabase';

// For authenticated requests
const supabase = useSupabaseClient();

// For unauthenticated requests (rare)
import { supabase } from '@/lib/supabase';
```

### 3. Database Access Pattern
```typescript
// Example: Fetch user's brands
const { data: brands, error } = await supabase
  .from('brands')
  .select('*')
  .eq('clerk_org_id', organizationId);
```

## Row Level Security (RLS)
- **Automatic Data Isolation**: RLS policies ensure users only see data in their organization
- **Organization-based Access**: All tables include `clerk_org_id` for organization isolation
- **JWT Integration**: Clerk JWT tokens contain organization information

## Database Schema Key Patterns
- **UUIDs**: All primary keys use UUID format
- **Timestamps**: `created_at` and `updated_at` fields are standard
- **Soft Deletes**: Use `status` field instead of hard deletes where applicable
- **Organization Isolation**: `clerk_org_id` field in all main tables

## Edge Functions Security
- **JWT Verification**: Most edge functions verify JWT tokens
- **CORS Support**: Configured for browser requests
- **Error Handling**: Structured error responses
- **Input Validation**: Validate all inputs before processing

## Common Database Tables
- **brands**: Brand information and configuration
- **campaigns**: Marketing campaigns
- **campaign_assets**: Creative assets linked to campaigns
- **team_invitations**: Organization invitation system

## Authentication Middleware
- **Next.js Middleware**: `src/middleware.ts` handles route protection
- **Protected Routes**: Brand and campaign routes require authentication
- **Public Routes**: Login, signup, and landing pages

## Error Handling Patterns
```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');
    
  if (error) throw error;
  
  // Handle success
} catch (error) {
  console.error('Database error:', error);
  // Handle error appropriately
}
```

## Best Practices
- **Always use useSupabaseClient()** for authenticated requests
- **Check user authentication state** before making database calls
- **Handle loading states** for better UX
- **Use TanStack Query** for efficient data fetching and caching
- **Implement optimistic updates** where appropriate