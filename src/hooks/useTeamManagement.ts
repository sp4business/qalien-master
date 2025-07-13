import { useOrganization, useOrganizationList } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { useInviteTeam } from './useInviteTeam';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  imageUrl?: string;
}

export function useTeamManagement() {
  const { organization, membership } = useOrganization({
    memberships: {
      pageSize: 50,
    },
  });
  const { setActive } = useOrganizationList();
  const inviteTeam = useInviteTeam();
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization members
  useEffect(() => {
    if (!organization) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get organization memberships
        const memberships = await organization.getMemberships({
          limit: 50,
        });

        const teamMembers: TeamMember[] = memberships.data.map((membership) => ({
          id: membership.id,
          userId: membership.publicUserData.userId,
          email: membership.publicUserData.identifier || '',
          firstName: membership.publicUserData.firstName || undefined,
          lastName: membership.publicUserData.lastName || undefined,
          role: membership.role === 'org:admin' ? 'admin' : 'member',
          joinedAt: new Date(membership.createdAt),
          imageUrl: membership.publicUserData.imageUrl || undefined,
        }));

        setMembers(teamMembers);
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [organization]);

  // Send invitations
  const sendInvitations = async (invitations: Array<{ email: string; role: 'admin' | 'member' | 'viewer' }>) => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    // Map roles to include viewer
    const mappedInvitations = invitations.map(inv => ({
      email: inv.email,
      role: inv.role as 'admin' | 'editor' | 'viewer',
    }));

    const result = await inviteTeam.mutateAsync({
      organizationId: organization.id,
      organizationName: organization.name,
      invitations: mappedInvitations,
    });

    return result;
  };

  // Remove a member from the organization
  const removeMember = async (userId: string) => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    try {
      // Find the membership to remove
      const memberships = await organization.getMemberships();
      const membershipToRemove = memberships.data.find(
        (m) => m.publicUserData.userId === userId
      );

      if (!membershipToRemove) {
        throw new Error('Member not found');
      }

      // Remove the membership
      await membershipToRemove.destroy();

      // Update local state
      setMembers((prev) => prev.filter((m) => m.userId !== userId));

      return { success: true };
    } catch (err) {
      console.error('Error removing member:', err);
      throw new Error('Failed to remove member');
    }
  };

  // Update a member's role
  const updateMemberRole = async (userId: string, newRole: 'admin' | 'member') => {
    if (!organization) {
      throw new Error('No organization selected');
    }

    try {
      // Find the membership to update
      const memberships = await organization.getMemberships();
      const membershipToUpdate = memberships.data.find(
        (m) => m.publicUserData.userId === userId
      );

      if (!membershipToUpdate) {
        throw new Error('Member not found');
      }

      // Update the role
      const clerkRole = newRole === 'admin' ? 'org:admin' : 'org:member';
      await membershipToUpdate.update({ role: clerkRole });

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId ? { ...m, role: newRole } : m
        )
      );

      return { success: true };
    } catch (err) {
      console.error('Error updating member role:', err);
      throw new Error('Failed to update member role');
    }
  };

  // Check if current user is an admin
  const isAdmin = membership?.role === 'org:admin';

  return {
    members,
    isLoading,
    error,
    isAdmin,
    organization,
    sendInvitations,
    removeMember,
    updateMemberRole,
    inviteTeamLoading: inviteTeam.isPending,
    refetch: () => {
      // Trigger a re-fetch by updating the organization
      if (organization) {
        setActive({ organization: organization.id });
      }
    },
  };
}