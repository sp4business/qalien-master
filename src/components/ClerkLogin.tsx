'use client';

import { SignIn, SignUp } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ClerkLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Determine initial mode based on the current path
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const initialIsSignUp = pathname.includes('sign-up');
  const [isSignUp, setIsSignUp] = useState(initialIsSignUp);
  
  // Check for invitation URL in sessionStorage or query params
  const invitationReturnUrl = typeof window !== 'undefined' 
    ? sessionStorage.getItem('invitation_return_url') 
    : null;
  
  // Check if we have invitation parameters
  const hasInvitationTicket = searchParams.get('__clerk_ticket') !== null;
  const invitationTicket = searchParams.get('__clerk_ticket');
  const invitationStatus = searchParams.get('__clerk_status');
  
  // Build redirect URL with invitation parameters preserved
  let baseRedirectUrl = searchParams.get('redirect_url') || 
                       searchParams.get('redirect') || 
                       invitationReturnUrl || 
                       '/';
  
  // If we have invitation parameters, preserve them through the OAuth flow
  let redirectUrl = baseRedirectUrl;
  if (hasInvitationTicket && invitationTicket) {
    const params = new URLSearchParams();
    params.set('__clerk_ticket', invitationTicket);
    if (invitationStatus) {
      params.set('__clerk_status', invitationStatus);
    }
    // If redirecting to home, redirect to accept-org-invite instead
    redirectUrl = baseRedirectUrl === '/' 
      ? `/accept-org-invite?${params.toString()}`
      : `${baseRedirectUrl}${baseRedirectUrl.includes('?') ? '&' : '?'}${params.toString()}`;
  }
  
  // Store invitation parameters in sessionStorage for OAuth flow
  useEffect(() => {
    if (hasInvitationTicket && invitationTicket) {
      sessionStorage.setItem('clerk_invitation_params', JSON.stringify({
        ticket: invitationTicket,
        status: invitationStatus,
        timestamp: Date.now()
      }));
    }
    
    // Clear old invitation URL from sessionStorage
    if (invitationReturnUrl) {
      sessionStorage.removeItem('invitation_return_url');
    }
  }, [hasInvitationTicket, invitationTicket, invitationStatus, invitationReturnUrl]);

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* QAlien Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">
            QAlien
          </h1>
          <p className="text-gray-400">
            Brand Compliance Platform
          </p>
        </div>
        
        {/* Invitation Notice */}
        {hasInvitationTicket && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-blue-300 text-center">
              🎉 You've been invited to join an organization! {isSignUp ? 'Create your account' : 'Sign in'} to accept.
            </p>
          </div>
        )}

        {/* Auth Mode Toggle */}
        <div className="flex bg-[#1A1D29] rounded-lg p-1">
          <button
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              !isSignUp
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              isSignUp
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Clerk Auth Components */}
        <div className="flex justify-center">
          {isSignUp ? (
            <SignUp
              afterSignUpUrl={redirectUrl}
              afterSignInUrl={redirectUrl}
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: '#7C3AED',
                  colorText: '#ffffff',
                  colorTextSecondary: '#9CA3AF',
                  colorBackground: '#1A1D29',
                  colorInputBackground: '#0F1117',
                  colorInputText: '#ffffff',
                  borderRadius: '0.5rem',
                },
                elements: {
                  card: 'bg-[#1A1D29] border border-gray-700',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-gray-400',
                  socialButtonsBlockButton: 'bg-[#0F1117] border border-gray-700 text-white hover:bg-gray-800',
                  formFieldLabel: 'text-gray-300',
                  formFieldInput: 'bg-[#0F1117] border border-gray-700 text-white',
                  formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
                  footerActionText: 'text-gray-400',
                  footerActionLink: 'text-purple-400 hover:text-purple-300',
                  dividerText: 'text-gray-500',
                  dividerLine: 'bg-gray-700',
                }
              }}
            />
          ) : (
            <SignIn
              afterSignInUrl={redirectUrl}
              afterSignUpUrl={redirectUrl}
              appearance={{
                baseTheme: undefined,
                variables: {
                  colorPrimary: '#7C3AED',
                  colorText: '#ffffff',
                  colorTextSecondary: '#9CA3AF',
                  colorBackground: '#1A1D29',
                  colorInputBackground: '#0F1117',
                  colorInputText: '#ffffff',
                  borderRadius: '0.5rem',
                },
                elements: {
                  card: 'bg-[#1A1D29] border border-gray-700',
                  headerTitle: 'text-white',
                  headerSubtitle: 'text-gray-400',
                  socialButtonsBlockButton: 'bg-[#0F1117] border border-gray-700 text-white hover:bg-gray-800',
                  formFieldLabel: 'text-gray-300',
                  formFieldInput: 'bg-[#0F1117] border border-gray-700 text-white',
                  formButtonPrimary: 'bg-purple-600 hover:bg-purple-700',
                  footerActionText: 'text-gray-400',
                  footerActionLink: 'text-purple-400 hover:text-purple-300',
                  dividerText: 'text-gray-500',
                  dividerLine: 'bg-gray-700',
                }
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            By continuing, you agree to our{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-purple-400 hover:text-purple-300">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}