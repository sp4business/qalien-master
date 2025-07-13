'use client';

import { useState } from 'react';

export interface TeamMember {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  id: string;
}

interface ModernInviteTeamStepProps {
  brandName?: string;
  pendingInvites: TeamMember[];
  setPendingInvites: (invites: TeamMember[]) => void;
}

export default function ModernInviteTeamStep({ pendingInvites, setPendingInvites }: ModernInviteTeamStepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const addInvite = () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (pendingInvites.some(member => member.email.toLowerCase() === email.toLowerCase())) {
      setError('This email has already been added to the invite list');
      return;
    }

    const newMember: TeamMember = {
      email,
      role,
      id: `temp-${Date.now()}`
    };

    setPendingInvites([...pendingInvites, newMember]);
    setEmail('');
    setRole('editor');
  };

  const removeInvite = (id: string) => {
    setPendingInvites(pendingInvites.filter(member => member.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInvite();
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to manage brand, team, and creatives';
      case 'editor':
        return 'Can upload and manage creatives, view reports';
      case 'viewer':
        return 'Can view creatives and reports only';
      default:
        return '';
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
        <p className="text-gray-400">Build your invite list. Invitations will be sent after brand creation.</p>
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
              onChange={(e) => setRole(e.target.value as 'admin' | 'editor' | 'viewer')}
              className="w-full px-4 py-3 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-[#1A1F2E] text-white hover:border-gray-500"
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>

        {/* Role description */}
        <div className="mb-6 p-3 bg-[#1A1F2E] rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            <span className="font-medium text-gray-300">{role.charAt(0).toUpperCase() + role.slice(1)}:</span> {getRoleDescription(role)}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={addInvite}
          disabled={!email.trim()}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:from-purple-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Add to Invite List</span>
        </button>
      </div>

      {pendingInvites.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-lg font-semibold">Pending Invitations ({pendingInvites.length})</h3>
            </div>
            <p className="text-sm text-gray-400">Invitations will be sent after brand creation</p>
          </div>

          <div className="space-y-3">
            {pendingInvites.map((member) => (
              <div
                key={member.id}
                className="bg-[#2A3142] rounded-xl p-4 border border-gray-700 flex items-center justify-between group hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium">
                      {member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{member.email}</p>
                    <p className="text-gray-400 text-sm capitalize">
                      {member.role} • Organization-wide access
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeInvite(member.id)}
                  className="text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove from invite list"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
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
            <p className="text-blue-300 font-medium text-sm mb-1">About Team Invitations</p>
            <p className="text-blue-400/80 text-sm mb-2">
              Team members will receive email invitations to join your organization after the brand is created. 
              They&apos;ll be able to access all brands within your organization based on their assigned role.
            </p>
            <ul className="text-blue-400/80 text-sm space-y-1">
              <li><strong className="text-blue-300">Admin:</strong> Full access to manage brands, teams, and all settings</li>
              <li><strong className="text-blue-300">Editor:</strong> Can create and manage campaigns and creatives</li>
              <li><strong className="text-blue-300">Viewer:</strong> Read-only access to view reports and analytics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}