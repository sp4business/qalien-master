'use client';

import { useState, useEffect } from 'react';
import { fetchAuthSession } from '../lib/auth-stubs';
import { API_ENDPOINT } from '../aws-config';

interface TeamMember {
  user_id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  status: 'active' | 'pending';
  invited_at: string;
  accepted_at?: string;
}

interface PendingInvitation {
  invitation_id: string;
  invited_email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  invited_by: string;
  invited_at: string;
  expires_at: string;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  brandName: string;
  currentUserRole?: 'Admin' | 'Editor' | 'Viewer';
}

export default function TeamManagementModal({ 
  isOpen, 
  onClose, 
  brandId, 
  brandName,
  currentUserRole = 'Admin'
}: TeamManagementModalProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [inviteScope, setInviteScope] = useState<'brand' | 'organization'>('brand');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen, brandId]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_ENDPOINT}/brands/${brandId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setPendingInvitations(data.pending_invitations || []);
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || errorData.message || 'Failed to load team members';
        setError(`Unable to load team: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      setError('Network error: Unable to connect to server. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvitation = async () => {
    setError('');

    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }

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
          email: inviteEmail,
          role: inviteRole,
          scope: inviteScope
        })
      });

      if (response.ok) {
        setInviteEmail('');
        setInviteRole('Editor');
        setInviteScope('brand');
        setShowInviteForm(false);
        await fetchTeamMembers();
      } else {
        const errorData = await response.json();
        const apiError = errorData.error?.message || errorData.message || 'Failed to send invitation';
        
        // Provide specific error messages
        let userFriendlyMessage = apiError;
        if (apiError.includes('already a team member')) {
          userFriendlyMessage = 'This user is already a team member';
        } else if (apiError.includes('pending invitation')) {
          userFriendlyMessage = 'This user already has a pending invitation';
        } else if (apiError.includes('admin')) {
          userFriendlyMessage = 'Only admins can invite team members';
        }
        
        throw new Error(userFriendlyMessage);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_ENDPOINT}/brands/${brandId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchTeamMembers();
      }
    } catch (error: any) {
      console.error('Error removing team member:', error);
      setError('Failed to remove team member. Please try again.');
    }
  };

  const updateMemberRole = async (userId: string, newRole: 'Admin' | 'Editor' | 'Viewer') => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_ENDPOINT}/brands/${brandId}/members/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        await fetchTeamMembers();
      }
    } catch (error: any) {
      console.error('Error updating member role:', error);
      setError('Failed to update member role. Please try again.');
    }
  };

  const isAdmin = currentUserRole === 'Admin';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-[#2A3142] border border-gray-700 rounded-2xl p-8 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Team Management - {brandName}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-white">Loading team members...</div>
            </div>
          ) : (
            <>
              {/* Active Members */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Team Members ({members.length})</h3>
                  {isAdmin && !showInviteForm && (
                    <button
                      onClick={() => setShowInviteForm(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                  <div className="bg-[#1A1F2E] rounded-xl p-6 mb-6 border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="md:col-span-2">
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="colleague@company.com"
                          className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#0F1117] text-white placeholder-gray-500 hover:border-gray-500"
                        />
                      </div>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'Admin' | 'Editor' | 'Viewer')}
                        className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#0F1117] text-white hover:border-gray-500"
                      >
                        <option value="Editor">Editor</option>
                        <option value="Admin">Admin</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </div>
                    
                    {/* Scope selector */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-2">Access Level</label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            value="brand"
                            checked={inviteScope === 'brand'}
                            onChange={(e) => setInviteScope('brand')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-white">This brand only</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            value="organization"
                            checked={inviteScope === 'organization'}
                            onChange={(e) => setInviteScope('organization')}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-white">Entire organization</span>
                        </label>
                      </div>
                    </div>
                    
                    {error && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowInviteForm(false);
                          setInviteEmail('');
                          setInviteScope('brand');
                          setError('');
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendInvitation}
                        disabled={isInviting}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isInviting ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Sending...</span>
                          </>
                        ) : (
                          <span>Send Invitation</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Member List */}
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.user_id} className="bg-[#1A1F2E] rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-lg">
                              {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{member.name || member.email}</p>
                            <p className="text-gray-400 text-sm">{member.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {isAdmin ? (
                            <select
                              value={member.role}
                              onChange={(e) => updateMemberRole(member.user_id, e.target.value as 'Admin' | 'Editor' | 'Viewer')}
                              className="px-3 py-1 bg-gray-700 text-white rounded-lg text-sm border border-gray-600 hover:bg-gray-600"
                            >
                              <option value="Admin">Admin</option>
                              <option value="Editor">Editor</option>
                              <option value="Viewer">Viewer</option>
                            </select>
                          ) : (
                            <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm">
                              {member.role}
                            </span>
                          )}
                          
                          {isAdmin && (
                            <button
                              onClick={() => removeMember(member.user_id)}
                              className="text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Pending Invitations ({pendingInvitations.length})</h3>
                  <div className="space-y-3">
                    {pendingInvitations.map((invitation) => (
                      <div key={invitation.invitation_id} className="bg-[#1A1F2E] rounded-xl p-4 border border-gray-700 opacity-75">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-gray-300">{invitation.invited_email}</p>
                              <p className="text-gray-500 text-sm">
                                Invited by {invitation.invited_by} • {invitation.role}
                              </p>
                            </div>
                          </div>
                          <span className="text-yellow-400 text-sm">Pending</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Role Information */}
              <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="text-blue-300 font-medium text-sm mb-1">Role Permissions</p>
                    <ul className="text-blue-400/80 text-sm space-y-1">
                      <li><strong>Admin:</strong> Full access to manage brand, team, and creatives</li>
                      <li><strong>Editor:</strong> Can upload and manage creatives, view reports</li>
                      <li><strong>Viewer:</strong> Can view creatives and reports only</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}