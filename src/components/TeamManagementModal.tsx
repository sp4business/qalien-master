'use client';

import { useState, useEffect } from 'react';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { usePendingInvitations } from '@/hooks/usePendingInvitations';
import { useAuth } from '@clerk/nextjs';
import { Clock, RefreshCw, XCircle, Mail } from 'lucide-react';

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
  const {
    members,
    isLoading,
    error: teamError,
    isAdmin,
    organization,
    sendInvitations,
    removeMember,
    updateMemberRole,
    inviteTeamLoading,
    refetch
  } = useTeamManagement();

  const { user } = useAuth();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'pending'>('members');
  
  // Pending invitations hook
  const { 
    pendingInvitations, 
    cancelInvitation, 
    resendInvitation, 
    hasPendingInvitation,
    getInvitationStatus,
    isCancelling,
    isResending 
  } = usePendingInvitations();
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('member');
      setError('');
      setSuccessMessage('');
    }
  }, [isOpen]);

  // Display team error if any
  useEffect(() => {
    if (teamError) {
      setError(teamError);
    }
  }, [teamError]);

  const sendInvitation = async () => {
    setError('');
    setSuccessMessage('');

    if (!inviteEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if user is already a member
    const existingMember = members.find(m => m.email.toLowerCase() === inviteEmail.toLowerCase());
    if (existingMember) {
      setError('This user is already a team member');
      return;
    }

    // Check for pending invitation
    const invitationStatus = getInvitationStatus(inviteEmail);
    if (invitationStatus?.isPending) {
      if (invitationStatus.isExpiringSoon) {
        setError(`Invitation already sent (expires in ${Math.round(invitationStatus.hoursUntilExpiration)} hours)`);
      } else {
        setError('An invitation is already pending for this email');
      }
      return;
    }

    try {
      setIsInviting(true);
      
      const result = await sendInvitations([
        {
          email: inviteEmail,
          role: inviteRole
        }
      ]);

      if (result.success) {
        setSuccessMessage(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setInviteRole('member');
        setShowInviteForm(false);
        
        // Refresh the member list after a short delay
        setTimeout(() => {
          refetch();
        }, 1000);
      } else if (result.errors && result.errors.length > 0) {
        setError(result.errors[0].error);
      }
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    // Don't allow removing yourself
    if (userId === user?.id) {
      setError("You cannot remove yourself from the organization");
      return;
    }

    if (!confirm(`Are you sure you want to remove ${email} from the organization?`)) return;

    try {
      setError('');
      await removeMember(userId);
      setSuccessMessage(`${email} has been removed from the organization`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message || 'Failed to remove team member');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'member', email: string) => {
    // Don't allow changing your own role
    if (userId === user?.id) {
      setError("You cannot change your own role");
      return;
    }

    try {
      setError('');
      await updateMemberRole(userId, newRole);
      setSuccessMessage(`${email}'s role has been updated to ${newRole}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err.message || 'Failed to update member role');
    }
  };

  if (!isOpen) return null;

  // Map Clerk roles to display roles
  const getRoleDisplay = (role: 'admin' | 'member') => {
    return role === 'admin' ? 'Admin' : 'Member';
  };

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
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                Team Management
                {pendingInvitations.length > 0 && (
                  <span className="ml-3 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                    {pendingInvitations.length} pending
                  </span>
                )}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                {organization?.name || brandName} Organization
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-[#1A1F2E] p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'members'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                activeTab === 'pending'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pending Invitations ({pendingInvitations.length})
            </button>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {successMessage}
            </div>
          )}
          
          {error && !showInviteForm && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-white">Loading team members...</div>
            </div>
          ) : (
            <>
              {/* Active Members Tab */}
              {activeTab === 'members' && (
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
                        onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                        className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#0F1117] text-white hover:border-gray-500"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    
                    {/* Note about organization-wide access */}
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-300 text-sm">
                        <strong>Note:</strong> Team members will have access to all brands within this organization.
                      </p>
                    </div>
                    
                    {error && showInviteForm && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                      </div>
                    )}
                    
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowInviteForm(false);
                          setInviteEmail('');
                          setInviteRole('member');
                          setError('');
                        }}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendInvitation}
                        disabled={isInviting || inviteTeamLoading}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white disabled:opacity-50 flex items-center space-x-2"
                      >
                        {isInviting || inviteTeamLoading ? (
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
                    <div key={member.id} className="bg-[#1A1F2E] rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                            {member.imageUrl ? (
                              <img 
                                src={member.imageUrl} 
                                alt={member.firstName || member.email}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-medium text-lg">
                                {member.firstName?.charAt(0) || member.email.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {member.firstName && member.lastName 
                                ? `${member.firstName} ${member.lastName}`
                                : member.email}
                            </p>
                            <p className="text-gray-400 text-sm">{member.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {isAdmin && member.userId !== user?.id ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateRole(member.userId, e.target.value as 'admin' | 'member', member.email)}
                              className="px-3 py-1 bg-gray-700 text-white rounded-lg text-sm border border-gray-600 hover:bg-gray-600"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                          ) : (
                            <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-sm">
                              {getRoleDisplay(member.role)}
                              {member.userId === user?.id && " (You)"}
                            </span>
                          )}
                          
                          {isAdmin && member.userId !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(member.userId, member.email)}
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
              )}

              {/* Pending Invitations Tab */}
              {activeTab === 'pending' && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Pending Invitations</h3>
                  </div>
                  
                  {pendingInvitations.length === 0 ? (
                    <div className="text-center py-12 bg-[#1A1F2E] rounded-xl border border-gray-700">
                      <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400">No pending invitations</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingInvitations.map((invitation) => {
                        const hoursLeft = Math.max(0, Math.round(invitation.hours_until_expiration));
                        const daysLeft = Math.floor(hoursLeft / 24);
                        const displayTime = daysLeft > 0 
                          ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                          : `${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}`;
                        
                        return (
                          <div key={invitation.id} className="bg-[#1A1F2E] rounded-xl p-4 border border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                                  <Mail className="w-6 h-6 text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-white font-medium">{invitation.email}</p>
                                  <p className="text-gray-400 text-sm">
                                    Role: {invitation.role} • Invited {new Date(invitation.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                {invitation.is_expiring_soon ? (
                                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Expires in {displayTime}
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">
                                    {displayTime} left
                                  </span>
                                )}
                                
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => resendInvitation({ 
                                        email: invitation.email, 
                                        role: invitation.role 
                                      })}
                                      disabled={isResending}
                                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors disabled:opacity-50"
                                      title="Resend invitation"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => cancelInvitation(invitation.id)}
                                      disabled={isCancelling}
                                      className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                                      title="Cancel invitation"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                      <li><strong>Admin:</strong> Full access to manage organization, brands, team, and creatives</li>
                      <li><strong>Member:</strong> Can create brands, upload and manage creatives, view reports</li>
                      <li><strong>Viewer:</strong> Can view creatives and reports only (coming soon)</li>
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