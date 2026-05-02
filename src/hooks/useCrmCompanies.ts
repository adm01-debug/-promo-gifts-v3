/**
 * Hook para acessar empresas/clientes do CRM externo
 * Substitui useClients (que usava bitrix_clients)
 */

import { useQuery } from "@tanstack/react-query";
import { selectCrm, selectCrmById, searchCrm } from "@/lib/crm-db";
import { type CrmCompany, type CrmCompanyFilters, type CrmCustomer, toLegacyClient, getCompanyDisplayName, type LegacyClientFormat } from "@/types/crm";
import { DEMO_CLIENT_ID, DEMO_COMPANY, isDemoClient } from "@/lib/bi/demoClient";

/**
 * Lista empresas do CRM com filtros opcionais
 */
export function useCrmCompanies(filters?: CrmCompanyFilters) {
  return useQuery<CrmCompany[]>({
    queryKey: ["crm-companies", filters],
    queryFn: async () => {
      console.log("[CRM-DB] useCrmCompanies: Buscando empresas...", { filters });
      const queryFilters: Record<string, unknown> = {};

      if (filters?.status) queryFilters.status = filters.status;
      if (filters?.cidade) queryFilters.cidade = filters.cidade;
      if (filters?.estado) queryFilters.estado = filters.estado;
      if (filters?.ramo_atividade) queryFilters.ramo_atividade = filters.ramo_atividade;
      if (filters?.is_customer !== undefined) queryFilters.is_customer = filters.is_customer;
      if (filters?.is_supplier !== undefined) queryFilters.is_supplier = filters.is_supplier;
      if (filters?.is_carrier !== undefined) queryFilters.is_carrier = filters.is_carrier;

      // Excluir deletados por padrão
      queryFilters.deleted_at = null;

      if (filters?.search) {
        const results = await searchCrm<CrmCompany>("companies", "razao_social", filters.search, {
          orderBy: { column: "razao_social", ascending: true },
          limit: 200,
        });
        console.log("[CRM-DB] useCrmCompanies: Busca concluída (search). Total:", results.length);
        return results;
      }

      const results = await selectCrm<CrmCompany>("companies", {
        filters: Object.keys(queryFilters).length > 0 ? queryFilters : undefined,
        orderBy: { column: "razao_social", ascending: true },
        limit: 200,
      });
      console.log("[CRM-DB] useCrmCompanies: Busca concluída (select). Total:", results.length);
      return results;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca empresa individual do CRM por ID
 */
export function useCrmCompany(id: string | null | undefined) {
  return useQuery<CrmCompany | null>({
    queryKey: ["crm-company", id],
    queryFn: async () => {
      if (!id) return null;
      if (isDemoClient(id)) return DEMO_COMPANY as unknown as CrmCompany;
      return selectCrmById<CrmCompany>("companies", id);
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook de compatibilidade: retorna dados no formato legado (BitrixClient)
 */
export function useCrmCompaniesLegacy(filters?: CrmCompanyFilters) {
  const query = useCrmCompanies(filters);

  return {
    ...query,
    data: query.data?.map(c => toLegacyClient(c)) || [],
  };
}

/**
 * Hook de compatibilidade: empresa individual no formato legado
 */
export function useCrmCompanyLegacy(id: string | null | undefined) {
  const query = useCrmCompany(id);

  return {
    ...query,
    data: query.data ? toLegacyClient(query.data) : null,
  };
}

/**
 * Busca lista de empresas para seletores (dropdown/combobox)
 * Retorna apenas campos essenciais para performance
 */
export function useCrmCompanySelector() {
  return useQuery({
    queryKey: ["crm-companies-selector"],
    queryFn: async () => {
      console.log("[CRM-DB] useCrmCompanySelector: Iniciando carregamento...");
      try {
        const companies = await selectCrm<CrmCompany>("companies", {
          select: "id, razao_social, nome_fantasia, ramo_atividade, logo_url, cnpj",
          filters: { deleted_at: null },
          orderBy: { column: "razao_social", ascending: true },
          limit: 500,
        });

        console.log("[CRM-DB] useCrmCompanySelector: OK. Total:", companies.length);
        return companies.map((c) => ({
          id: c.id,
          name: getCompanyDisplayName(c),
          razao_social: c.razao_social,
          nome_fantasia: c.nome_fantasia,
          ramo: c.ramo_atividade,
          nicho: null,
          primary_color_name: null,
          primary_color_hex: null,
          logo_url: c.logo_url,
          cnpj: c.cnpj,
        }));
      } catch (err) {
        console.error("[CRM-DB] useCrmCompanySelector: FALHA:", err);
        throw err;
      }
    },
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Hook para dados de customer associado a uma company
 */
export function useCrmCustomer(companyId: string | null | undefined) {
  return useQuery<CrmCustomer | null>({
    queryKey: ["crm-customer", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const results = await selectCrm<CrmCustomer>("customers", {
        filters: { company_id: companyId },
        limit: 1,
      });
      return results[0] || null;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });
}
