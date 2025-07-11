import { signOut } from '../lib/auth-stubs';

export async function completeLogout() {
  try {
    // Sign out from Amplify/Cognito
    await signOut({ global: true });
    
    // Clear all local storage
    localStorage.clear();
    
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear specific Amplify keys that might persist
    const amplifyKeys = [
      'amplify-authenticator-authState',
      'amplify-auto-sign-in',
      'CognitoIdentityServiceProvider',
      'aws-amplify-federatedInfo',
      'aws-amplify-cache',
    ];
    
    amplifyKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Clear any keys that start with common Amplify prefixes
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('CognitoIdentityServiceProvider') || 
          key.startsWith('amplify-') || 
          key.startsWith('aws-amplify')) {
        localStorage.removeItem(key);
      }
    });
    
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('CognitoIdentityServiceProvider') || 
          key.startsWith('amplify-') || 
          key.startsWith('aws-amplify')) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('Complete logout successful');
    
    // Reload the page to ensure clean state
    window.location.reload();
    
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Force clear storage even if signOut fails
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
}

export async function checkAuthState() {
  try {
    const { getCurrentUser } = await import('../lib/auth-stubs');
    const user = await getCurrentUser();
    return !!user;
  } catch (error) {
    return false;
  }
}