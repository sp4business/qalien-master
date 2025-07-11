'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, fetchAuthSession, signOut } from '../lib/auth-stubs';

export default function AuthDebugger() {
  const [authState, setAuthState] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const checkAuthState = async () => {
    setLoading(true);
    const state: any = {
      timestamp: new Date().toISOString(),
      localStorage: {},
      sessionStorage: {},
      user: null,
      session: null,
      error: null
    };

    try {
      // Check current user
      try {
        const user = await getCurrentUser();
        state.user = {
          username: user.username,
          userId: user.userId,
          signInDetails: user.signInDetails
        };
      } catch (userError: any) {
        state.userError = userError.message;
      }

      // Check auth session
      try {
        const session = await fetchAuthSession();
        state.session = {
          tokens: !!session.tokens,
          credentials: !!session.credentials,
          identityId: session.identityId,
          userSub: session.userSub
        };
        
        if (session.tokens) {
          state.tokenDetails = {
            accessToken: !!session.tokens.accessToken,
            idToken: !!session.tokens.idToken,
            refreshToken: !!session.tokens.refreshToken
          };
        }
      } catch (sessionError: any) {
        state.sessionError = sessionError.message;
      }

      // Check localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.includes('amplify') || key.includes('Cognito') || key.includes('aws')) {
          state.localStorage[key] = localStorage.getItem(key)?.substring(0, 100) + '...';
        }
      });

      // Check sessionStorage  
      Object.keys(sessionStorage).forEach(key => {
        if (key.includes('amplify') || key.includes('Cognito') || key.includes('aws')) {
          state.sessionStorage[key] = sessionStorage.getItem(key)?.substring(0, 100) + '...';
        }
      });

    } catch (error: any) {
      state.error = error.message;
    }

    setAuthState(state);
    setLoading(false);
  };

  const forceSignOut = async () => {
    try {
      await signOut({ global: true });
      console.log('SignOut completed');
    } catch (error) {
      console.error('SignOut error:', error);
    }
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Re-check state
    setTimeout(() => {
      checkAuthState();
    }, 1000);
  };

  const nuclearOption = () => {
    // Clear everything possible
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach((c) => {
      const eqPos = c.indexOf("=");
      const name = eqPos > -1 ? c.substr(0, eqPos) : c;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
    });
    
    // Clear IndexedDB
    if ('indexedDB' in window) {
      indexedDB.deleteDatabase('amplify-datastore');
      indexedDB.deleteDatabase('amplify');
    }
    
    alert('Nuclear option executed. Page will reload in 2 seconds.');
    setTimeout(() => {
      window.location.href = window.location.origin;
    }, 2000);
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Auth Debugger</h3>
        <button
          onClick={checkAuthState}
          className="bg-blue-600 px-2 py-1 rounded text-xs"
          disabled={loading}
        >
          {loading ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>User:</strong> {authState.user ? '✅ Logged In' : '❌ Not Logged In'}
          {authState.userError && <div className="text-red-400">Error: {authState.userError}</div>}
        </div>
        
        <div>
          <strong>Session:</strong> {authState.session ? '✅ Active' : '❌ None'}
          {authState.sessionError && <div className="text-red-400">Error: {authState.sessionError}</div>}
        </div>
        
        <div>
          <strong>Tokens:</strong> {authState.tokenDetails ? JSON.stringify(authState.tokenDetails) : 'None'}
        </div>
        
        <div>
          <strong>LocalStorage Keys:</strong>
          <div className="pl-2 text-gray-300">
            {Object.keys(authState.localStorage || {}).length === 0 ? 'None' : 
             Object.keys(authState.localStorage || {}).join(', ')}
          </div>
        </div>
        
        <div>
          <strong>SessionStorage Keys:</strong>
          <div className="pl-2 text-gray-300">
            {Object.keys(authState.sessionStorage || {}).length === 0 ? 'None' : 
             Object.keys(authState.sessionStorage || {}).join(', ')}
          </div>
        </div>
      </div>
      
      <div className="mt-4 space-y-2">
        <button
          onClick={forceSignOut}
          className="w-full bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded text-xs"
        >
          🔄 Force SignOut
        </button>
        
        <button
          onClick={nuclearOption}
          className="w-full bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-xs"
        >
          💥 Nuclear Option
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-400">
        Last checked: {authState.timestamp}
      </div>
    </div>
  );
}