-- Add retry functionality for failed assets
-- This function creates a new job queue entry for failed assets

-- Function to retry a failed asset by creating a new job queue entry
CREATE OR REPLACE FUNCTION public.retry_failed_asset(asset_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asset_status TEXT;
  v_existing_job_id BIGINT;
  v_new_job_id BIGINT;
BEGIN
  -- Check if the asset exists and is actually failed
  SELECT status INTO v_asset_status
  FROM public.campaign_assets
  WHERE id = asset_uuid;
  
  IF v_asset_status IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asset not found'
    );
  END IF;
  
  IF v_asset_status != 'failed' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Asset is not in failed state',
      'current_status', v_asset_status
    );
  END IF;
  
  -- Check if there's already a pending or processing job for this asset
  SELECT id INTO v_existing_job_id
  FROM public.ai_job_queue
  WHERE asset_id = asset_uuid
  AND status IN ('pending', 'processing')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_existing_job_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Job already exists for this asset',
      'job_id', v_existing_job_id
    );
  END IF;
  
  -- Update asset status to pending
  UPDATE public.campaign_assets
  SET status = 'pending',
      updated_at = now()
  WHERE id = asset_uuid;
  
  -- Create a new job queue entry
  INSERT INTO public.ai_job_queue (asset_id, status, created_at)
  VALUES (asset_uuid, 'pending', now())
  RETURNING id INTO v_new_job_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'job_id', v_new_job_id,
    'message', 'Asset queued for retry'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Function to retry all failed assets for a campaign
CREATE OR REPLACE FUNCTION public.retry_all_failed_assets(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_asset RECORD;
  v_retry_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_results JSONB[] := '{}';
  v_retry_result JSONB;
BEGIN
  -- Loop through all failed assets in the campaign
  FOR v_asset IN 
    SELECT id, asset_name
    FROM public.campaign_assets
    WHERE campaign_id = p_campaign_id
    AND status = 'failed'
  LOOP
    -- Try to retry each asset
    v_retry_result := public.retry_failed_asset(v_asset.id);
    
    IF (v_retry_result->>'success')::boolean THEN
      v_retry_count := v_retry_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
    
    -- Store result for debugging
    v_results := array_append(v_results, jsonb_build_object(
      'asset_id', v_asset.id,
      'asset_name', v_asset.asset_name,
      'result', v_retry_result
    ));
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', v_retry_count > 0,
    'retried_count', v_retry_count,
    'error_count', v_error_count,
    'total_failed', v_retry_count + v_error_count,
    'details', v_results
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.retry_failed_asset(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_all_failed_assets(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.retry_failed_asset IS 'Retries processing for a failed asset by creating a new job queue entry';
COMMENT ON FUNCTION public.retry_all_failed_assets IS 'Retries all failed assets in a campaign';