import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useLanguage } from '../../contexts/LanguageContext';

export interface AdminCreateAccountInput {
  email: string;
  password: string;
  full_name: string;
  role: 'user' | 'moderator';
  phone?: string;
  address?: string;
}

/** Same manage-user Edge Function as Super Admin's create form — the function
 * itself checks that an 'admin' caller can only ever pass role user/moderator. */
export function useAdminCreateAccount() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: (input: AdminCreateAccountInput) => invokeEdgeFunction('manage-user', { action: 'create', ...input }),
    onSuccess: () => {
      toast.success(tr('New account created', 'নতুন অ্যাকাউন্ট তৈরি হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not create account', 'অ্যাকাউন্ট তৈরি করা যায়নি'));
    },
  });
}
