-- Atomically dequeue next job only if no other job is currently processing
-- Prevents overlapping Bedrock calls without session-bound advisory locks

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
BEGIN
  RETURN QUERY
  WITH blocker AS (
    SELECT 1
    FROM public.ai_job_queue
    WHERE status = 'processing'
      AND (updated_at IS NULL OR updated_at > now() - interval '30 minutes')
    LIMIT 1
  ), next_job AS (
    SELECT q.id, q.asset_id
    FROM public.ai_job_queue q
    WHERE q.status = 'pending'
    ORDER BY q.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.ai_job_queue q
  SET status = 'processing', updated_at = now()
  FROM next_job nj
  WHERE q.id = nj.id
    AND NOT EXISTS (SELECT 1 FROM blocker)
  RETURNING q.id, q.asset_id, q.status, q.error_message, q.created_at, q.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dequeue_next_job_if_idle() TO service_role;

COMMENT ON FUNCTION public.dequeue_next_job_if_idle() IS 'Atomically claim next pending job only when no recent processing job exists.';