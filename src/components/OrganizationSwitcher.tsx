'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession } from '../lib/auth-stubs';

interface Organization {
  org_id: string;
  org_name: string;
  industry: string;
  role: string;
  asset_quota_gb: number;
  created_ts: string;
}

interface OrganizationSwitcherProps {
  currentOrgId?: string;
  onOrganizationChange?: (orgId: string, organization: Organization) => void;
  className?: string;
}

export default function OrganizationSwitcher({ 
  currentOrgId, 
  onOrganizationChange,
  className = "" 
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(currentOrgId || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch user's organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch('https://6wfvvuvm25.execute-api.us-east-1.amazonaws.com/dev/organizations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.status}`);
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
      
      // Set default organization if none selected
      if (!selectedOrgId && data.organizations.length > 0) {
        setSelectedOrgId(data.organizations[0].org_id);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError(error instanceof Error ? error.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationSwitch = async (orgId: string) => {
    if (orgId === selectedOrgId || isSwitching) return;

    try {
      setIsSwitching(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`https://6wfvvuvm25.execute-api.us-east-1.amazonaws.com/dev/organizations/${orgId}/switch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to switch organization: ${response.status}`);
      }

      const data = await response.json();
      setSelectedOrgId(orgId);
      
      // Find the selected organization details
      const selectedOrg = organizations.find(org => org.org_id === orgId);
      if (selectedOrg && onOrganizationChange) {
        onOrganizationChange(orgId, selectedOrg);
      }

      console.log('Organization switched successfully:', data);
    } catch (error) {
      console.error('Error switching organization:', error);
      setError(error instanceof Error ? error.message : 'Failed to switch organization');
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-5 h-5 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin"></div>
        <span className="text-slate-600 text-sm">Loading organizations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-rose-600 text-sm ${className}`}>
        <span>Error: {error}</span>
        <button 
          onClick={fetchOrganizations}
          className="ml-2 text-violet-600 hover:text-violet-700 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className={`text-slate-600 text-sm ${className}`}>
        No organizations available
      </div>
    );
  }

  const selectedOrg = organizations.find(org => org.org_id === selectedOrgId);

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Active Organization
      </label>
      
      <div className="relative">
        <select
          value={selectedOrgId}
          onChange={(e) => handleOrganizationSwitch(e.target.value)}
          disabled={isSwitching}
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none"
        >
          {organizations.map((org) => (
            <option key={org.org_id} value={org.org_id}>
              {org.org_name} ({org.role})
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isSwitching ? (
            <div className="w-4 h-4 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {selectedOrg && (
        <div className="mt-3 p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Industry:</span>
              <span className="font-medium">{selectedOrg.industry}</span>
            </div>
            <div className="flex justify-between">
              <span>Your Role:</span>
              <span className="font-medium text-violet-600">{selectedOrg.role}</span>
            </div>
            <div className="flex justify-between">
              <span>Storage Quota:</span>
              <span className="font-medium">{selectedOrg.asset_quota_gb}GB</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}