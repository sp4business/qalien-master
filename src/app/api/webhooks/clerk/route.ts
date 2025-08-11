import { headers } from 'next/headers';
import { WebhookEvent } from '@svix/webhooks';
import { Webhook } from 'svix';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Type definitions for webhook events
interface OrganizationMembershipEvent {
  id: string;
  object: string;
  created_at: number;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  public_user_data: {
    user_id: string;
    first_name: string;
    last_name: string;
    email_addresses: Array<{
      email_address: string;
      id: string;
    }>;
  };
  role: string;
}

async function syncOrganizationMembership(membershipData: OrganizationMembershipEvent) {
  try {
    // Get the user's full details from Clerk to get their auth token
    const user = await clerkClient.users.getUser(membershipData.public_user_data.user_id);
    
    // Call your backend API to sync the organization membership
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_ENDPOINT || 'https://6wfvvuvm25.execute-api.us-east-1.amazonaws.com/dev'}/organizations/sync-membership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You might need to generate a system token for webhook->API communication
        'X-Webhook-Secret': process.env.WEBHOOK_API_SECRET || '',
      },
      body: JSON.stringify({
        user_id: membershipData.public_user_data.user_id,
        email: membershipData.public_user_data.email_addresses[0]?.email_address,
        organization_id: membershipData.organization.id,
        organization_name: membershipData.organization.name,
        organization_slug: membershipData.organization.slug,
        role: membershipData.role,
        first_name: membershipData.public_user_data.first_name,
        last_name: membershipData.public_user_data.last_name,
      }),
    });

    if (!response.ok) {
      console.error('Failed to sync organization membership:', await response.text());
    } else {
      console.log('Successfully synced organization membership');
    }
  } catch (error) {
    console.error('Error syncing organization membership:', error);
  }
}

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;
  
  if (eventType === 'organizationInvitation.accepted') {
    // Update our team_invitations table when invitation is accepted
    console.log('Organization invitation accepted:', evt.data);
    
    try {
      // Initialize Supabase client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Get invitation data
      const invitationData = evt.data as any;
      const { email_address, organization_id, id: invitationId } = invitationData;
      
      // Update the invitation status in our database
      const { error } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('clerk_invitation_id', invitationId)
        .eq('clerk_org_id', organization_id);
        
      if (error) {
        console.error('Error updating invitation status:', error);
      } else {
        console.log('Successfully updated invitation status to accepted');
      }
    } catch (error) {
      console.error('Error processing invitation acceptance:', error);
    }
  }
  
  if (eventType === 'organizationInvitation.revoked') {
    // Handle invitation revocation/cancellation
    console.log('Organization invitation revoked:', evt.data);
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const invitationData = evt.data as any;
      const { id: invitationId, organization_id } = invitationData;
      
      // Update the invitation status to cancelled
      const { error } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('clerk_invitation_id', invitationId)
        .eq('clerk_org_id', organization_id);
        
      if (error) {
        console.error('Error updating revoked invitation:', error);
      } else {
        console.log('Successfully marked invitation as cancelled');
      }
    } catch (error) {
      console.error('Error processing invitation revocation:', error);
    }
  }

  if (eventType === 'organizationMembership.created') {
    // Sync the membership to your backend
    console.log('User joined organization:', evt.data);
    await syncOrganizationMembership(evt.data as OrganizationMembershipEvent);
  }

  if (eventType === 'organizationMembership.updated') {
    // Sync role changes
    console.log('Organization membership updated:', evt.data);
    await syncOrganizationMembership(evt.data as OrganizationMembershipEvent);
  }

  if (eventType === 'organizationMembership.deleted') {
    // Handle membership removal
    console.log('User removed from organization:', evt.data);
    // You might want to implement a removal sync here
  }

  return new Response('Webhook received', { status: 200 });
}