import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header provided')
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { assetId } = await req.json()
    
    if (!assetId) {
      throw new Error('Missing required parameter: assetId')
    }

    // Get the user's organization from the JWT
    const token = authHeader.replace('Bearer ', '')
    const payload = JSON.parse(atob(token.split('.')[1]))
    const orgId = payload.org_id || payload.user_metadata?.org_id
    
    if (!orgId) {
      throw new Error('No organization found in token')
    }

    // First, fetch the asset to verify ownership and get storage path
    const { data: asset, error: assetError } = await supabaseClient
      .from('campaign_assets')
      .select(`
        id,
        storage_path,
        campaign_id,
        campaigns!inner(
          id,
          brands!inner(
            id,
            clerk_org_id
          )
        )
      `)
      .eq('id', assetId)
      .eq('campaigns.brands.clerk_org_id', orgId)
      .single()

    if (assetError || !asset) {
      throw new Error('Asset not found or access denied')
    }

    // Delete from storage first
    if (asset.storage_path) {
      const { error: storageError } = await supabaseClient
        .storage
        .from('campaign-assets')
        .remove([asset.storage_path])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
        // Continue with database deletion even if storage fails
      }
    }

    // Delete related data (placeholder for future AI analysis data)
    // In the future, this would delete:
    // - AI analysis results
    // - Embeddings from vector database
    // - Performance metrics
    // - Export history
    
    // For now, just log what would be deleted
    console.log('Would delete related data for asset:', assetId)

    // Delete the asset record from database
    const { error: deleteError } = await supabaseClient
      .from('campaign_assets')
      .delete()
      .eq('id', assetId)

    if (deleteError) {
      throw deleteError
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Asset deleted successfully',
        deletedAssetId: assetId
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in delete-campaign-asset:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error'
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
