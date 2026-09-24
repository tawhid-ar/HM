import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { UserRole } from '../../types/database.types';
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChangeRoleInput {
  targetUserId: string;
  newRole: UserRole;
}

/**
 * Role changes NEVER go through a direct `update` call from the client —
 * even for super_admin — because that would mean the anon key alone is
 * enough to grant privileges if it ever leaked. Instead this calls the
 * `manage-role` Edge Function, which re-verifies the caller is super_admin
 * server-side (using their JWT) before using the service_role key to write.
 */
export function useChangeRole() {
  const queryClient = useQueryClient();
  const { tr } = useLanguage();

  return useMutation({
    mutationFn: (input: ChangeRoleInput) =>
      invokeEdgeFunction('manage-role', { target_user_id: input.targetUserId, new_role: input.newRole }),
    onSuccess: () => {
      toast.success(tr('Role changed successfully', 'রোল সফলভাবে পরিবর্তন হয়েছে'));
      // Invalidates both Super Admin's and Admin's user lists since this
      // hook is shared by both dashboards.
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-staff-users'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || tr('Could not change role', 'রোল পরিবর্তন করা যায়নি'));
    },
  });
}
