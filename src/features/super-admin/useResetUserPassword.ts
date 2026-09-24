import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useLanguage } from '../../contexts/LanguageContext';

export function useResetUserPassword() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: ({ targetUserId, newPassword }: { targetUserId: string; newPassword: string }) =>
      invokeEdgeFunction('manage-user', { action: 'reset_password', target_user_id: targetUserId, new_password: newPassword }),
    onSuccess: () => {
      toast.success(tr('Password reset successfully', 'পাসওয়ার্ড রিসেট হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not reset password', 'পাসওয়ার্ড রিসেট করা যায়নি'));
    },
  });
}
