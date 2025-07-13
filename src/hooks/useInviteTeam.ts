import { useMutation } from '@tanstack/react-query';
import { useSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@clerk/nextjs';

interface InviteTeamParams {
  organizationId: string;
  organizationName?: string;
  invitations: Array<{
    email: string;
    role: 'admin' | 'editor' | 'viewer';
  }>;
}

interface InviteTeamResponse {
  success: boolean;
  results: Array<{
    email: string;
    status: string;
    invitationId?: string;
  }>;
  errors: Array<{
    email: string;
    error: string;
  }>;
  message: string;
}

export function useInviteTeam() {
  const supabase = useSupabaseClient();
  const { getToken } = useAuth();

  return useMutation<InviteTeamResponse, Error, InviteTeamParams>({
    mutationFn: async ({ organizationId, organizationName, invitations }) => {
      // Get the Clerk session token
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Call the edge function
      // We need to pass the Clerk token in a custom header since Supabase
      // intercepts the Authorization header
      const { data, error } = await supabase.functions.invoke<InviteTeamResponse>(
        'invite-team-members',
        {
          body: { 
            organizationId, 
            organizationName,
            invitations,
            clerkToken: token // Pass token in body as fallback
          },
          headers: {
            'x-clerk-token': token, // Custom header for Clerk token
          },
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to send invitations');
      }

      if (!data) {
        throw new Error('No response from invitation service');
      }

      // Check if all invitations failed
      if (data.errors && data.errors.length === invitations.length) {
        throw new Error(data.errors[0].error || 'Failed to send invitations');
      }

      return data;
    },
    onError: (error) => {
      console.error('Failed to send invitations:', error);
    },
  });
}