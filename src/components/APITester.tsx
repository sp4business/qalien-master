'use client';

import { useState } from 'react';
import { fetchAuthSession } from '../lib/auth-stubs';
// import { get } from 'aws-amplify/api'; // Removed AWS dependency

export default function APITester() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const testHealthEndpoint = async () => {
    setLoading('health');
    try {
      const response = await fetch('https://6wfvvuvm25.execute-api.us-east-1.amazonaws.com/dev/health');
      const data = await response.text();
      setResults((prev: any) => ({ ...prev, health: { status: response.status, data } }));
    } catch (error) {
      setResults((prev: any) => ({ ...prev, health: { error: error.message } }));
    } finally {
      setLoading(null);
    }
  };

  const testAuthenticatedEndpoint = async () => {
    setLoading('auth');
    try {
      // Get the current session and token
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Test an authenticated endpoint (brand endpoint with fake ID)
      const response = await fetch('https://6wfvvuvm25.execute-api.us-east-1.amazonaws.com/dev/brand/test-brand-id', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.text();
      setResults((prev: any) => ({ 
        ...prev, 
        auth: { 
          status: response.status, 
          data,
          tokenPreview: `${token.slice(0, 50)}...` 
        } 
      }));
    } catch (error) {
      setResults((prev: any) => ({ ...prev, auth: { error: error.message } }));
    } finally {
      setLoading(null);
    }
  };

  const getUserInfo = async () => {
    setLoading('user');
    try {
      const session = await fetchAuthSession();
      const userInfo = {
        tokens: {
          accessToken: session.tokens?.accessToken ? '✅ Present' : '❌ Missing',
          idToken: session.tokens?.idToken ? '✅ Present' : '❌ Missing',
        },
        credentials: session.credentials ? '✅ Present' : '❌ Missing',
        userSub: session.userSub || 'Not available',
      };
      setResults((prev: any) => ({ ...prev, user: userInfo }));
    } catch (error) {
      setResults((prev: any) => ({ ...prev, user: { error: error.message } }));
    } finally {
      setLoading(null);
    }
  };

  const testBrandOnboarding = async () => {
    setLoading('brand');
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Test brand onboarding with sample data
      const sampleBrand = {
        brand_name: 'Test Brand',
        industry: 'Technology',
        description: 'A test brand for QAlien development',
        website: 'https://testbrand.com'
      };

      const response = await fetch('https://6wfvvuvm25.execute-api.us-east-1.amazonaws.com/dev/brand/onboard', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sampleBrand)
      });
      
      const data = await response.json();
      setResults((prev: any) => ({ 
        ...prev, 
        brand: { 
          status: response.status, 
          data,
          request: sampleBrand
        } 
      }));
    } catch (error) {
      setResults((prev: any) => ({ ...prev, brand: { error: error.message } }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={testHealthEndpoint}
          disabled={loading === 'health'}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading === 'health' ? 'Testing...' : 'Test Health Endpoint'}
        </button>
        
        <button
          onClick={testAuthenticatedEndpoint}
          disabled={loading === 'auth'}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading === 'auth' ? 'Testing...' : 'Test Auth Endpoint'}
        </button>
        
        <button
          onClick={testBrandOnboarding}
          disabled={loading === 'brand'}
          className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
        >
          {loading === 'brand' ? 'Testing...' : 'Test Brand Onboarding'}
        </button>
        
        <button
          onClick={getUserInfo}
          disabled={loading === 'user'}
          className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {loading === 'user' ? 'Getting...' : 'Get User Info'}
        </button>
      </div>

      {/* Results Display */}
      <div className="space-y-4">
        {Object.entries(results).map(([key, result]) => (
          <div key={key} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2 capitalize">{key} Test Result</h3>
            <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}