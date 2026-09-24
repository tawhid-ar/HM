import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ModeratorRequestRow } from './useModeratorRequests';

/**
 * Approving a moderator request does two things, in order:
 *  1. Promote the candidate's existing account to 'moderator' via the
 *     secure `manage-role` Edge Function (never a direct role update).
 *  2. Mark the request row as approved.
 * The candidate must already have signed up as a regular user — this flow
 * elevates an existing account, it doesn't create a new one.
 */
export function useApproveModeratorRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async (request: ModeratorRequestRow) => {
      const { data: candidate, error: lookupError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', request.candidate_email)
        .maybeSingle();

      if (lookupError) throw lookupError;
      if (!candidate) {
        throw new Error(tr('No registered user was found with this email. The candidate must sign up first.', 'এই ইমেইলে কোনো রেজিস্টার্ড ইউজার পাওয়া যায়নি। প্রার্থীকে আগে সাইন আপ করতে হবে।'));
      }
      if (candidate.role !== 'user') {
        throw new Error(tr('This account is no longer in the user role. Please review it manually.', 'এই ইউজার ইতিমধ্যে user রোলে নেই — ম্যানুয়ালি চেক করুন।'));
      }

      await invokeEdgeFunction('manage-role', { target_user_id: candidate.id, new_role: 'moderator' });

      const { error: updateError } = await supabase
        .from('moderator_requests')
        .update({ status: 'approved', reviewed_by: profile?.id })
        .eq('id', request.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success(tr('Moderator request approved', 'মডারেটর রিকোয়েস্ট অনুমোদিত হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['moderator-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not approve request', 'অনুমোদন করা যায়নি')),
  });
}

export function useRejectModeratorRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('moderator_requests')
        .update({ status: 'rejected', reviewed_by: profile?.id })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Request rejected', 'রিকোয়েস্ট বাতিল করা হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['moderator-requests'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not reject request', 'বাতিল করা যায়নি')),
  });
}
