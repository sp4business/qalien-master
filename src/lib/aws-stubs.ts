// AWS Stubs - Replace AWS calls with mock responses
// This allows the app to run without AWS dependencies

// Mock getCurrentUser for Amplify auth
export const getCurrentUser = async () => {
  return {
    username: 'demo-user',
    userId: 'user-123',
    signInDetails: {
      loginId: 'demo@qalien.com'
    }
  }
}

// Mock signOut
export const signOut = async (options?: any) => {
  console.log('Mock signOut called')
  return true
}

// Mock fetchAuthSession
export const fetchAuthSession = async () => {
  return {
    credentials: {
      accessKeyId: 'mock-key',
      secretAccessKey: 'mock-secret'
    },
    tokens: {
      idToken: {
        payload: {
          sub: 'user-123',
          email: 'demo@qalien.com'
        }
      }
    }
  }
}

// Mock Hub for auth events
export const Hub = {
  listen: (channel: string, callback: any) => {
    console.log('Mock Hub listener registered for:', channel)
    return () => console.log('Mock Hub listener unsubscribed')
  }
}

// Mock API_ENDPOINT
export const API_ENDPOINT = 'https://mock-api.qalien.com'

// Mock fetch with auth
export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  console.log('Mock API call to:', endpoint)
  
  // Return mock responses based on endpoint
  const mockResponse = {
    '/organizations': [
      {
        org_id: 'org-1',
        org_name: 'Demo Organization',
        industry: 'Technology',
        role: 'admin',
        asset_quota_gb: 100,
        created_ts: '2025-01-07T10:00:00Z'
      }
    ],
    '/brands': [
      {
        brand_id: 'brand-1',
        brand_name: 'Demo Brand',
        industry: 'Technology',
        description: 'A sample brand for testing',
        created_at: '2025-01-07T09:00:00Z',
        status: 'active',
        org_id: 'org-1'
      }
    ],
    '/creatives': [
      {
        creative_id: 'creative-1',
        brand_id: 'brand-1',
        filename: 'sample-video.mp4',
        status: 'completed',
        overall_status: 'pass',
        compliance_score: 92,
        upload_date: '2025-01-07',
        analysis_results: {
          tag_results: {
            logos_iconography: { status: 'pass', notes: 'Logo properly positioned' },
            colors_palette: { status: 'pass', notes: 'Colors match brand palette' },
            brand_vocabulary: { status: 'pass', notes: 'No banned terms found' },
            brand_tone: { status: 'warn', notes: 'Tone slightly casual' },
            disclaimers_required_language: { status: 'pass', notes: 'All disclaimers present' },
            layout_safe_zone: { status: 'pass', notes: 'Layout follows guidelines' },
            golden_set_similarity: { status: 'pass', notes: 'Good similarity to approved content' }
          }
        }
      }
    ]
  }
  
  // Simple endpoint matching
  const matchedEndpoint = Object.keys(mockResponse).find(key => endpoint.includes(key))
  const data = matchedEndpoint ? mockResponse[matchedEndpoint as keyof typeof mockResponse] : { message: 'Mock response' }
  
  return {
    ok: true,
    json: async () => data,
    status: 200
  } as Response
}