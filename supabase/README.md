# Supabase Documentation

## Migrations Overview

Run all migrations:

```bash
npx supabase db push --password Mochimoo12!
```

### Key migrations:

*   **02**: `brands` table with RLS
*   **04**: `brand-assets` storage bucket
*   **10**: `golden_set_creatives` table
*   **12**: Simplified RLS policies

## Storage Configuration

*   **bucket**: `brand-assets` (public)
*   **RLS policies use `anon` role**

## Important Notes

*   Always use migrations for schema changes.
*   Test RLS policies in the Supabase SQL editor before deploying.
*   Check storage permissions if uploads fail.
