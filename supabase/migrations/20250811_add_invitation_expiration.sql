-- Add expiration support to team_invitations table
ALTER TABLE team_invitations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

-- Update existing pending invitations to have expiration date
UPDATE team_invitations 
SET expires_at = created_at + INTERVAL '7 days'
WHERE status = 'pending' AND expires_at IS NULL;

-- Drop the old unique constraint
DROP INDEX IF EXISTS idx_team_invitations_unique_pending;

-- Create a new unique constraint that allows re-invitations after expiration/rejection
CREATE UNIQUE INDEX idx_team_invitations_unique_active 
ON team_invitations(clerk_org_id, email) 
WHERE status IN ('pending');

-- Function to safely handle team invitations (insert or update)
CREATE OR REPLACE FUNCTION handle_team_invitation(
  p_org_id TEXT,
  p_email TEXT,
  p_role TEXT,
  p_invited_by TEXT,
  p_invitation_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_existing_record team_invitations%ROWTYPE;
  v_result JSON;
BEGIN
  -- Check for existing invitation
  SELECT * INTO v_existing_record
  FROM team_invitations
  WHERE clerk_org_id = p_org_id 
    AND email = p_email
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_record.id IS NOT NULL THEN
    -- If invitation exists and is expired or rejected, update it
    IF v_existing_record.status IN ('expired', 'rejected') THEN
      UPDATE team_invitations
      SET 
        status = 'pending',
        role = p_role,
        invited_by_clerk_id = p_invited_by,
        clerk_invitation_id = p_invitation_id,
        expires_at = NOW() + INTERVAL '7 days',
        updated_at = NOW()
      WHERE id = v_existing_record.id
      RETURNING json_build_object(
        'action', 're-invited',
        'invitation_id', id,
        'previous_status', v_existing_record.status
      ) INTO v_result;
    ELSIF v_existing_record.status = 'pending' THEN
      -- If still pending, return error
      v_result := json_build_object(
        'error', true,
        'message', 'Invitation already pending for this email',
        'expires_at', v_existing_record.expires_at
      );
    ELSE
      -- If accepted, user is already a member
      v_result := json_build_object(
        'error', true,
        'message', 'User is already a member of this organization'
      );
    END IF;
  ELSE
    -- No existing invitation, create new one
    INSERT INTO team_invitations (
      clerk_org_id, 
      email, 
      role, 
      invited_by_clerk_id, 
      clerk_invitation_id, 
      status,
      expires_at
    ) VALUES (
      p_org_id,
      p_email,
      p_role,
      p_invited_by,
      p_invitation_id,
      'pending',
      NOW() + INTERVAL '7 days'
    )
    RETURNING json_build_object(
      'action', 'created',
      'invitation_id', id
    ) INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to mark expired invitations
CREATE OR REPLACE FUNCTION mark_expired_invitations() RETURNS void AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run daily (using pg_cron if available)
-- Note: pg_cron needs to be enabled separately in Supabase dashboard
-- Alternatively, this can be called from a scheduled Edge Function
-- SELECT cron.schedule('expire-invitations', '0 0 * * *', 'SELECT mark_expired_invitations();');

-- Create function to get pending invitations with expiration info
CREATE OR REPLACE FUNCTION get_pending_invitations(p_org_id TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  invited_by_clerk_id TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_expiring_soon BOOLEAN,
  hours_until_expiration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id,
    ti.email,
    ti.role,
    ti.invited_by_clerk_id,
    ti.created_at,
    ti.expires_at,
    (ti.expires_at - NOW() < INTERVAL '24 hours') as is_expiring_soon,
    EXTRACT(EPOCH FROM (ti.expires_at - NOW())) / 3600 as hours_until_expiration
  FROM team_invitations ti
  WHERE ti.clerk_org_id = p_org_id
    AND ti.status = 'pending'
  ORDER BY ti.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policy for the new function
GRANT EXECUTE ON FUNCTION get_pending_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION handle_team_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION mark_expired_invitations TO service_role;