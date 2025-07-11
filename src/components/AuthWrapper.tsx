'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import QAlienLoadingScreen from './QAlienLoadingScreen';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isLoaded && !isSignedIn && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!isLoaded) {
    return (
      <QAlienLoadingScreen
        isVisible={true}
        type="auth"
        message="Authenticating..."
        duration={1000}
      />
    );
  }

  if (!isSignedIn) {
    // If we're not loading and there's no user, redirect to login
    if (pathname !== '/login') {
      router.replace('/login');
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0F1117]">
      {/* Header with sign out */}
      <header className="bg-[#1A1D29] border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
                QAlien
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {user?.emailAddresses[0]?.emailAddress || user?.username}
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
  );
}