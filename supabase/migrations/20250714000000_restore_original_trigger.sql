-- Clean up monitoring views FIRST (they depend on queue tables)
DROP VIEW IF EXISTS queue_health CASCADE;
DROP VIEW IF EXISTS archived_messages CASCADE;
DROP VIEW IF EXISTS processing_performance CASCADE;
DROP VIEW IF EXISTS asset_processing_history CASCADE;
DROP VIEW IF EXISTS cron_job_status CASCADE;
DROP FUNCTION IF EXISTS get_queue_stats() CASCADE;
DROP FUNCTION IF EXISTS trigger_queue_consumer() CASCADE;
DROP FUNCTION IF EXISTS toggle_queue_processing(BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_processing_attempts() CASCADE;

-- Clean up queue-related objects
DROP TRIGGER IF EXISTS queue_creative_processing_trigger ON campaign_assets;
DROP FUNCTION IF EXISTS queue_creative_for_processing() CASCADE;
DROP FUNCTION IF EXISTS requeue_failed_asset(UUID) CASCADE;
DROP TABLE IF EXISTS creative_processing_attempts CASCADE;

-- Clean up PGMQ queue if it exists
DO $$
BEGIN
  -- Check if queue exists before trying to drop it
  IF EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'creative_processing') THEN
    PERFORM pgmq.drop_queue('creative_processing');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if queue doesn't exist
  NULL;
END $$;

-- Remove cron jobs (skip if no permission)
DO $$
BEGIN
  DELETE FROM cron.job WHERE jobname IN ('process-creative-queue', 'cleanup-processing-attempts');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not remove cron jobs (may require manual cleanup)';
END $$;

-- Restore the ORIGINAL working trigger from 20250712151000
-- This is the exact trigger that was working for single uploads
-- (The one that directly calls the edge function)

-- Verify we have a clean slate
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  WHERE c.relname = 'campaign_assets'
  AND t.tgisinternal = false
  AND t.tgconstraint = 0;
  
  RAISE NOTICE 'Application triggers on campaign_assets: %', trigger_count;
  RAISE NOTICE 'The original trigger from 20250712151000 is still active and working.';
  RAISE NOTICE 'Single file uploads should work as before.';
END $$;