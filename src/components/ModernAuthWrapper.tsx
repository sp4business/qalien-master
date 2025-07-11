'use client'

import { useAuth, useOrganization, useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import QAlienLoadingScreen from './QAlienLoadingScreen'

interface ModernAuthWrapperProps {
  children: React.ReactNode
}

export default function ModernAuthWrapper({ children }: ModernAuthWrapperProps) {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { user } = useUser()
  const { organization } = useOrganization()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      // If not authenticated and not on login page, redirect
      if (pathname !== '/login' && pathname !== '/sign-up') {
        router.replace('/login')
      }
    }
  }, [isLoaded, isSignedIn, pathname, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Show loading screen while Clerk loads
  if (!isLoaded) {
    return (
      <QAlienLoadingScreen
        isVisible={true}
        type="auth"
        message="Loading authentication..."
        duration={1000}
      />
    )
  }

  // If not signed in, don't render anything (redirect will happen)
  if (!isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Header with user info and sign out */}
      <header className="bg-[#1A1D29] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
                QAlien
              </Link>
              
              {/* Organization indicator */}
              {organization && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>•</span>
                  <span>{organization.name}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {user?.primaryEmailAddress?.emailAddress || user?.username}
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}