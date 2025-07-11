// Supabase client configuration
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@clerk/nextjs'
import { env } from './config'

// Create Supabase client
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Hook for authenticated Supabase client
export function useSupabaseClient() {
  const { getToken } = useAuth()
  
  const supabaseClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getToken({ template: 'supabase' })
          
          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: token ? `Bearer ${token}` : '',
            },
          })
        },
      },
    }
  )
  
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
          status: 'active' | 'archived'
          logo_files: string[]
          color_palette: string[]
          tone_keywords: string[]
          approved_terms: string[]
          banned_terms: string[]
          required_disclaimers: string[]
          safe_zone_config: any
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
          status?: 'active' | 'archived'
          logo_files?: string[]
          color_palette?: string[]
          tone_keywords?: string[]
          approved_terms?: string[]
          banned_terms?: string[]
          required_disclaimers?: string[]
          safe_zone_config?: any
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