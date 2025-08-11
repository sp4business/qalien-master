// Edge Function to clean up expired invitations
// This can be called via a scheduled cron job or manually

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the database function to mark expired invitations
    const { data, error } = await supabase.rpc('mark_expired_invitations')

    if (error) {
      console.error('Error marking expired invitations:', error)
      throw error
    }

    // Get count of expired invitations for logging
    const { data: expiredCount, error: countError } = await supabase
      .from('team_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'expired')
      .gte('updated_at', new Date(Date.now() - 60000).toISOString()) // Updated in last minute

    const count = expiredCount || 0
    console.log(`Marked ${count} invitations as expired`)

    // Optional: Send reminder emails for invitations expiring soon (within 24 hours)
    const { data: expiringSoon, error: expiringSoonError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()) // Expires within 24 hours
      .gt('expires_at', new Date().toISOString()) // But not expired yet

    if (expiringSoon && expiringSoon.length > 0) {
      console.log(`Found ${expiringSoon.length} invitations expiring soon`)
      
      // Here you could integrate with an email service to send reminders
      // For now, we'll just log them
      for (const invitation of expiringSoon) {
        console.log(`Invitation to ${invitation.email} expires at ${invitation.expires_at}`)
        
        // TODO: Send reminder email via your email service
        // Example with Resend:
        // await sendReminderEmail(invitation.email, invitation.expires_at)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        expired: count,
        expiringSoon: expiringSoon?.length || 0,
        message: `Successfully processed invitation cleanup` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in cleanup-expired-invitations function:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to send reminder emails (placeholder)
async function sendReminderEmail(email: string, expiresAt: string) {
  // Integrate with your email service (Resend, SendGrid, etc.)
  // This is just a placeholder
  console.log(`Would send reminder email to ${email} about invitation expiring at ${expiresAt}`)
}