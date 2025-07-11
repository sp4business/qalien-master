'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCurrentUser, fetchAuthSession } from '../../../lib/auth-stubs';
import Link from 'next/link';
import { API_ENDPOINT } from '../../../aws-config';

interface InvitationDetails {
  brand_name: string;
  org_name: string;
  role: string;
  invited_by: string;
  expires_at: string;
}

export default function InviteAcceptPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkAuthAndValidateToken();
  }, [token]);

  const checkAuthAndValidateToken = async () => {
    try {
      // Check if user is authenticated
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }

      // Validate invitation token
      if (!token) {
        setError('Invalid invitation link');
        setIsValid(false);
        setValidating(false);
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_ENDPOINT}/invite/accept?token=${token}`);
      const data = await response.json();

      if (data.valid) {
        setIsValid(true);
        setInvitation(data.invitation);
      } else {
        const errorMessage = data.error?.message || 'Invalid or expired invitation';
        let userFriendlyMessage = errorMessage;
        
        if (errorMessage.includes('expired')) {
          userFriendlyMessage = 'This invitation has expired. Please request a new one.';
        } else if (errorMessage.includes('used')) {
          userFriendlyMessage = 'This invitation has already been used.';
        } else if (errorMessage.includes('not found')) {
          userFriendlyMessage = 'This invitation is invalid or has been cancelled.';
        }
        
        setError(userFriendlyMessage);
        setIsValid(false);
      }
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      setError('Network error: Unable to validate invitation. Please check your connection and try again.');
      setIsValid(false);
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      const session = await fetchAuthSession();
      const authToken = session.tokens?.idToken?.toString();

      if (!authToken) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_ENDPOINT}/invite/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to brand page after 2 seconds
        setTimeout(() => {
          router.push(data.redirect_url || '/');
        }, 2000);
      } else {
        const errorMessage = data.error?.message || 'Failed to accept invitation';
        let userFriendlyMessage = errorMessage;
        
        if (errorMessage.includes('expired')) {
          userFriendlyMessage = 'This invitation has expired. Please request a new one.';
        } else if (errorMessage.includes('already accepted')) {
          userFriendlyMessage = 'You have already accepted this invitation.';
        } else if (errorMessage.includes('unauthorized')) {
          userFriendlyMessage = 'Please log in to accept this invitation.';
        }
        
        throw new Error(userFriendlyMessage);
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || validating) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1A1F2E] rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.964-.833-2.732 0L8.5 15.5c-.77.833.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h2>
          <p className="text-gray-400 mb-8">{error || 'This invitation link is invalid or has expired.'}</p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1A1F2E] rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">You\'ve been invited!</h2>
          <p className="text-gray-300 mb-2">
            <strong>{invitation?.invited_by}</strong> has invited you to join
          </p>
          <p className="text-xl text-purple-400 font-semibold mb-2">{invitation?.brand_name}</p>
          <p className="text-gray-400 mb-8">as {invitation?.role}</p>
          
          <div className="space-y-4">
            <Link
              href={`/login?redirect=/invite/accept?token=${token}`}
              className="block w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
            >
              Login to Accept
            </Link>
            <Link
              href={`/login?mode=signup&redirect=/invite/accept?token=${token}`}
              className="block w-full px-6 py-3 bg-[#2A3142] hover:bg-[#323B4F] border border-gray-600 rounded-lg transition-colors text-white"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1A1F2E] rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Success!</h2>
          <p className="text-gray-400">You\'ve successfully joined {invitation?.brand_name}. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1A1F2E] rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Accept Invitation</h2>
          <p className="text-gray-300 mb-2">
            <strong>{invitation?.invited_by}</strong> has invited you to join
          </p>
          <p className="text-xl text-purple-400 font-semibold mb-2">{invitation?.brand_name}</p>
          <p className="text-gray-400 mb-1">Organization: {invitation?.org_name}</p>
          <p className="text-gray-400">Role: <span className="text-white">{invitation?.role}</span></p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={acceptInvitation}
            disabled={accepting}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {accepting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </button>
          
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-[#2A3142] hover:bg-[#323B4F] border border-gray-600 rounded-lg transition-colors text-white text-center"
          >
            Cancel
          </Link>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700">
          <p className="text-sm text-gray-500 text-center">
            This invitation will expire on{' '}
            <span className="text-gray-400">
              {invitation?.expires_at && new Date(invitation.expires_at).toLocaleDateString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}