export async function completeLogout() {
  try {
    // Clear all local storage
    localStorage.clear();
    
    // Clear all session storage
    sessionStorage.clear();
    
    console.log('Complete logout successful');
    
    // Reload the page to ensure clean state
    window.location.reload();
    
  } catch (error) {
    console.error('Error during logout:', error);
    
    // Force clear storage even if logout fails
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  }
}

export async function checkAuthState() {
  // This function is no longer needed with Clerk auth
  // Clerk handles auth state internally
  return false;
}