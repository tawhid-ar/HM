import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { RequestStatus } from '../../types/database.types';

interface MyModeratorRequestRow {
  id: string;
  candidate_email: string;
  candidate_name: string | null;
  reason: string | null;
  status: RequestStatus;
  created_at: string;
}

export function useMyModeratorRequests() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['my-moderator-requests', profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moderator_requests')
        .select('id, candidate_email, candidate_name, reason, status, created_at')
        .eq('requested_by', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MyModeratorRequestRow[];
    },
  });
}
