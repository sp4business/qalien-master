-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a wrapper function that calls the edge function
CREATE OR REPLACE FUNCTION public.invoke_ai_job_processor()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id BIGINT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get the Supabase URL
  supabase_url := 'https://oqpblqjtmmsnofyucaem.supabase.co';
  
  -- Get service role key from vault (you should store this securely)
  -- For now, we'll use the anon key which should work for internal calls
  service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcGJscWp0bW1zbm9meXVjYWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMzcwNTMsImV4cCI6MjA2NzgxMzA1M30.Q0pCvSCXi36EQaYKY8Tuo_qEbSgBDhUFs2r3Yk1sHnY';
  
  -- Make async HTTP request to the Edge Function
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-ai-job-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object(
      'trigger', 'scheduled',
      'timestamp', now()
    )
  ) INTO request_id;
  
  -- Log the invocation
  RAISE NOTICE 'Invoked AI job processor: request_id %', request_id;
END;
$$;

-- Schedule the function to run every minute
SELECT cron.schedule(
  'process-ai-job-queue', -- job name
  '* * * * *', -- every minute
  'SELECT public.invoke_ai_job_processor();'
);

-- Verify the cron job was created
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'process-ai-job-queue'
  ) INTO job_exists;
  
  IF job_exists THEN
    RAISE NOTICE 'SUCCESS: Cron job "process-ai-job-queue" has been scheduled to run every minute';
  ELSE
    RAISE EXCEPTION 'FAILED: Cron job was not created';
  END IF;
END;
$$;