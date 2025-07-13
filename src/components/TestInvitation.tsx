'use client';

import { useAuth, useOrganization } from '@clerk/nextjs';
import { useState } from 'react';

export default function TestInvitation() {
  const { isLoaded: authLoaded, userId, getToken } = useAuth();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const [result, setResult] = useState<any>(null);
  
  const testInvitation = async () => {
    if (!organization) {
      setResult({ error: 'No organization selected' });
      return;
    }
    
    try {
      const token = await getToken();
      console.log('Token:', token);
      console.log('Organization:', organization);
      console.log('User ID:', userId);
      
      // Test direct Clerk API call from frontend to verify configuration
      const response = await fetch(
        `https://api.clerk.com/v1/organizations/${organization.id}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CLERK_SECRET_KEY || ''}`,
          }
        }
      );
      
      const orgData = await response.json();
      setResult({ 
        organization: orgData,
        error: response.ok ? null : 'Failed to fetch org data'
      });
    } catch (error) {
      setResult({ error: error.message });
    }
  };
  
  if (!authLoaded || !orgLoaded) return <div>Loading...</div>;
  
  return (
    <div className="p-8 bg-gray-900 text-white">
      <h2 className="text-2xl mb-4">Test Clerk Configuration</h2>
      
      <div className="mb-4 p-4 bg-gray-800 rounded">
        <p>User ID: {userId}</p>
        <p>Organization ID: {organization?.id}</p>
        <p>Organization Name: {organization?.name}</p>
      </div>
      
      <button
        onClick={testInvitation}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Test Organization API
      </button>
      
      {result && (
        <pre className="mt-4 p-4 bg-gray-800 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}