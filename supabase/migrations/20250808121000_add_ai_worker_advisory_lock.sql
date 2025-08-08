-- Add advisory lock functions to ensure only one AI worker runs at a time
-- This prevents overlapping Bedrock invocations that can cause 429 throttling

-- Acquire lock: returns true if acquired, false if another worker holds it
CREATE OR REPLACE FUNCTION public.acquire_ai_worker_lock()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_try_advisory_lock(987654321012345678);
$$;

-- Release lock: best-effort unlock (safe to call if not held)
CREATE OR REPLACE FUNCTION public.release_ai_worker_lock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_advisory_unlock(987654321012345678);
END;
$$;

GRANT EXECUTE ON FUNCTION public.acquire_ai_worker_lock() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ai_worker_lock() TO service_role;

COMMENT ON FUNCTION public.acquire_ai_worker_lock() IS 'Acquire single-worker advisory lock for AI job processor';
COMMENT ON FUNCTION public.release_ai_worker_lock() IS 'Release single-worker advisory lock for AI job processor';
