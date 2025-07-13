import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrganization, useUser } from '@clerk/nextjs'
import { useSupabaseClient } from '@/lib/supabase'

export interface Brand {
  id: string
  clerk_org_id: string
  name: string
  description: string | null
  industry: string | null
  website: string | null
  phonetic_pronunciation: string | null
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

export function useBrands() {
  const { organization } = useOrganization()
  const supabase = useSupabaseClient()
  
  return useQuery({
    queryKey: ['brands', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      
      try {
        console.log('Fetching brands for org:', organization.id)
        
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .eq('clerk_org_id', organization.id)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching brands:', error.message)
          return []
        }
        
        console.log('Successfully fetched', data?.length || 0, 'brands')
        return (data as Brand[]) || []
      } catch (err) {
        console.error('useBrands error:', err)
        return []
      }
    },
    enabled: !!organization,
    staleTime: 30000, // Cache for 30 seconds
    retry: false, // Don't retry on error
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const { user } = useUser()
  const supabase = useSupabaseClient()
  
  return useMutation({
    mutationFn: async (brandData: {
      name: string
      description?: string
      industry?: string
      website?: string
      phonetic_pronunciation?: string
      logo_files?: string[]
      color_palette?: string[]
      tone_keywords?: string[]
      approved_terms?: string[]
      banned_terms?: string[]
      required_disclaimers?: string[]
      safe_zone_config?: any
      guidelines_pdf_url?: string | null
    }) => {
      if (!organization || !user) throw new Error('No organization or user')
      
      const insertData = {
        ...brandData,
        clerk_org_id: organization.id,
        created_by_clerk_id: user.id,
      }
      
      console.log('Inserting brand data:', insertData)
      
      const { data, error } = await supabase
        .from('brands')
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        console.error('Supabase insert error:', error)
        throw error
      }
      
      console.log('Brand created successfully:', data)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', organization?.id] })
    },
  })
}