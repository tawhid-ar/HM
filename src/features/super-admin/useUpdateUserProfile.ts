import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';

export interface UpdateUserProfileInput {
  userId: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
}

/**
 * full_name/phone/address carry no privilege-escalation risk the way role
 * or email do, and the `profiles_update_super_admin` RLS policy already
 * allows super_admin to write them directly — so, unlike create/role/email/
 * password, this skips the Edge Function entirely.
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: async ({ userId, full_name, phone, address }: UpdateUserProfileInput) => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name, phone: phone || null, address: address || null })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(tr('Profile updated', 'প্রোফাইল আপডেট হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not update', 'আপডেট করা যায়নি'));
    },
  });
}
