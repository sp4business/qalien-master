-- Fix the dequeue function to properly claim jobs
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
  v_job RECORD;
BEGIN
  -- First check if there's a job currently processing
  SELECT EXISTS (
    SELECT 1 
    FROM public.ai_job_queue
    WHERE status = 'processing'
      AND (updated_at IS NULL OR updated_at > now() - interval '30 minutes')
  ) INTO v_has_blocker;
  
  -- If there's a blocker, return empty
  IF v_has_blocker THEN
    RETURN;
  END IF;
  
  -- No blocker, so try to claim a pending job
  -- Use UPDATE with RETURNING to atomically claim the job
  RETURN QUERY
  UPDATE public.ai_job_queue
  SET 
    status = 'processing',
    updated_at = now()
  WHERE id = (
    SELECT id 
    FROM public.ai_job_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING 
    ai_job_queue.id,
    ai_job_queue.asset_id,
    ai_job_queue.status,
    ai_job_queue.error_message,
    ai_job_queue.created_at,
    ai_job_queue.updated_at;
END;
$$;

COMMENT ON FUNCTION public.dequeue_next_job_if_idle() IS 'Fixed version: Atomically claim next pending job only when no recent processing job exists.';