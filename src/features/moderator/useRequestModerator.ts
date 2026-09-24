import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

export interface RequestModeratorInput {
  candidate_email: string;
  candidate_name?: string;
  reason?: string;
}

/**
 * `moderator_requests_insert_mod` RLS policy allows moderator/admin/super_admin
 * to insert; an admin reviews and approves via `manage-role` (see admin feature).
 * This only creates the request row — it never changes anyone's role directly.
 */
export function useRequestModerator() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: RequestModeratorInput) => {
      if (!profile) throw new Error('Not authenticated');
      const { error } = await supabase.from('moderator_requests').insert({
        requested_by: profile.id,
        candidate_email: input.candidate_email,
        candidate_name: input.candidate_name || null,
        reason: input.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Request sent — you will be notified after admin review', 'রিকোয়েস্ট পাঠানো হয়েছে — অ্যাডমিন রিভিউ করার পর জানানো হবে'));
      queryClient.invalidateQueries({ queryKey: ['my-moderator-requests'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not send request', 'রিকোয়েস্ট পাঠানো যায়নি')),
  });
}
