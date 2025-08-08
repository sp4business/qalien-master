-- Restore the original campaign asset processing trigger
-- This trigger calls the process-new-creative edge function when a new asset is uploaded

-- First, ensure pg_net extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION trigger_process_new_creative()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_role_key TEXT;
  supabase_url TEXT;
  request_id BIGINT;
BEGIN
  -- Get the Supabase URL
  supabase_url := 'https://oqpblqjtmmsnofyucaem.supabase.co';
  
  -- Only process when status changes to 'pending' and we have a storage_path
  IF NEW.status = 'pending' AND NEW.storage_path IS NOT NULL THEN
    -- Make async HTTP request to Edge Function using pg_net
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/process-new-creative',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcGJscWp0bW1zbm9meXVjYWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcwNTMsImV4cCI6MjA2NzgxMzA1M30.Q0pCvSCXi36EQaYKY8Tuo_qEbSgBDhUFs2r3Yk1sHnY'
      ),
      body := jsonb_build_object(
        'assetId', NEW.id::text,
        'storagePath', NEW.storage_path,
        'campaignId', NEW.campaign_id::text,
        'mimeType', NEW.mime_type,
        'assetName', NEW.asset_name
      )
    ) INTO request_id;
    
    -- Log the request for debugging
    RAISE NOTICE 'Triggered process-new-creative for asset %: request_id %', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop any existing trigger first (in case it exists but isn't showing)
DROP TRIGGER IF EXISTS trigger_campaign_asset_processing ON public.campaign_assets;

-- Create the trigger
CREATE TRIGGER trigger_campaign_asset_processing
  AFTER INSERT OR UPDATE OF status
  ON public.campaign_assets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_new_creative();

-- Add comment for documentation
COMMENT ON TRIGGER trigger_campaign_asset_processing ON public.campaign_assets 
IS 'Triggers AI processing pipeline when a new asset is uploaded (status = pending)';

-- Verify the trigger was created
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'campaign_assets'
    AND t.tgname = 'trigger_campaign_asset_processing'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE 'SUCCESS: Trigger trigger_campaign_asset_processing created on campaign_assets table';
  ELSE
    RAISE EXCEPTION 'FAILED: Trigger was not created';
  END IF;
END $$;