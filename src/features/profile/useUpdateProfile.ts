import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface ProfileUpdateInput {
  full_name: string;
  phone: string | null;
}

/**
 * Deliberately never touches `role`. Delivery addresses live in the dedicated
 * `user_addresses` table so Home/Office can be managed independently.
 */
export function useUpdateProfile() {
  const { session, refreshProfile } = useAuth();
  const { tr } = useLanguage();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProfileUpdateInput) => {
      if (!session?.user) throw new Error(tr('You are not logged in', 'লগইন করা নেই'));
      const { error } = await supabase.from('profiles').update(input).eq('id', session.user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(tr('Profile updated', 'প্রোফাইল আপডেট হয়েছে'));
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => toast.error(err.message || tr('Could not update profile', 'প্রোফাইল আপডেট করা যায়নি')),
  });
}
