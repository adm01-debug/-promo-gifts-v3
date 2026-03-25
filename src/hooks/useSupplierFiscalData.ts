/**
 * Hook to fetch fiscal data from variant_supplier_sources + supplier_branches
 * for a given product's preferred supplier source.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

export interface SupplierFiscalData {
  // From variant_supplier_sources
  cst: string | null;
  cfop: string | null;
  icms_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  cest: string | null;
  csosn: string | null;
  operation_nature: string | null;
  supplier_branch_id: string | null;
  // From supplier_branches (joined or fetched separately)
  branch_name: string | null;
  branch_cnpj: string | null;
  branch_state_uf: string | null;
  branch_tax_regime: string | null;
  branch_icms_internal: number | null;
  branch_icms_interstate: number | null;
}

interface VSSRecord {
  cst: string | null;
  cfop: string | null;
  icms_rate: number | null;
  pis_rate: number | null;
  cofins_rate: number | null;
  cest: string | null;
  csosn: string | null;
  operation_nature: string | null;
  supplier_branch_id: string | null;
}

interface BranchRecord {
  id: string;
  branch_name: string | null;
  cnpj: string | null;
  state_uf: string | null;
  tax_regime: string | null;
  icms_internal_rate: number | null;
  icms_interstate_rate: number | null;
}

/**
 * Fetches fiscal data for a specific supplier source (by supplier_id + product variants).
 * Uses the external DB bridge to query variant_supplier_sources.
 */
export function useSupplierFiscalData(productId: string | undefined, supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-fiscal-data', productId, supplierId],
    queryFn: async (): Promise<SupplierFiscalData | null> => {
      if (!productId || !supplierId) return null;

      // 1. Get variant_supplier_sources for this product+supplier (pick first/preferred)
      const vssResult = await invokeExternalDb<VSSRecord>({
        table: 'variant_supplier_sources',
        operation: 'select',
        select: 'cst, cfop, icms_rate, pis_rate, cofins_rate, cest, csosn, operation_nature, supplier_branch_id',
        filters: { supplier_id: supplierId },
        limit: 1,
        orderBy: 'created_at.asc',
      });

      if (!vssResult.records.length) return null;

      const vss = vssResult.records[0];

      // 2. If we have a branch_id, fetch branch details
      let branchData: Partial<BranchRecord> = {};
      if (vss.supplier_branch_id) {
        const branchResult = await invokeExternalDb<BranchRecord>({
          table: 'supplier_branches',
          operation: 'select',
          select: 'id, branch_name, cnpj, state_uf, tax_regime, icms_internal_rate, icms_interstate_rate',
          filters: { id: vss.supplier_branch_id },
          limit: 1,
        });
        if (branchResult.records.length) {
          branchData = branchResult.records[0];
        }
      }

      return {
        cst: vss.cst,
        cfop: vss.cfop,
        icms_rate: vss.icms_rate,
        pis_rate: vss.pis_rate,
        cofins_rate: vss.cofins_rate,
        cest: vss.cest,
        csosn: vss.csosn,
        operation_nature: vss.operation_nature,
        supplier_branch_id: vss.supplier_branch_id,
        branch_name: branchData.branch_name || null,
        branch_cnpj: branchData.cnpj || null,
        branch_state_uf: branchData.state_uf || null,
        branch_tax_regime: branchData.tax_regime || null,
        branch_icms_internal: branchData.icms_internal_rate || null,
        branch_icms_interstate: branchData.icms_interstate_rate || null,
      };
    },
    enabled: !!productId && !!supplierId,
    staleTime: 5 * 60 * 1000,
  });
}
