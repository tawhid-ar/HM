import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { UserRole } from '../../types/database.types';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useLanguage } from '../../contexts/LanguageContext';

export interface CreateUserAccountInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  address?: string;
}

/**
 * Creating an account needs the Supabase Admin API (to set a password and
 * skip email confirmation), which only exists with the service-role key —
 * so, like role changes, this always goes through an Edge Function rather
 * than any direct client call.
 */
export function useCreateUserAccount() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: (input: CreateUserAccountInput) => invokeEdgeFunction('manage-user', { action: 'create', ...input }),
    onSuccess: () => {
      toast.success(tr('New account created', 'নতুন অ্যাকাউন্ট তৈরি হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not create account', 'অ্যাকাউন্ট তৈরি করা যায়নি'));
    },
  });
}
