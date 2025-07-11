// Supabase client configuration
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { env } from './config'
import { useMemo } from 'react'

// Create a singleton Supabase client for unauthenticated requests
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Hook for authenticated Supabase client
export function useSupabaseClient() {
  const { getToken } = useAuth()
  
  // Use useMemo to ensure we only create one client instance per component
  const supabaseClient = useMemo(() => {
    // According to Supabase docs, we should use accessToken option for custom JWTs
    const client = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        // Use accessToken function as shown in Clerk integration docs
        accessToken: async () => {
          try {
            const token = await getToken({ template: 'supabase' })
            console.log('Got Clerk token for Supabase:', token ? 'Yes' : 'No')
            return token ?? null
          } catch (error) {
            console.error('Error getting Clerk token:', error)
            return null
          }
        },
      }
    )
    
    return client
  }, [getToken])
  
  return supabaseClient
}

// Database types (will be generated from Supabase)
export type Database = {
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          clerk_org_id: string
          name: string
          description: string | null
          industry: string | null
          website: string | null
          status: 'active' | 'archived'
          logo_files: string[]
          color_palette: string[]
          tone_keywords: string[]
          approved_terms: string[]
          banned_terms: string[]
          required_disclaimers: string[]
          safe_zone_config: any
          guidelines_pdf_url: string | null
          created_by_clerk_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_org_id: string
          name: string
          description?: string | null
          industry?: string | null
          website?: string | null
          status?: 'active' | 'archived'
          logo_files?: string[]
          color_palette?: string[]
          tone_keywords?: string[]
          approved_terms?: string[]
          banned_terms?: string[]
          required_disclaimers?: string[]
          safe_zone_config?: any
          guidelines_pdf_url?: string | null
          created_by_clerk_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_org_id?: string
          name?: string
          description?: string | null
          industry?: string | null
          status?: 'active' | 'archived'
          logo_files?: string[]
          color_palette?: string[]
          tone_keywords?: string[]
          approved_terms?: string[]
          banned_terms?: string[]
          required_disclaimers?: string[]
          safe_zone_config?: any
          created_by_clerk_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']