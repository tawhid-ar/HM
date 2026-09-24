import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Unlike role changes, toggling is_active is safe to do as a direct table
 * update — it's covered by the `profiles_update_super_admin` RLS policy,
 * and flipping a boolean carries no privilege-escalation risk the way
 * changing `role` does.
 */
export function useToggleUserActive() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.isActive ? tr('Account activated', 'অ্যাকাউন্ট সক্রিয় করা হয়েছে') : tr('Account deactivated', 'অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not make the change', 'পরিবর্তন করা যায়নি'));
    },
  });
}
