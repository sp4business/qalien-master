// AWS Configuration - STUBBED OUT FOR MODERN STACK MIGRATION
// This file maintains the same exports but with mock implementations

import { API_ENDPOINT, fetchWithAuth } from './lib/aws-stubs'

// Export the mock API endpoint for compatibility
export { API_ENDPOINT }

// Mock Amplify configure - does nothing
export const Amplify = {
  configure: (config: any) => {
    console.log('Mock Amplify.configure called - AWS dependencies removed')
  }
}

// Export mock for any components that import this file
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'mock-pool',
      userPoolClientId: 'mock-client',
      region: 'us-east-1',
    },
  },
  API: {
    REST: {
      QAlienAPI: {
        endpoint: API_ENDPOINT,
        region: 'us-east-1',
      },
    },
  },
}

export default amplifyConfig