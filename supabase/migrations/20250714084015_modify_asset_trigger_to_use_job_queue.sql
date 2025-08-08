-- Phase 2: Modify the trigger to add jobs to queue instead of direct edge function calls

-- First, drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_campaign_asset_processing ON public.campaign_assets;
DROP FUNCTION IF EXISTS trigger_process_new_creative();

-- Create new function that adds jobs to the queue
CREATE OR REPLACE FUNCTION add_asset_to_job_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only add to queue when status changes to 'pending' and we have a storage_path
  IF NEW.status = 'pending' AND NEW.storage_path IS NOT NULL THEN
    -- Insert a new job into the queue
    INSERT INTO public.ai_job_queue (asset_id, status, created_at)
    VALUES (NEW.id, 'pending', now());
    
    -- Log for debugging
    RAISE NOTICE 'Added asset % to AI job queue', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the new trigger that uses the job queue
CREATE TRIGGER trigger_add_asset_to_job_queue
  AFTER INSERT OR UPDATE OF status
  ON public.campaign_assets
  FOR EACH ROW
  EXECUTE FUNCTION add_asset_to_job_queue();

-- Add comment for documentation
COMMENT ON TRIGGER trigger_add_asset_to_job_queue ON public.campaign_assets 
IS 'Adds new assets to the AI job queue for sequential processing when status = pending';

-- Verify the new trigger was created
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'campaign_assets'
    AND t.tgname = 'trigger_add_asset_to_job_queue'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE 'SUCCESS: Trigger trigger_add_asset_to_job_queue created on campaign_assets table';
  ELSE
    RAISE EXCEPTION 'FAILED: Trigger trigger_add_asset_to_job_queue was not created';
  END IF;
END;
$$;