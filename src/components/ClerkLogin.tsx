'use client';

import { SignIn, SignUp } from '@clerk/nextjs';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ClerkLogin() {
  const [isSignUp, setIsSignUp] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

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