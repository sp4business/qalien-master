'use client';

import { useEffect } from 'react';
import { useAuth, useUser, useOrganizationList } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function InvitationProcessor() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { userInvitations } = useOrganizationList({
    userInvitations: true,
  });
  const router = useRouter();

  // Check for pending invitations after sign-in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || !userInvitations) return;

    const checkAndAcceptPendingInvitations = async () => {
      // Check if we have any pending invitations
      if (userInvitations.data && userInvitations.data.length > 0) {
        console.log('Found pending invitations:', userInvitations.data.length);
        
        // Auto-accept the first pending invitation
        const pendingInvitation = userInvitations.data[0];
        try {
          console.log('Auto-accepting invitation for:', pendingInvitation.publicOrganizationData.name);
          await pendingInvitation.accept();
          
          console.log('Invitation accepted successfully, redirecting...');
          // Redirect to home with invitation flag
          setTimeout(() => {
            window.location.href = '/?from_invite=true';
          }, 500);
        } catch (error) {
          console.error('Error auto-accepting invitation:', error);
        }
      }
    };

    checkAndAcceptPendingInvitations();
  }, [isLoaded, isSignedIn, user, userInvitations]);

  // Original logic for stored invitation parameters
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;

    // Check if we have stored invitation parameters
    const storedParams = sessionStorage.getItem('clerk_invitation_params');
    if (!storedParams) return;

    try {
      const invitationData = JSON.parse(storedParams);
      
      // Check if the data is recent (within 10 minutes)
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
      if (invitationData.timestamp < tenMinutesAgo) {
        sessionStorage.removeItem('clerk_invitation_params');
        return;
      }

      // Check if we're already on the accept-org-invite page
      if (window.location.pathname.includes('accept-org-invite')) {
        return;
      }

      console.log('Found stored invitation parameters:', invitationData);
      console.log('Current URL:', window.location.href);
      console.log('User email:', user.primaryEmailAddress?.emailAddress);
      
      // Clear the stored parameters
      sessionStorage.removeItem('clerk_invitation_params');
      
      // Redirect to accept-org-invite with the parameters
      const params = new URLSearchParams();
      params.set('__clerk_ticket', invitationData.ticket);
      if (invitationData.status) {
        params.set('__clerk_status', invitationData.status);
      }
      
      console.log('Redirecting to:', `/accept-org-invite?${params.toString()}`);
      router.push(`/accept-org-invite?${params.toString()}`);
    } catch (error) {
      console.error('Error processing stored invitation:', error);
      sessionStorage.removeItem('clerk_invitation_params');
    }
  }, [isLoaded, isSignedIn, user, router]);

  return null;
}