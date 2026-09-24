import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { RequestStatus } from '../../types/database.types';

export interface ModeratorRequestRow {
  id: string;
  requested_by: string;
  candidate_email: string;
  candidate_name: string | null;
  reason: string | null;
  status: RequestStatus;
  created_at: string;
  requester?: { full_name: string } | null;
}

export function useModeratorRequests(status: RequestStatus = 'pending') {
  return useQuery({
    queryKey: ['moderator-requests', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moderator_requests')
        .select('*, requester:profiles!moderator_requests_requested_by_fkey(full_name)')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ModeratorRequestRow[];
    },
  });
}
