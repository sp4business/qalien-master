-- Remove retry functions since we're sending failed assets to the void
DROP FUNCTION IF EXISTS public.retry_failed_asset(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.retry_all_failed_assets(UUID) CASCADE;

-- Create a trigger to automatically delete failed assets
CREATE OR REPLACE FUNCTION public.auto_delete_failed_assets()
RETURNS TRIGGER AS $$
BEGIN
  -- If the status changed to 'failed', delete the asset
  IF NEW.status = 'failed' AND (OLD.status IS NULL OR OLD.status != 'failed') THEN
    -- Log the deletion for debugging (optional)
    RAISE NOTICE 'Auto-deleting failed asset: %', NEW.id;
    
    -- Delete the asset (this will cascade to ai_job_queue due to ON DELETE CASCADE)
    DELETE FROM public.campaign_assets WHERE id = NEW.id;
    
    -- Return NULL to prevent the update from completing (since we're deleting)
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on campaign_assets table
CREATE TRIGGER auto_delete_failed_assets_trigger
  AFTER UPDATE OF status ON public.campaign_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_delete_failed_assets();

-- Also clean up any existing failed assets
DELETE FROM public.campaign_assets WHERE status = 'failed';

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_delete_failed_assets IS 'Automatically deletes assets when they fail processing';
COMMENT ON TRIGGER auto_delete_failed_assets_trigger ON public.campaign_assets IS 'Trigger to auto-delete failed assets';