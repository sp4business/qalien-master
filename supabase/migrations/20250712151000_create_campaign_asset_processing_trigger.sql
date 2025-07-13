-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to trigger the process-new-creative Edge Function
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
  -- Get the service role key from vault (you'll need to store this in vault first)
  -- For production, store your service_role_key in Supabase Vault
  -- SELECT decrypted_secret INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';
  
  -- Get the Supabase URL
  -- Using the actual project URL from your environment
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
    
    -- Log the request for debugging (optional)
    RAISE NOTICE 'Triggered process-new-creative for asset %: request_id %', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires after insert or update on campaign_assets
CREATE TRIGGER trigger_campaign_asset_processing
  AFTER INSERT OR UPDATE OF status
  ON public.campaign_assets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_process_new_creative();

-- Add comment for documentation
COMMENT ON TRIGGER trigger_campaign_asset_processing ON public.campaign_assets 
IS 'Triggers AI processing pipeline when a new asset is uploaded (status = pending)';

-- Create a function to store Supabase configuration (run this once after deployment)
-- You'll need to replace these with your actual values
/*
DO $$
BEGIN
  -- Store your Supabase project configuration
  -- Replace 'your-project-ref' with your actual project reference
  -- Replace 'your-anon-key' with your actual anon key
  PERFORM set_config('app.settings.supabase_project_ref', 'your-project-ref', false);
  PERFORM set_config('app.settings.supabase_anon_key', 'your-anon-key', false);
END $$;
*/