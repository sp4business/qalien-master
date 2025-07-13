-- Create team_invitations table to track invitations sent through Clerk
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_org_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  invited_by_clerk_id TEXT NOT NULL,
  clerk_invitation_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  accepted_at TIMESTAMPTZ,
  accepted_by_clerk_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_team_invitations_clerk_org_id ON team_invitations(clerk_org_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE UNIQUE INDEX idx_team_invitations_unique_pending ON team_invitations(clerk_org_id, email) 
  WHERE status = 'pending';

-- Enable RLS
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Members of an organization can view invitations for their organization
CREATE POLICY "Organization members can view invitations" ON team_invitations
  FOR SELECT
  USING (
    auth.jwt() ->> 'clerk_org_id' = clerk_org_id
  );

-- Only organization admins can insert invitations
CREATE POLICY "Organization admins can create invitations" ON team_invitations
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'clerk_org_id' = clerk_org_id
    AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'org:admin' 
         OR auth.jwt() -> 'user_metadata' ->> 'role' = 'org:admin')
  );

-- Only organization admins can update invitations
CREATE POLICY "Organization admins can update invitations" ON team_invitations
  FOR UPDATE
  USING (
    auth.jwt() ->> 'clerk_org_id' = clerk_org_id
    AND (auth.jwt() -> 'app_metadata' ->> 'role' = 'org:admin' 
         OR auth.jwt() -> 'user_metadata' ->> 'role' = 'org:admin')
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();