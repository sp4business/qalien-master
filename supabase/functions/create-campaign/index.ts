import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface CampaignData {
  name: string
  campaign_type?: string
  description?: string
  start_date?: string
  end_date?: string
  budget?: number
  currency?: string
  country?: string
}

interface RequestBody {
  brandId: string
  campaignData: CampaignData
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { brandId, campaignData }: RequestBody = await req.json()

    // Validate required fields
    if (!brandId) {
      return new Response(
        JSON.stringify({ error: 'brandId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!campaignData.name || campaignData.name.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Campaign name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate budget if provided
    if (campaignData.budget !== undefined && campaignData.budget !== null) {
      if (typeof campaignData.budget !== 'number' || campaignData.budget < 0) {
        return new Response(
          JSON.stringify({ error: 'Budget must be a positive number' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Create Supabase client with the user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user has access to the brand
    const { data: brand, error: brandError } = await supabaseClient
      .from('brands')
      .select('id, name, clerk_org_id')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return new Response(
        JSON.stringify({ error: 'Brand not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert the campaign
    const { data: campaign, error: insertError } = await supabaseClient
      .from('campaigns')
      .insert({
        brand_id: brandId,
        name: campaignData.name.trim(),
        campaign_type: campaignData.campaign_type,
        description: campaignData.description,
        start_date: campaignData.start_date,
        end_date: campaignData.end_date,
        budget: campaignData.budget,
        currency: campaignData.currency || 'USD',
        country: campaignData.country,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting campaign:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to create campaign' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send event to PostHog
    try {
      const posthogKey = Deno.env.get('POSTHOG_API_KEY')
      const posthogHost = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com'
      
      if (posthogKey) {
        // Get user info from JWT
        const jwt = authHeader.replace('Bearer ', '')
        const payload = JSON.parse(atob(jwt.split('.')[1]))
        
        await fetch(`${posthogHost}/capture/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: posthogKey,
            event: 'campaign_created',
            properties: {
              distinct_id: payload.sub || payload.clerk_id,
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              brand_id: brandId,
              brand_name: brand.name,
              organization_id: brand.clerk_org_id,
              budget: campaign.budget || 0,
              currency: campaign.currency || 'USD',
              country: campaign.country,
              campaign_type: campaign.campaign_type,
              has_dates: !!(campaign.start_date || campaign.end_date),
              timestamp: new Date().toISOString(),
            },
          }),
        })
      }
    } catch (posthogError) {
      // Log error but don't fail the request
      console.error('PostHog tracking error:', posthogError)
    }

    // Return the created campaign
    return new Response(
      JSON.stringify({ data: campaign }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})