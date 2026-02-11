import { useQuery } from '@tanstack/react-query';
import { selectCrm, selectCrmById } from '@/lib/crm-db';
import { CrmCompany, toLegacyClient, type LegacyClientFormat } from '@/types/crm';

// Interface de compatibilidade — mantida para não quebrar consumidores existentes
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

/**
 * Lista clientes do CRM externo (substitui bitrix_clients)
 */
export function useClients() {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => {
      const companies = await selectCrm<CrmCompany>('companies', {
        filters: { deleted_at: null },
        orderBy: { column: 'razao_social', ascending: true },
        limit: 500,
      });

      return companies.map(toLegacyClient);
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca cliente individual do CRM por ID
 */
export function useClient(id: string) {
  return useQuery<Client | null>({
    queryKey: ['clients', id],
    queryFn: async () => {
      const company = await selectCrmById<CrmCompany>('companies', id);
      if (!company) return null;
      return toLegacyClient(company);
    },
    enabled: !!id,
  });
}
