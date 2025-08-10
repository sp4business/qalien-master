-- Fix duplicate job processing and ensure proper retry handling
-- This migration addresses the issue where multiple jobs can be created for the same asset

-- Step 1: Clean up existing duplicate jobs (keep only the latest one per asset)
WITH latest_jobs AS (
  SELECT DISTINCT ON (asset_id) 
    id,
    asset_id,
    status,
    created_at
  FROM public.ai_job_queue
  ORDER BY asset_id, created_at DESC
)
DELETE FROM public.ai_job_queue
WHERE id NOT IN (SELECT id FROM latest_jobs);

-- Step 2: Add a unique partial index to prevent multiple pending/processing jobs per asset
-- This allows completed and failed jobs to have duplicates (for history), but prevents active duplicates
CREATE UNIQUE INDEX idx_unique_active_job_per_asset 
ON public.ai_job_queue (asset_id) 
WHERE status IN ('pending', 'processing');

-- Step 3: Replace the trigger function with deduplication logic
CREATE OR REPLACE FUNCTION add_asset_to_job_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_job_id BIGINT;
  existing_status TEXT;
BEGIN
  -- Only process when status changes to 'pending' and we have a storage_path
  IF NEW.status = 'pending' AND NEW.storage_path IS NOT NULL THEN
    
    -- Check if there's already an active job for this asset
    SELECT id, status INTO existing_job_id, existing_status
    FROM public.ai_job_queue
    WHERE asset_id = NEW.id
      AND status IN ('pending', 'processing')
    LIMIT 1;
    
    IF existing_job_id IS NOT NULL THEN
      -- Job already exists, log and skip
      RAISE NOTICE 'Asset % already has an active job (id: %, status: %), skipping duplicate creation', 
        NEW.id, existing_job_id, existing_status;
      RETURN NEW;
    END IF;
    
    -- Check if there's a recent failed job that we should retry
    SELECT id INTO existing_job_id
    FROM public.ai_job_queue
    WHERE asset_id = NEW.id
      AND status = 'failed'
      AND created_at > now() - interval '5 minutes'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF existing_job_id IS NOT NULL THEN
      -- Reset the failed job to pending for retry
      UPDATE public.ai_job_queue
      SET status = 'pending',
          error_message = NULL,
          updated_at = now()
      WHERE id = existing_job_id;
      
      RAISE NOTICE 'Reset failed job % for asset % to pending for retry', existing_job_id, NEW.id;
    ELSE
      -- No existing job, create a new one
      INSERT INTO public.ai_job_queue (asset_id, status, created_at)
      VALUES (NEW.id, 'pending', now())
      ON CONFLICT DO NOTHING; -- Extra safety against race conditions
      
      RAISE NOTICE 'Added new job for asset % to AI job queue', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create a function to manually retry failed jobs
CREATE OR REPLACE FUNCTION public.retry_failed_job(p_asset_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job_id BIGINT;
  v_campaign_asset_status TEXT;
BEGIN
  -- Find the most recent failed job for this asset
  SELECT id INTO v_job_id
  FROM public.ai_job_queue
  WHERE asset_id = p_asset_id
    AND status = 'failed'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_job_id IS NULL THEN
    RAISE NOTICE 'No failed job found for asset %', p_asset_id;
    RETURN FALSE;
  END IF;
  
  -- Check if there's already an active job
  IF EXISTS (
    SELECT 1 FROM public.ai_job_queue
    WHERE asset_id = p_asset_id
      AND status IN ('pending', 'processing')
  ) THEN
    RAISE NOTICE 'Asset % already has an active job, cannot retry', p_asset_id;
    RETURN FALSE;
  END IF;
  
  -- Reset the job to pending
  UPDATE public.ai_job_queue
  SET status = 'pending',
      error_message = NULL,
      updated_at = now()
  WHERE id = v_job_id;
  
  -- Also reset the campaign_asset status to trigger reprocessing
  UPDATE public.campaign_assets
  SET status = 'processing',
      updated_at = now()
  WHERE id = p_asset_id;
  
  RAISE NOTICE 'Successfully queued retry for asset %', p_asset_id;
  RETURN TRUE;
END;
$$;

-- Step 5: Create a function to get the latest job status for an asset
CREATE OR REPLACE FUNCTION public.get_latest_job_for_asset(p_asset_id UUID)
RETURNS TABLE (
  id BIGINT,
  asset_id UUID,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.asset_id,
    q.status,
    q.error_message,
    q.created_at,
    q.updated_at
  FROM public.ai_job_queue q
  WHERE q.asset_id = p_asset_id
  ORDER BY q.created_at DESC
  LIMIT 1;
END;
$$;

-- Step 6: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.retry_failed_job(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_job_for_asset(UUID) TO authenticated, service_role;

-- Step 7: Add helpful comments
COMMENT ON INDEX idx_unique_active_job_per_asset IS 
'Prevents multiple pending or processing jobs for the same asset, allowing only one active job at a time';

COMMENT ON FUNCTION public.retry_failed_job(UUID) IS 
'Manually retry a failed job for a specific asset. Returns true if retry was queued, false otherwise.';

COMMENT ON FUNCTION public.get_latest_job_for_asset(UUID) IS 
'Get the most recent job (regardless of status) for a specific asset.';

-- Step 8: Create a view for monitoring job queue health
CREATE OR REPLACE VIEW public.job_queue_stats AS
SELECT 
  status,
  COUNT(*) as job_count,
  MIN(created_at) as oldest_job,
  MAX(created_at) as newest_job,
  AVG(EXTRACT(EPOCH FROM (now() - created_at))/60)::INT as avg_age_minutes
FROM public.ai_job_queue
GROUP BY status;

GRANT SELECT ON public.job_queue_stats TO authenticated, service_role;

COMMENT ON VIEW public.job_queue_stats IS 
'Real-time statistics about the job queue, useful for monitoring and debugging.';

-- Log success
DO $$
BEGIN
  RAISE NOTICE 'Successfully applied duplicate job processing fix:';
  RAISE NOTICE '  - Cleaned up duplicate jobs';
  RAISE NOTICE '  - Added unique constraint for active jobs';
  RAISE NOTICE '  - Updated trigger with deduplication logic';
  RAISE NOTICE '  - Added retry and monitoring functions';
END;
$$;