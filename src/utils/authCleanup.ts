/**
 * Utility to completely clear authentication state
 * This is used when we detect stale auth state that's causing login issues
 */

export const clearAllAuthState = async () => {
  // Clear all localStorage
  const localKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('CognitoIdentityServiceProvider') ||
      key.startsWith('amplify-') ||
      key.startsWith('aws-amplify') ||
      key.includes('cognito') ||
      key.includes('auth') ||
      key.includes('token')
    )) {
      localKeys.push(key);
    }
  }
  localKeys.forEach(key => localStorage.removeItem(key));

  // Clear all sessionStorage
  const sessionKeys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('CognitoIdentityServiceProvider') ||
      key.startsWith('amplify-') ||
      key.startsWith('aws-amplify') ||
      key.includes('cognito') ||
      key.includes('auth') ||
      key.includes('token')
    )) {
      sessionKeys.push(key);
    }
  }
  sessionKeys.forEach(key => sessionStorage.removeItem(key));

  // Clear specific known Amplify keys
  const knownKeys = [
    'amplify-authenticator-authState',
    'amplify-auto-sign-in',
    'aws-amplify-federatedInfo',
    'aws-amplify-cache',
    'aws-amplify-analytics-cache',
    'aws-amplify-auth-currentUser'
  ];
  
  knownKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  console.log('All auth state cleared');
};

export const clearAuthCookies = () => {
  // Clear auth cookies by setting them to expire
  document.cookie.split(";").forEach((c) => {
    const cookieName = c.split("=")[0].trim();
    if (cookieName.includes('CognitoIdentityServiceProvider') ||
        cookieName.includes('amplify') ||
        cookieName.includes('cognito') ||
        cookieName.includes('auth')) {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
  
  console.log('Auth cookies cleared');
};