// Modern Stack API Client
// Replaces AWS API Gateway calls with Supabase Edge Functions

import { useSupabaseClient } from './supabase'
import { useAuth } from '@clerk/nextjs'

// Mock data for development
const mockBrands = [
  {
    id: 'brand-1',
    name: 'QAlien Demo Brand',
    description: 'A sample brand for testing',
    industry: 'Technology',
    color_palette: ['#37B34A', '#ffffff', '#1f2937'],
    logo_files: ['logo-primary.png'],
    created_at: '2025-01-07T10:00:00Z',
    status: 'active'
  }
]

const mockCreatives = [
  {
    id: 'creative-1',
    brand_id: 'brand-1',
    filename: 'sample-video.mp4',
    file_url: '/sample-video.mp4',
    status: 'completed',
    creative_type: 'UGC',
    overall_status: 'pass',
    compliance_score: 92,
    uploaded_at: '2025-01-07T09:00:00Z',
    analysis_results: {
      logos_iconography: { status: 'pass', notes: 'Logo properly positioned' },
      colors_palette: { status: 'pass', notes: 'Colors match brand palette' },
      brand_vocabulary: { status: 'pass', notes: 'No banned terms found' },
      brand_tone: { status: 'warn', notes: 'Tone slightly casual' },
      disclaimers_required_language: { status: 'pass', notes: 'All disclaimers present' },
      layout_safe_zone: { status: 'pass', notes: 'Layout follows guidelines' },
      golden_set_similarity: { status: 'pass', notes: 'Good similarity to approved content' }
    }
  }
]

const mockOrganizations = [
  {
    id: 'org-1',
    name: 'QAlien Demo Organization',
    slug: 'qalien-demo',
    industry: 'Technology',
    created_at: '2025-01-07T08:00:00Z'
  }
]

// API Client hooks
export function useApi() {
  const supabase = useSupabaseClient()
  const { isSignedIn } = useAuth()

  const api = {
    // Organizations
    async getOrganizations() {
      if (!isSignedIn) return []
      
      // TODO: Replace with actual Supabase call
      // const { data } = await supabase.from('organizations').select('*')
      return mockOrganizations
    },

    async createOrganization(org: { name: string; slug: string; industry?: string }) {
      if (!isSignedIn) throw new Error('Not authenticated')
      
      // TODO: Replace with actual Supabase call
      // const { data } = await supabase.from('organizations').insert(org).select().single()
      return { id: 'new-org-' + Date.now(), ...org, created_at: new Date().toISOString() }
    },

    // Brands
    async getBrands(orgId?: string) {
      if (!isSignedIn) return []
      
      // TODO: Replace with actual Supabase call
      // const { data } = await supabase.from('brands').select('*').eq('org_id', orgId)
      return mockBrands
    },

    async createBrand(brand: { name: string; description?: string; industry?: string; org_id: string }) {
      if (!isSignedIn) throw new Error('Not authenticated')
      
      // TODO: Replace with actual Supabase call
      // const { data } = await supabase.from('brands').insert(brand).select().single()
      return { id: 'new-brand-' + Date.now(), ...brand, created_at: new Date().toISOString() }
    },

    async getBrand(brandId: string) {
      if (!isSignedIn) return null
      
      // TODO: Replace with actual Supabase call
      // const { data } = await supabase.from('brands').select('*').eq('id', brandId).single()
      return mockBrands.find(b => b.id === brandId) || null
    },

    // Creatives
    async getCreatives(brandId?: string) {
      if (!isSignedIn) return []
      
      // TODO: Replace with actual Supabase call
      // const { data } = await supabase.from('creatives').select('*').eq('brand_id', brandId)
      return mockCreatives.filter(c => !brandId || c.brand_id === brandId)
    },

    async uploadCreative(file: File, brandId: string) {
      if (!isSignedIn) throw new Error('Not authenticated')
      
      // TODO: Replace with actual Supabase Storage upload
      // const { data } = await supabase.storage.from('creatives').upload(filePath, file)
      // Then create creative record
      return {
        id: 'new-creative-' + Date.now(),
        brand_id: brandId,
        filename: file.name,
        file_url: URL.createObjectURL(file),
        status: 'processing',
        created_at: new Date().toISOString()
      }
    },

    // PDF Analysis
    async analyzePDF(file: File, brandId: string) {
      if (!isSignedIn) throw new Error('Not authenticated')
      
      // TODO: Replace with actual Supabase Edge Function call
      // const { data } = await supabase.functions.invoke('analyze-pdf', {
      //   body: { file: base64File, brandId }
      // })
      
      // Mock analysis result
      return {
        analysis_id: 'analysis-' + Date.now(),
        colors: [
          { hex: '#37B34A', rgb: [55, 179, 74], confidence: 'high' },
          { hex: '#ffffff', rgb: [255, 255, 255], confidence: 'high' }
        ],
        logos: [
          { s3_key: 'logo-1.png', confidence: 0.92 }
        ],
        verbal_identity: {
          tone: 'Professional, innovative, trustworthy',
          approved_terms: ['innovative', 'reliable', 'cutting-edge'],
          banned_terms: ['cheap', 'outdated'],
          required_disclaimers: ['© 2025 QAlien']
        },
        status: 'completed'
      }
    },

    // Team Management
    async inviteUser(email: string, role: string, scopeType: 'brand' | 'organization', scopeId: string) {
      if (!isSignedIn) throw new Error('Not authenticated')
      
      // TODO: Replace with actual Supabase Edge Function call
      // const { data } = await supabase.functions.invoke('invite-user', {
      //   body: { email, role, scopeType, scopeId }
      // })
      
      return {
        invitation_id: 'invite-' + Date.now(),
        email,
        role,
        status: 'pending',
        created_at: new Date().toISOString()
      }
    }
  }

  return api
}

// Legacy API support (for gradual migration)
export const legacyApi = {
  // Mock legacy API calls for compatibility
  async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    console.warn('Legacy API call:', endpoint, '- Consider migrating to modern stack')
    
    // Return mock response
    return {
      ok: true,
      json: async () => ({ message: 'Mock response - migrate to modern stack' })
    }
  }
}

export default useApi