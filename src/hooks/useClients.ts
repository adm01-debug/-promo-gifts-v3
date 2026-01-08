import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Interface atualizada para corresponder à tabela bitrix_clients
export interface Client {
  id: string;
  bitrix_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ramo: string | null;
  nicho: string | null;
  logo_url: string | null;
  primary_color_name: string | null;
  primary_color_hex: string | null;
  total_spent: number | null;
  last_purchase_date: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_clients')
        .select('*')
        .order('name');

      if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useClient(id: string) {
  return useQuery<Client | null>({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bitrix_clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(`Failed to fetch client: ${error.message}`);
      }

      return data;
    },
    enabled: !!id,
  });
}
