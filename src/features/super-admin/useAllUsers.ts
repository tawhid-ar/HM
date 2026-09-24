import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { sanitizeSearchTerm } from '../../lib/postgrestSafe';
import type { Profile, UserRole } from '../../types/database.types';

interface UseAllUsersOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  roleFilter?: UserRole | 'all';
}

export function useAllUsers({ page = 0, pageSize = 20, search, roleFilter = 'all' }: UseAllUsersOptions = {}) {
  return useQuery({
    queryKey: ['admin-users', { page, pageSize, search, roleFilter }],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }
      if (search) {
        // search across name + email
        const term = sanitizeSearchTerm(search);
        if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { users: data as Profile[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
