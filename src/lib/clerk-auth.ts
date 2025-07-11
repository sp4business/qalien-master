// Clerk-based authentication implementations
// This replaces the AWS Amplify auth stubs with real Clerk auth

'use client'

import { useUser, useClerk, useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

// Hook for sign out functionality
export function useSignOut() {
  const { signOut } = useClerk()
  const router = useRouter()
  
  const handleSignOut = async (options?: { redirectUrl?: string }) => {
    try {
      await signOut()
      router.push(options?.redirectUrl || '/login')
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error }
    }
  }
  
  return { signOut: handleSignOut }
}

// Hook to get auth session (replaces fetchAuthSession from AWS)
export function useAuthSession() {
  const { getToken } = useAuth()
  const { user } = useUser()
  
  const fetchAuthSession = async () => {
    const token = await getToken()
    
    return {
      credentials: {
        accessKeyId: 'clerk-managed',
        secretAccessKey: 'clerk-managed'
      },
      tokens: {
        idToken: {
          payload: {
            sub: user?.id || '',
            email: user?.emailAddresses[0]?.emailAddress || '',
            'clerk:org_role': user?.organizationMemberships?.[0]?.role || 'member'
          },
          toString: () => token || ''
        },
        accessToken: {
          payload: {
            sub: user?.id || '',
            username: user?.username || user?.emailAddresses[0]?.emailAddress || ''
          },
          toString: () => token || ''
        }
      },
      userSub: user?.id || ''
    }
  }
  
  return { fetchAuthSession }
}

// Hook to get current user (replaces getCurrentUser from AWS)
export function useCurrentUser() {
  const { user, isLoaded } = useUser()
  
  return {
    user: user ? {
      username: user.username || user.emailAddresses[0]?.emailAddress || '',
      userId: user.id,
      signInDetails: {
        loginId: user.emailAddresses[0]?.emailAddress || user.username || ''
      },
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      fullName: user.fullName || ''
    } : null,
    isLoaded,
    isSignedIn: !!user
  }
}