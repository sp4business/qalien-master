'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { clerkConfig } from '@/lib/clerk'

interface ModernStackProviderProps {
  children: React.ReactNode
}

export default function ModernStackProvider({ children }: ModernStackProviderProps) {
  // Create a client
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error: any) => {
          if (error?.status === 404) return false
          return failureCount < 3
        },
      },
    },
  }))

  return (
    <ClerkProvider
      publishableKey={clerkConfig.publishableKey}
      appearance={clerkConfig.appearance}
      afterSignOutUrl="/login"
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  )
}