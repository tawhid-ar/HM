import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useLanguage } from '../../contexts/LanguageContext';

export interface AdminUpdateUserDetailsInput {
  userId: string;
  full_name: string;
  phone?: string | null;
  address?: string | null;
}

/**
 * Unlike Super Admin (whose `profiles_update_super_admin` RLS policy allows
 * a direct client update), a plain admin has NO update policy on other
 * people's `profiles` rows at all — so this has to go through the
 * `manage-user` Edge Function, which uses the service-role key and enforces
 * the admin-can-only-touch-user/moderator rule server-side.
 */
export function useAdminUpdateUserDetails() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: ({ userId, full_name, phone, address }: AdminUpdateUserDetailsInput) =>
      invokeEdgeFunction('manage-user', { action: 'update_details', target_user_id: userId, full_name, phone, address }),
    onSuccess: () => {
      toast.success(tr('Profile updated', 'প্রোফাইল আপডেট হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not update', 'আপডেট করা যায়নি'));
    },
  });
}
