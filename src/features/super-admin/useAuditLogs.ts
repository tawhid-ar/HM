import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export interface AuditLogRow {
  id: string;
  actor_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  actor?: { full_name: string; email: string | null } | null;
}

export function useAuditLogs({ page = 0, pageSize = 30 }: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['audit-logs', { page, pageSize }],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*, actor:profiles!audit_logs_actor_id_fkey(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);

      if (error) throw error;
      return { logs: data as unknown as AuditLogRow[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
