-- Create RPC function to safely get and lock the next pending job
CREATE OR REPLACE FUNCTION public.get_next_pending_job()
RETURNS TABLE (
  id BIGINT,
  asset_id UUID,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use FOR UPDATE SKIP LOCKED to safely select and lock a single job
  -- This ensures no two workers can grab the same job
  RETURN QUERY
  SELECT 
    q.id,
    q.asset_id,
    q.status,
    q.error_message,
    q.created_at,
    q.updated_at
  FROM public.ai_job_queue q
  WHERE q.status = 'pending'
  ORDER BY q.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.get_next_pending_job() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_next_pending_job() IS 
'Safely selects and locks the next pending job from the queue. Uses FOR UPDATE SKIP LOCKED to prevent race conditions.';