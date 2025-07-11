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
      organizations: {
        Row: {
          id: string
          clerk_org_id: string
          name: string
          slug: string
          industry: string | null
          asset_quota_gb: number
          billing_email: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          clerk_org_id: string
          name: string
          slug: string
          industry?: string | null
          asset_quota_gb?: number
          billing_email?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          clerk_org_id?: string
          name?: string
          slug?: string
          industry?: string | null
          asset_quota_gb?: number
          billing_email?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          industry: string | null
          status: string
          logo_files: string[]
          color_palette: string[]
          tone_keywords: string[]
          approved_terms: string[]
          banned_terms: string[]
          required_disclaimers: string[]
          safe_zone_config: any
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          industry?: string | null
          status?: string
          logo_files?: string[]
          color_palette?: string[]
          tone_keywords?: string[]
          approved_terms?: string[]
          banned_terms?: string[]
          required_disclaimers?: string[]
          safe_zone_config?: any
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          industry?: string | null
          status?: string
          logo_files?: string[]
          color_palette?: string[]
          tone_keywords?: string[]
          approved_terms?: string[]
          banned_terms?: string[]
          required_disclaimers?: string[]
          safe_zone_config?: any
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      creatives: {
        Row: {
          id: string
          org_id: string
          brand_id: string
          campaign_id: string | null
          filename: string
          file_url: string
          file_size: number | null
          mime_type: string | null
          duration_seconds: number | null
          width: number | null
          height: number | null
          aspect_ratio: number | null
          creative_type: string
          ugc_score: number
          status: string
          analysis_results: any | null
          overall_status: string | null
          compliance_score: number | null
          uploaded_by: string | null
          uploaded_at: string
          analyzed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          org_id: string
          brand_id: string
          campaign_id?: string | null
          filename: string
          file_url: string
          file_size?: number | null
          mime_type?: string | null
          duration_seconds?: number | null
          width?: number | null
          height?: number | null
          aspect_ratio?: number | null
          creative_type?: string
          ugc_score?: number
          status?: string
          analysis_results?: any | null
          overall_status?: string | null
          compliance_score?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          brand_id?: string
          campaign_id?: string | null
          filename?: string
          file_url?: string
          file_size?: number | null
          mime_type?: string | null
          duration_seconds?: number | null
          width?: number | null
          height?: number | null
          aspect_ratio?: number | null
          creative_type?: string
          ugc_score?: number
          status?: string
          analysis_results?: any | null
          overall_status?: string | null
          compliance_score?: number | null
          uploaded_by?: string | null
          uploaded_at?: string
          analyzed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']