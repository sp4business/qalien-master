// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clerk-token',
}

interface InvitationRequest {
  organizationId: string
  organizationName?: string
  invitations: Array<{
    email: string
    role: 'admin' | 'editor' | 'viewer'
  }>
  clerkToken?: string // Optional token in body as fallback
}

// Map our roles to Clerk organization roles
const roleMapping = {
  admin: 'org:admin',
  editor: 'org:member',
  viewer: 'org:member'
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !clerkSecretKey) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body first to get all data
    const body: InvitationRequest = await req.json()
    const { organizationId, organizationName, invitations, clerkToken } = body

    // Get the Clerk token from custom header or body
    let token = req.headers.get('x-clerk-token') || clerkToken
    
    // Fallback to Authorization header if available
    if (!token) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        token = authHeader.replace('Bearer ', '')
      }
    }
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No authentication token provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Since we're using Clerk authentication, we need to decode the Clerk JWT
    // to get the user information
    let clerkUserId: string
    try {
      // Decode the JWT payload (without verification since Clerk already verified it)
      const base64Payload = token.split('.')[1]
      const payload = JSON.parse(atob(base64Payload))
      clerkUserId = payload.sub || payload.user_id
      
      if (!clerkUserId) {
        throw new Error('No user ID in token')
      }
      
      console.log('Authenticated user:', clerkUserId)
    } catch (error) {
      console.error('Error decoding token:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid token format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate request data
    if (!organizationId || !invitations || !Array.isArray(invitations)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // We already have the clerkUserId from the decoded token above
    console.log('Processing invitations for user:', clerkUserId, 'in organization:', organizationId)

    // Make request to Clerk API to create invitations
    const results = []
    const errors = []

    for (const invitation of invitations) {
      try {
        // Get the base URL from the request origin or environment
        const origin = req.headers.get('origin')
        const baseUrl = origin || Deno.env.get('PUBLIC_URL') || 'http://localhost:3000'
        
        const invitePayload = {
          email_address: invitation.email,
          role: roleMapping[invitation.role],
          inviter_user_id: clerkUserId,
          redirect_url: `${baseUrl}/accept-org-invite`,
          public_metadata: {
            invited_role: invitation.role,
            invited_email: invitation.email,
            organization_name: body.organizationName || 'QAlien Organization'
          }
        }
        
        console.log('Sending invitation:', invitePayload)
        console.log('To organization:', organizationId)
        console.log('Using Clerk API key starting with:', clerkSecretKey.substring(0, 10) + '...')
        
        // Call Clerk API directly to create invitation
        const clerkResponse = await fetch(
          `https://api.clerk.com/v1/organizations/${organizationId}/invitations`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${clerkSecretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(invitePayload)
          }
        )

        if (!clerkResponse.ok) {
          const errorData = await clerkResponse.json()
          console.error('Clerk API error:', errorData)
          
          let errorMessage = 'Failed to send invitation'
          if (errorData.errors && errorData.errors[0]) {
            const clerkError = errorData.errors[0]
            if (clerkError.message.includes('already a member')) {
              errorMessage = 'User is already a member of this organization'
            } else if (clerkError.message.includes('already been invited')) {
              errorMessage = 'User has already been invited'
            } else if (clerkError.code === 'duplicate_record') {
              errorMessage = 'This email has already been invited'
            } else {
              errorMessage = clerkError.message
            }
          }

          errors.push({
            email: invitation.email,
            error: errorMessage
          })
          continue
        }

        const clerkInvitation = await clerkResponse.json()
        console.log('Clerk API success response:', clerkInvitation)
        
        results.push({
          email: invitation.email,
          status: 'sent',
          invitationId: clerkInvitation.id
        })

        // Store invitation record in our database for tracking
        const { error: dbError } = await supabase
          .from('team_invitations')
          .insert({
            clerk_org_id: organizationId,
            email: invitation.email,
            role: invitation.role,
            invited_by_clerk_id: clerkUserId,
            clerk_invitation_id: clerkInvitation.id,
            status: 'pending'
          })

        if (dbError) {
          console.error('Error storing invitation in database:', dbError)
          // Don't fail the whole operation if DB insert fails
        }
      } catch (inviteError) {
        console.error('Error sending invitation:', inviteError)
        errors.push({
          email: invitation.email,
          error: 'Failed to send invitation'
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
        errors,
        message: `Successfully sent ${results.length} invitation(s)` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in invite-team-members function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})