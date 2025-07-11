// Auth stubs to replace aws-amplify/auth imports
// These maintain the same API but now use Clerk for authentication
// This file provides backward compatibility for components that haven't been updated to use Clerk hooks yet

export const getCurrentUser = async () => {
  return {
    username: 'demo-user',
    userId: 'user-123',
    signInDetails: {
      loginId: 'demo@qalien.com'
    }
  }
}

export const signOut = async (options?: any) => {
  console.log('Mock signOut called')
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100))
  return true
}

export const signIn = async (username: string, password: string) => {
  console.log('Mock signIn called for:', username)
  await new Promise(resolve => setTimeout(resolve, 500))
  return {
    isSignedIn: true,
    nextStep: {
      signInStep: 'DONE'
    }
  }
}

export const signUp = async (username: string, password: string, options?: any) => {
  console.log('Mock signUp called for:', username)
  await new Promise(resolve => setTimeout(resolve, 500))
  return {
    isSignUpComplete: false,
    nextStep: {
      signUpStep: 'CONFIRM_SIGN_UP'
    }
  }
}

export const confirmSignUp = async (username: string, confirmationCode: string) => {
  console.log('Mock confirmSignUp called for:', username)
  await new Promise(resolve => setTimeout(resolve, 500))
  return {
    isSignUpComplete: true,
    nextStep: {
      signUpStep: 'DONE'
    }
  }
}

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
          email: 'demo@qalien.com',
          'cognito:groups': ['admin']
        },
        toString: () => 'mock-id-token'
      },
      accessToken: {
        payload: {
          sub: 'user-123',
          username: 'demo-user'
        },
        toString: () => 'mock-access-token'
      }
    }
  }
}

export const resetPassword = async (username: string) => {
  console.log('Mock resetPassword called for:', username)
  await new Promise(resolve => setTimeout(resolve, 500))
  return { 
    isPasswordReset: true,
    nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' }
  }
}

export const confirmResetPassword = async (params: { username: string, confirmationCode: string, newPassword: string }) => {
  console.log('Mock confirmResetPassword called for:', params.username)
  await new Promise(resolve => setTimeout(resolve, 500))
  return { success: true }
}