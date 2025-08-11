import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '@/lib/supabase';
import { useOrganization } from '@clerk/nextjs';
import { useEffect } from 'react';

interface PendingInvitation {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  invited_by_clerk_id: string;
  created_at: string;
  expires_at: string;
  is_expiring_soon: boolean;
  hours_until_expiration: number;
}

export function usePendingInvitations() {
  const supabase = useSupabaseClient();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  // Query for pending invitations
  const { data: pendingInvitations = [], isLoading, error, refetch } = useQuery<PendingInvitation[]>({
    queryKey: ['pending-invitations', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .rpc('get_pending_invitations', { p_org_id: organization.id });

      if (error) {
        console.error('Error fetching pending invitations:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!organization?.id,
    refetchInterval: 60000, // Refresh every minute to update expiration times
  });

  // Set up real-time subscription for invitation changes
  useEffect(() => {
    if (!organization?.id) return;

    const channel = supabase
      .channel(`invitations-${organization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_invitations',
          filter: `clerk_org_id=eq.${organization.id}`,
        },
        () => {
          // Refetch when any invitation changes
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organization?.id, supabase, refetch]);

  // Mutation to cancel an invitation
  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('team_invitations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .eq('clerk_org_id', organization?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations', organization?.id] });
    },
  });

  // Mutation to resend an invitation (for expired ones)
  const resendInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      // This will be handled by the updated Edge Function
      const { data, error } = await supabase.functions.invoke('invite-team-members', {
        body: {
          organizationId: organization?.id,
          organizationName: organization?.name,
          invitations: [{ email, role }],
          isResend: true, // Flag to indicate this is a resend
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations', organization?.id] });
    },
  });

  // Check if an email has a pending invitation
  const hasPendingInvitation = (email: string): boolean => {
    return pendingInvitations.some(
      inv => inv.email.toLowerCase() === email.toLowerCase()
    );
  };

  // Get invitation status for an email
  const getInvitationStatus = (email: string) => {
    const invitation = pendingInvitations.find(
      inv => inv.email.toLowerCase() === email.toLowerCase()
    );
    
    if (!invitation) return null;

    return {
      isPending: true,
      isExpiringSoon: invitation.is_expiring_soon,
      hoursUntilExpiration: invitation.hours_until_expiration,
      expiresAt: invitation.expires_at,
    };
  };

  return {
    pendingInvitations,
    isLoading,
    error,
    refetch,
    cancelInvitation: cancelInvitation.mutate,
    resendInvitation: resendInvitation.mutate,
    isCancelling: cancelInvitation.isPending,
    isResending: resendInvitation.isPending,
    hasPendingInvitation,
    getInvitationStatus,
  };
}