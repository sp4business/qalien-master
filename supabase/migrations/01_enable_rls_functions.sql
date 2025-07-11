-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to get current user's Clerk ID from JWT
CREATE OR REPLACE FUNCTION public.clerk_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt()->>'sub',
    current_setting('request.jwt.claim.sub', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's organization ID from JWT
CREATE OR REPLACE FUNCTION public.clerk_org_id()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt()->'user_metadata'->>'org_id',
    current_setting('request.jwt.claim.user_metadata.org_id', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's organization role from JWT
CREATE OR REPLACE FUNCTION public.clerk_org_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt()->'user_metadata'->>'org_role',
    current_setting('request.jwt.claim.user_metadata.org_role', true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;