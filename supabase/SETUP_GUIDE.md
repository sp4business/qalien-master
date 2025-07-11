# Supabase + Clerk Setup Guide

## 1. Configure Clerk JWT Template

In your Clerk Dashboard:

1. Go to **JWT Templates**
2. Click **New Template**
3. Name it: `supabase`
4. Set the template:

```json
{
  "aud": "authenticated",
  "exp": "{{time.unix + 3600}}",
  "iat": "{{time.unix}}",
  "iss": "https://clerk.dev",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address.email_address}}",
  "user_metadata": {
    "clerk_id": "{{user.id}}",
    "email": "{{user.primary_email_address.email_address}}",
    "name": "{{user.first_name}} {{user.last_name}}",
    "org_id": "{{org.id}}",
    "org_role": "{{org.role}}",
    "org_slug": "{{org.slug}}",
    "org_name": "{{org.name}}"
  }
}
```

## 2. Configure Supabase

In your Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Enable **JWT** provider
3. Set JWT Secret to your Clerk JWT signing key (found in Clerk Dashboard → API Keys)

## 3. Run Migrations

In Supabase SQL Editor, run the migrations in order:
1. `01_enable_rls_functions.sql`
2. `02_create_brands_table.sql`

## 4. Test the Integration

The RLS policies will automatically:
- Only show brands from the user's current organization
- Only allow org admins to create/edit/delete brands
- Use Clerk's organization roles for authorization

## Architecture Benefits

- **No data duplication**: User/org data stays in Clerk
- **Single source of truth**: Clerk manages all auth/org data
- **Clean foreign keys**: We only reference Clerk IDs
- **Automatic RLS**: Policies use JWT claims from Clerk
- **Real-time org switching**: When user switches org in Clerk, they see different brands