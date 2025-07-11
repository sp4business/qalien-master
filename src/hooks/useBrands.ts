import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrganization, useUser } from '@clerk/nextjs'
import { useSupabaseClient } from '@/lib/supabase'

export interface Brand {
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

export function useBrands() {
  const { organization } = useOrganization()
  const supabase = useSupabaseClient()
  
  return useQuery({
    queryKey: ['brands', organization?.id],
    queryFn: async () => {
      if (!organization) return []
      
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Brand[]
    },
    enabled: !!organization,
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
    }) => {
      if (!organization || !user) throw new Error('No organization or user')
      
      const { data, error } = await supabase
        .from('brands')
        .insert({
          ...brandData,
          clerk_org_id: organization.id,
          created_by_clerk_id: user.id,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', organization?.id] })
    },
  })
}