'use client';

import { useState } from 'react';
import { fetchAuthSession } from '../lib/auth-stubs';
import { API_ENDPOINT } from '../aws-config';

interface TeamMember {
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  scope?: 'brand' | 'organization';
  status: 'pending' | 'sent';
  id: string;
}

interface InviteTeamStepProps {
  brandId?: string;
  brandName?: string;
  onInvitesComplete?: () => void;
}

export default function InviteTeamStep({ brandId, brandName, onInvitesComplete }: InviteTeamStepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [scope, setScope] = useState<'brand' | 'organization'>('brand');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const addCollaborator = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (teamMembers.some(member => member.email.toLowerCase() === email.toLowerCase())) {
      setError('This email has already been invited');
      return;
    }

    const newMember: TeamMember = {
      email,
      role,
      scope,
      status: 'pending',
      id: `temp-${Date.now()}`
    };

    setTeamMembers([...teamMembers, newMember]);

    // If brandId is provided, send invitation immediately
    if (brandId) {
      await sendInvitation(newMember);
    }

    setEmail('');
    setRole('Editor');
  };

  const sendInvitation = async (member: TeamMember) => {
    try {
      setIsInviting(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_ENDPOINT}/brands/${brandId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: member.email,
          role: member.role,
          scope: member.scope || 'brand'
        })
      });

      if (response.ok) {
        setTeamMembers(prev => 
          prev.map(m => m.id === member.id ? { ...m, status: 'sent' } : m)
        );
      } else {
        const errorData = await response.json();
        const apiError = errorData.error?.message || errorData.message || 'Failed to send invitation';
        
        // Provide specific error messages based on API response
        let userFriendlyMessage = apiError;
        if (apiError.includes('already a team member')) {
          userFriendlyMessage = `${member.email} is already a team member`;
        } else if (apiError.includes('pending invitation')) {
          userFriendlyMessage = `${member.email} already has a pending invitation`;
        } else if (apiError.includes('admin')) {
          userFriendlyMessage = 'You need admin permissions to invite team members';
        } else if (apiError.includes('not found')) {
          userFriendlyMessage = 'Brand not found. Please refresh and try again.';
        }
        
        throw new Error(userFriendlyMessage);
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      setError(error.message);
      setTeamMembers(prev => prev.filter(m => m.id !== member.id));
    } finally {
      setIsInviting(false);
    }
  };

  const removeMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCollaborator();
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Invite Your Team</h2>
        <p className="text-gray-400">Invite collaborators from your organization to work together on {brandName || 'your brand'} assets.</p>
      </div>

      <div className="bg-[#2A3142] rounded-2xl p-8 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="colleague@company.com"
              className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white placeholder-gray-500 hover:border-gray-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'Admin' | 'Editor' | 'Viewer')}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white hover:border-gray-500"
            >
              <option value="Editor">Editor</option>
              <option value="Admin">Admin</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
        </div>

        {/* Scope selector - only show when in brand context */}
        {brandId && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Access Level
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                scope === 'brand' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'
              }`}>
                <input
                  type="radio"
                  name="scope"
                  value="brand"
                  checked={scope === 'brand'}
                  onChange={(e) => setScope('brand')}
                  className="sr-only"
                />
                <div className="flex items-start space-x-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    scope === 'brand' ? 'border-purple-500' : 'border-gray-500'
                  }`}>
                    {scope === 'brand' && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                  </div>
                  <div>
                    <p className="font-medium text-white">This Brand Only</p>
                    <p className="text-sm text-gray-400 mt-1">Access limited to {brandName}</p>
                  </div>
                </div>
              </label>

              <label className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                scope === 'organization' ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'
              }`}>
                <input
                  type="radio"
                  name="scope"
                  value="organization"
                  checked={scope === 'organization'}
                  onChange={(e) => setScope('organization')}
                  className="sr-only"
                />
                <div className="flex items-start space-x-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${
                    scope === 'organization' ? 'border-purple-500' : 'border-gray-500'
                  }`}>
                    {scope === 'organization' && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                  </div>
                  <div>
                    <p className="font-medium text-white">Entire Organization</p>
                    <p className="text-sm text-gray-400 mt-1">Access to all brands in the organization</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              {error.includes('Network error') && (
                <button
                  onClick={() => setError('')}
                  className="ml-2 px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        <button
          onClick={addCollaborator}
          disabled={isInviting || !email.trim()}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          {isInviting ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sending Invite...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span>Add Collaborator</span>
            </>
          )}
        </button>
      </div>

      {teamMembers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <h3 className="text-lg font-semibold">Team Members ({teamMembers.length})</h3>
          </div>

          <div className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="bg-[#2A3142] rounded-xl p-4 border border-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.email}</p>
                    <p className="text-gray-400 text-sm">
                      {member.role} • {member.scope === 'organization' ? 'Organization-wide' : 'Brand only'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {member.status === 'sent' && (
                    <span className="text-green-400 text-sm flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>Invited</span>
                    </span>
                  )}
                  <button
                    onClick={() => removeMember(member.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-blue-300 font-medium text-sm mb-1">About Team Roles</p>
            <ul className="text-blue-400/80 text-sm space-y-1">
              <li><strong>Admin:</strong> Full access to manage brand, team, and creatives</li>
              <li><strong>Editor:</strong> Can upload and manage creatives, view reports</li>
              <li><strong>Viewer:</strong> Can view creatives and reports only</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}