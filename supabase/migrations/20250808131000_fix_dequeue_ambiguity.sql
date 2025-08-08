-- Fix ambiguity in dequeue function
CREATE OR REPLACE FUNCTION public.dequeue_next_job_if_idle()
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
DECLARE
  v_has_blocker BOOLEAN;
BEGIN
  -- First check if there's a job currently processing
  SELECT EXISTS (
    SELECT 1 
    FROM public.ai_job_queue q
    WHERE q.status = 'processing'
      AND (q.updated_at IS NULL OR q.updated_at > now() - interval '30 minutes')
  ) INTO v_has_blocker;
  
  -- If there's a blocker, return empty
  IF v_has_blocker THEN
    RETURN;
  END IF;
  
  -- No blocker, so try to claim a pending job
  -- Use UPDATE with RETURNING to atomically claim the job
  RETURN QUERY
  UPDATE public.ai_job_queue q
  SET 
    status = 'processing',
    updated_at = now()
  WHERE q.id = (
    SELECT q2.id 
    FROM public.ai_job_queue q2
    WHERE q2.status = 'pending'
    ORDER BY q2.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING 
    q.id,
    q.asset_id,
    q.status,
    q.error_message,
    q.created_at,
    q.updated_at;
END;
$$;

COMMENT ON FUNCTION public.dequeue_next_job_if_idle() IS 'Fixed ambiguity: Atomically claim next pending job only when no recent processing job exists.';