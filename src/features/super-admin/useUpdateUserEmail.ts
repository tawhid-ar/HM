import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useLanguage } from '../../contexts/LanguageContext';

export function useUpdateUserEmail() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: ({ targetUserId, newEmail }: { targetUserId: string; newEmail: string }) =>
      invokeEdgeFunction('manage-user', { action: 'update_email', target_user_id: targetUserId, new_email: newEmail }),
    onSuccess: () => {
      toast.success(tr('Email updated', 'ইমেইল পরিবর্তন হয়েছে'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not update email', 'ইমেইল পরিবর্তন করা যায়নি'));
    },
  });
}
