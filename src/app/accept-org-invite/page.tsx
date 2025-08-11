'use client';

import { useEffect, useState } from 'react';
import { useAuth, useUser, useOrganizationList, useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import QAlienLoadingScreen from '@/components/QAlienLoadingScreen';

export default function OrganizationInvitationPage() {
  const { isLoaded: authLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const { setActive, userInvitations } = useOrganizationList({
    userInvitations: true,
  });
  const { signIn, setActive: setActiveSession } = useSignIn();
  const router = useRouter();
  
  const [showSignOutPrompt, setShowSignOutPrompt] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState('');
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const [showMultipleInvitations, setShowMultipleInvitations] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);

  useEffect(() => {
    console.log('OrganizationInvitationPage - authLoaded:', authLoaded, 'isSignedIn:', isSignedIn);
    console.log('Current URL:', window.location.href);
    
    if (!authLoaded) return;

    // Store the current URL with invitation parameters
    const currentUrl = window.location.href;
    setInvitationUrl(currentUrl);

    // Check if there's a stored invitation URL (user just signed out)
    const storedInvitationUrl = sessionStorage.getItem('clerk_invitation_url');
    if (storedInvitationUrl && !isSignedIn) {
      console.log('User signed out, redirecting to stored URL:', storedInvitationUrl);
      // User signed out, redirect them to the stored URL
      sessionStorage.removeItem('clerk_invitation_url');
      window.location.href = storedInvitationUrl;
      return;
    }

    // Check for Clerk parameters
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get('__clerk_ticket');
    const status = urlParams.get('__clerk_status');
    const invitationToken = urlParams.get('__clerk_invitation_token');
    
    console.log('Clerk params - ticket:', ticket, 'status:', status, 'invitationToken:', invitationToken);

    // If user is signed in, show the sign-out prompt
    if (isSignedIn && user) {
      const hasClerkParams = ticket || status || invitationToken;
      
      if (hasClerkParams) {
        console.log('User is signed in with invitation params, showing sign-out prompt');
        setShowSignOutPrompt(true);
      } else {
        // No invitation parameters, redirect to home
        console.log('No invitation parameters found, redirecting to home');
        router.push('/');
      }
    } else if (!isSignedIn && (ticket || status)) {
      // User is not signed in and has invitation params
      // Clerk should handle this automatically
      console.log('User not signed in with invitation params, letting Clerk handle');
    } else if (isSignedIn && ticket && !showSignOutPrompt) {
      // User just signed in (possibly via OAuth) and has ticket
      // Try to accept the invitation
      console.log('User signed in with ticket, attempting to accept invitation');
      console.log('Current user email:', user?.primaryEmailAddress?.emailAddress);
      console.log('Ticket:', ticket);
      console.log('Status:', status);
      
      // Add a small delay to ensure Clerk is fully initialized
      setTimeout(() => {
        handleAcceptInvitation();
      }, 500);
    }
  }, [authLoaded, isSignedIn, user, router]);

  const handleAcceptInvitation = async (invitationToAccept?: any) => {
    setProcessing(true);
    
    // First check if there are pending invitations
    if (userInvitations?.data && userInvitations.data.length > 0) {
      // If multiple invitations, show selection UI
      if (userInvitations.data.length > 1 && !invitationToAccept) {
        console.log('Multiple invitations found, showing selection UI');
        setShowMultipleInvitations(true);
        setProcessing(false);
        return;
      }
      
      console.log('Accepting invitation...');
      try {
        const pendingInvitation = invitationToAccept || userInvitations.data[0];
        await pendingInvitation.accept();
        
        console.log('Invitation accepted via userInvitations API');
        setTimeout(() => {
          window.location.href = '/?from_invite=true';
        }, 500);
        return;
      } catch (error) {
        console.error('Error accepting pending invitation:', error);
      }
    }
    
    // Fall back to ticket strategy
    const urlParams = new URLSearchParams(window.location.search);
    const ticket = urlParams.get('__clerk_ticket');
    
    if (!ticket || !signIn) {
      console.error('No ticket or signIn not loaded');
      setProcessing(false);
      return;
    }
    
    try {
      console.log('Processing invitation with ticket strategy...');
      
      // Create a new sign-in with the ticket strategy
      const signInAttempt = await signIn.create({
        strategy: 'ticket',
        ticket: ticket,
      });
      
      console.log('Sign-in attempt result:', signInAttempt);
      
      if (signInAttempt.status === 'complete') {
        // Set the active session
        await setActiveSession({ session: signInAttempt.createdSessionId });
        
        console.log('Invitation accepted, redirecting to home...');
        
        // Give it a moment to sync and redirect with invitation flag
        setTimeout(() => {
          window.location.href = '/?from_invite=true';
        }, 1000);
      } else {
        console.error('Sign-in attempt not complete:', signInAttempt.status);
        setProcessing(false);
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      console.error('Error details:', {
        errors: error?.errors,
        status: error?.status,
        clerkError: error?.clerkError,
        message: error?.message
      });
      
      // Check for specific error codes
      const errorCode = error?.errors?.[0]?.code;
      
      if (errorCode === 'session_exists') {
        console.log('Session already exists, redirecting...');
        setTimeout(() => {
          window.location.href = '/?from_invite=true';
        }, 1000);
      } else if (errorCode === 'invitation_already_accepted' || errorCode === 'resource_not_found') {
        console.log('Invitation may have already been accepted or expired, redirecting...');
        setTimeout(() => {
          window.location.href = '/?from_invite=true';
        }, 1000);
      } else {
        // Show error to user
        alert(`Failed to accept invitation: ${error?.errors?.[0]?.message || error?.message || 'Unknown error'}`);
        setProcessing(false);
      }
    }
  };

  const handleSignOut = async () => {
    setProcessing(true);
    
    // Store the invitation URL before signing out
    sessionStorage.setItem('clerk_invitation_url', invitationUrl);
    
    try {
      await signOut();
      // The page will reload and useEffect will handle the redirect
    } catch (error) {
      console.error('Error signing out:', error);
      setProcessing(false);
    }
  };

  const handleContinue = () => {
    // User wants to stay signed in, redirect to home
    router.push('/');
  };

  // Loading state
  if (!authLoaded) {
    return (
      <QAlienLoadingScreen
        isVisible={true}
        type="organizations"
        message="Loading..."
        duration={2000}
      />
    );
  }

  // Show multiple invitations selection UI
  if (showMultipleInvitations && userInvitations?.data && userInvitations.data.length > 1) {
    return (
      <div className="min-h-screen bg-[#1A1F2E] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-[#2A3142] rounded-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Multiple Organization Invitations</h2>
              <p className="text-gray-400">You have been invited to join multiple organizations. Please select one:</p>
            </div>

            {/* Invitations List */}
            <div className="space-y-3 mb-6">
              {userInvitations.data.map((invitation: any) => (
                <button
                  key={invitation.id}
                  onClick={() => {
                    setSelectedInvitation(invitation);
                    handleAcceptInvitation(invitation);
                  }}
                  className="w-full bg-[#1A1F2E] hover:bg-[#252A3C] rounded-xl p-4 text-left transition-colors border border-gray-700 hover:border-purple-500"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-lg">
                        {invitation.publicOrganizationData?.name || 'Organization'}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Invited by: {invitation.publicOrganizationData?.inviterEmail || 'Admin'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            {/* Cancel Button */}
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show sign-out prompt for signed-in users
  if (showSignOutPrompt && user) {
    return (
      <div className="min-h-screen bg-[#1A1F2E] flex items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="bg-[#2A3142] rounded-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Organization Invitation</h2>
              <p className="text-gray-400">You need to sign out to accept this invitation</p>
            </div>

            {/* Current Account Info */}
            <div className="bg-[#1A1F2E] rounded-xl p-6 mb-6">
              <p className="text-sm text-gray-500 mb-2">Currently signed in as:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.firstName?.[0] || user.primaryEmailAddress?.emailAddress?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{user.fullName || 'User'}</p>
                  <p className="text-sm text-gray-400">{user.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>
            </div>

            {/* Explanation */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-300">
                To accept an organization invitation, you need to sign out first. 
                This ensures the invitation is linked to the correct account.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleSignOut}
                disabled={processing}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out & Accept Invitation</span>
                  </>
                )}
              </button>

              <button
                onClick={handleContinue}
                disabled={processing}
                className="w-full px-6 py-3 bg-[#323B4F] hover:bg-[#3A4459] text-white rounded-xl transition-all duration-200"
              >
                Cancel & Go to Dashboard
              </button>
            </div>

            {/* Tips */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                💡 Tip: Use an incognito window to manage multiple accounts without signing out
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If not signed in, Clerk will handle the invitation flow
  return (
    <QAlienLoadingScreen
      isVisible={true}
      type="organizations"
      message="Processing invitation..."
      duration={2000}
    />
  );
}