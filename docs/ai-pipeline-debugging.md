# AI Pipeline Debugging Guide

## Overview
The AI pipeline processes creative assets sequentially to avoid rate limits. Here's how to debug issues at each stage.

## Processing Flow

1. **Asset Upload** → `campaign_assets` table (status='pending')
2. **Trigger Fires** → `ai_job_queue` entry created 
3. **Cron Job** → Runs every minute
4. **Job Processor** → Picks one job, processes it
5. **Completion** → Updates both job queue and asset status

## Key Tables to Monitor

### 1. Check Job Queue Status
```sql
-- View all jobs in the queue
SELECT 
  id,
  asset_id,
  status,
  error_message,
  created_at,
  updated_at
FROM ai_job_queue
ORDER BY created_at DESC
LIMIT 20;

-- Count jobs by status
SELECT status, COUNT(*) 
FROM ai_job_queue 
GROUP BY status;

-- View failed jobs with errors
SELECT * 
FROM ai_job_queue 
WHERE status = 'failed'
ORDER BY updated_at DESC;
```

### 2. Check Campaign Assets Status
```sql
-- View recent assets and their processing status
SELECT 
  id,
  asset_name,
  status,
  compliance_score,
  created_at
FROM campaign_assets
ORDER BY created_at DESC
LIMIT 20;

-- Find assets stuck in 'processing'
SELECT * 
FROM campaign_assets 
WHERE status = 'processing'
AND created_at < NOW() - INTERVAL '10 minutes';
```

### 3. Check Cron Job Status
```sql
-- View cron job schedule
SELECT * FROM cron.job WHERE jobname = 'process-ai-job-queue';

-- View recent cron job runs
SELECT * 
FROM cron.job_run_details 
WHERE jobname = 'process-ai-job-queue'
ORDER BY start_time DESC
LIMIT 10;
```

## Debugging Steps

### 1. Asset Not Processing?
1. Check if job exists in `ai_job_queue`
2. Check job status (pending/processing/failed)
3. Check cron job is running
4. Check edge function logs

### 2. Processing Stuck?
```sql
-- Find stuck processing jobs (>5 minutes old)
SELECT * FROM ai_job_queue 
WHERE status = 'processing' 
AND updated_at < NOW() - INTERVAL '5 minutes';

-- Reset stuck jobs back to pending
UPDATE ai_job_queue 
SET status = 'pending', updated_at = NOW()
WHERE status = 'processing' 
AND updated_at < NOW() - INTERVAL '5 minutes';
```

### 3. Check Edge Function Logs
- Go to Supabase Dashboard
- Navigate to Functions → process-ai-job-queue
- View Logs tab for execution details

### 4. Manual Job Processing
```sql
-- Manually trigger job processor
SELECT public.invoke_ai_job_processor();

-- Process specific asset manually
UPDATE ai_job_queue 
SET status = 'pending', updated_at = NOW()
WHERE asset_id = 'your-asset-id';
```

## Common Issues

### 1. Jobs Not Being Created
- Check trigger exists: `\df trigger_add_asset_to_job_queue`
- Verify asset has status='pending' and storage_path is not null

### 2. Cron Not Running
- Check pg_cron extension: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- View cron errors: `SELECT * FROM cron.job_run_details WHERE status = 'failed';`

### 3. Edge Function Errors
- Check environment variables are set
- Verify API keys (OpenAI, AssemblyAI, Bedrock)
- Check Supabase storage permissions

## Monitoring Queries

### Overall Pipeline Health
```sql
-- Pipeline summary dashboard
WITH job_stats AS (
  SELECT 
    status,
    COUNT(*) as count,
    MAX(updated_at) as last_update
  FROM ai_job_queue
  GROUP BY status
),
recent_assets AS (
  SELECT 
    COUNT(*) as total_assets,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
  FROM campaign_assets
  WHERE created_at > NOW() - INTERVAL '24 hours'
)
SELECT 
  js.*,
  ra.*
FROM job_stats js
CROSS JOIN recent_assets ra;
```

### Processing Rate
```sql
-- Jobs processed per hour
SELECT 
  DATE_TRUNC('hour', updated_at) as hour,
  COUNT(*) as jobs_processed
FROM ai_job_queue
WHERE status = 'completed'
AND updated_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

## Useful Commands

### Reset Everything
```sql
-- Clear job queue (use with caution!)
TRUNCATE ai_job_queue RESTART IDENTITY;

-- Reset all pending assets
UPDATE campaign_assets 
SET status = 'pending' 
WHERE status IN ('processing', 'failed');
```

### Pause/Resume Processing
```sql
-- Pause cron job
UPDATE cron.job 
SET active = false 
WHERE jobname = 'process-ai-job-queue';

-- Resume cron job
UPDATE cron.job 
SET active = true 
WHERE jobname = 'process-ai-job-queue';
```