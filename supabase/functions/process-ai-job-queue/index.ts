import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { processCreativeAsset } from '../_shared/ai_pipeline.ts'

serve(async (req) => {
  try {
    console.log('AI Job Queue Processor started')
    
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Atomically claim next job only if no job currently processing (time-window guarded)
    console.log('Worker running. Attempting to dequeue a job...')
    
    const { data: job, error: selectError } = await supabaseAdmin
      .rpc('dequeue_next_job_if_idle')
      .maybeSingle()  // Use maybeSingle() to handle 0 or 1 rows

    if (selectError) {
      console.error('The RPC call itself failed:', JSON.stringify(selectError, null, 2))
      return new Response(
        JSON.stringify({ message: 'RPC error', error: selectError }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!job) {
      console.log('No job to process - queue is empty or a job is already processing')
      return new Response(
        JSON.stringify({ message: 'No jobs available' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    console.log(`Successfully dequeued job with id: ${job.id}, asset_id: ${job.asset_id}. Starting processing...`)

    try {
      // Run the original, heavy AI pipeline logic for this single asset
      await processCreativeAsset(job.asset_id)

      // If successful, mark the job as 'completed'
      await supabaseAdmin
        .from('ai_job_queue')
        .update({ 
          status: 'completed', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', job.id)

      console.log(`Successfully completed job ${job.id}`)

      return new Response(
        JSON.stringify({ message: 'Job processed successfully', jobId: job.id, assetId: job.asset_id }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      )
    } catch (pipelineError) {
      // If it fails, mark it as 'failed' and log the error
      console.error(`Pipeline error for job ${job.id}:`, pipelineError)

      await supabaseAdmin
        .from('ai_job_queue')
        .update({
          status: 'failed',
          error_message: pipelineError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id)

      throw pipelineError
    }
  } catch (error) {
    console.error('Error in process-ai-job-queue:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})