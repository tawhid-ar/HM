import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { sanitizeSearchTerm } from '../../lib/postgrestSafe';
import type { Profile } from '../../types/database.types';

const PAGE_SIZE = 20;

interface UseAdminStaffUsersParams {
  page: number;
  search: string;
  roleFilter: 'all' | 'user' | 'moderator';
}

/**
 * Same underlying `profiles` table as Super Admin's useAllUsers, but always
 * filtered to role in (user, moderator) — an Admin account is only ever
 * meant to manage staff below it, never other admins/super_admins. The RLS
 * select policy would technically let an admin read everyone, so this
 * client-side filter is what actually keeps the Admin panel's scope narrow.
 */
export function useAdminStaffUsers({ page, search, roleFilter }: UseAdminStaffUsersParams) {
  return useQuery({
    queryKey: ['admin-staff-users', page, search, roleFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .in('role', roleFilter === 'all' ? ['user', 'moderator'] : [roleFilter])
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (search.trim()) {
        const term = sanitizeSearchTerm(search);
        if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { users: (data ?? []) as Profile[], total: count ?? 0 };
    },
  });
}
