/**
 * useOrgData — Generic hook for org-scoped CRUD operations
 * 
 * Automatically filters data by the current organization's ID.
 * Works with any Supabase table that has an `organization_id` column.
 */
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/contexts/OrganizationContext';

interface UseOrgDataOptions<T> {
  /** Table name in Supabase */
  table: string;
  /** Columns to select (default: '*') */
  select?: string;
  /** Additional filters as key-value pairs */
  filters?: Record<string, unknown>;
  /** Order by column */
  orderBy?: { column: string; ascending?: boolean };
  /** Limit results */
  limit?: number;
  /** Enable/disable the query */
  enabled?: boolean;
  /** Additional query options */
  queryOptions?: Omit<UseQueryOptions<T[]>, 'queryKey' | 'queryFn' | 'enabled'>;
}

/**
 * Fetches rows from a table filtered by the current org's ID.
 * Also provides insert/update/delete mutations that auto-inject organization_id.
 */
export function useOrgData<T extends Record<string, unknown> = Record<string, unknown>>({
  table,
  select = '*',
  filters = {},
  orderBy,
  limit,
  enabled = true,
  queryOptions,
}: UseOrgDataOptions<T>) {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  const queryKey = ['org-data', table, orgId, select, filters, orderBy, limit];

  // ── SELECT ──
  const query = useQuery<T[]>({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];

      let q = supabase
        .from(table)
        .select(select)
        .eq('organization_id', orgId);

      // Apply extra filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          q = q.eq(key, value as string);
        }
      }

      if (orderBy) {
        q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
      }

      if (limit) {
        q = q.limit(limit);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as T[];
    },
    enabled: enabled && !!orgId,
    ...queryOptions,
  });

  // ── INSERT ──
  const insertMutation = useMutation({
    mutationFn: async (row: Partial<T>) => {
      if (!orgId) throw new Error('No organization selected');
      const { data, error } = await supabase
        .from(table)
        .insert({ ...row, organization_id: orgId } as Record<string, unknown>)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-data', table, orgId] });
    },
  });

  // ── UPDATE ──
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<T>) => {
      if (!orgId) throw new Error('No organization selected');
      const { data, error } = await supabase
        .from(table)
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-data', table, orgId] });
    },
  });

  // ── DELETE ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId) throw new Error('No organization selected');
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-data', table, orgId] });
    },
  });

  return {
    // Query
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    // Mutations
    insert: insertMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,

    // Mutation states
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Org context
    orgId,
    hasOrg: !!orgId,
  };
}
