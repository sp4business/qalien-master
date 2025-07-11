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
    const { campaignId, storagePath, assetName, mimeType } = await req.json()
    
    if (!campaignId || !storagePath || !assetName) {
      throw new Error('Missing required parameters: campaignId, storagePath, and assetName')
    }

    // Security check: Verify the campaign exists and user has access
    const token = authHeader.replace('Bearer ', '')
    
    // Decode the JWT to get user info (Clerk JWT)
    const payload = JSON.parse(atob(token.split('.')[1]))
    const orgId = payload.org_id || payload.user_metadata?.org_id
    
    if (!orgId) {
      throw new Error('No organization found in token')
    }

    // Check if the campaign belongs to the user's organization
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('campaigns')
      .select(`
        id,
        brands!inner(
          id,
          clerk_org_id
        )
      `)
      .eq('id', campaignId)
      .eq('brands.clerk_org_id', orgId)
      .single()

    if (campaignError || !campaign) {
      throw new Error('Campaign not found or access denied')
    }

    // Create the campaign asset record
    const { data: asset, error: assetError } = await supabaseClient
      .from('campaign_assets')
      .insert({
        campaign_id: campaignId,
        storage_path: storagePath,
        asset_name: assetName,
        mime_type: mimeType,
        status: 'pending'
      })
      .select()
      .single()

    if (assetError) {
      throw assetError
    }

    // Get the public URL for the asset
    const { data: publicUrlData } = supabaseClient
      .storage
      .from('campaign-assets')
      .getPublicUrl(storagePath)

    // Return the created asset with its public URL
    return new Response(
      JSON.stringify({
        asset: {
          ...asset,
          publicUrl: publicUrlData.publicUrl
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('Error in link-campaign-asset:', error)
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
