import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useLanguage } from '../../contexts/LanguageContext';

export function useAdminToggleUserActive() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      invokeEdgeFunction('manage-user', { action: 'toggle_active', target_user_id: userId, is_active: isActive }),
    onSuccess: () => {
      toast.success(tr('Status updated', 'স্ট্যাটাস আপডেট হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not update', 'আপডেট করা যায়নি'));
    },
  });
}
