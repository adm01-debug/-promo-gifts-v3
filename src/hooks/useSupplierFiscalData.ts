/**
 * Hook to fetch fiscal data from variant_supplier_sources + supplier_branches
 * for a given product's preferred supplier source.
 * 
 * INHERITANCE: If no VSS record exists, falls back to supplier_branches defaults.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

export interface SupplierFiscalData {
  // From variant_supplier_sources
  cst: string | null;
  cfop: string | null;
  cfop_interstate: string | null;
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
  // Inheritance flag
  isInherited: boolean;
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
  default_cst: string | null;
  default_cfop_internal: string | null;
  default_cfop_interstate: string | null;
  default_pis_rate: number | null;
  default_cofins_rate: number | null;
  default_cest: string | null;
  default_csosn: string | null;
  default_operation_nature: string | null;
}

const BRANCH_SELECT = 'id, branch_name, cnpj, state_uf, tax_regime, icms_internal_rate, icms_interstate_rate, default_cst, default_cfop_internal, default_cfop_interstate, default_pis_rate, default_cofins_rate, default_cest, default_csosn, default_operation_nature';

/**
 * Builds SupplierFiscalData from branch defaults (inheritance mode).
 */
function buildFromBranch(branch: BranchRecord): SupplierFiscalData {
  return {
    cst: branch.default_cst || null,
    cfop: branch.default_cfop_internal || null,
    cfop_interstate: branch.default_cfop_interstate || null,
    icms_rate: branch.icms_internal_rate ?? null,
    pis_rate: branch.default_pis_rate ?? null,
    cofins_rate: branch.default_cofins_rate ?? null,
    cest: branch.default_cest || null,
    csosn: branch.default_csosn || null,
    operation_nature: branch.default_operation_nature || null,
    supplier_branch_id: branch.id,
    branch_name: branch.branch_name || null,
    branch_cnpj: branch.cnpj || null,
    branch_state_uf: branch.state_uf || null,
    branch_tax_regime: branch.tax_regime || null,
    branch_icms_internal: branch.icms_internal_rate ?? null,
    branch_icms_interstate: branch.icms_interstate_rate ?? null,
    isInherited: true,
  };
}

/**
 * Fetches fiscal data for a specific supplier source (by supplier_id + product variants).
 * Uses the external DB bridge to query variant_supplier_sources.
 * 
 * INHERITANCE: If no VSS record exists for the product+supplier combo,
 * falls back to supplier_branches defaults for that supplier.
 */
export function useSupplierFiscalData(productId: string | undefined, supplierId: string | undefined) {
  return useQuery({
    queryKey: ['supplier-fiscal-data', productId, supplierId],
    queryFn: async (): Promise<SupplierFiscalData | null> => {
      if (!productId || !supplierId) return null;

      // 1. First get variant IDs for this product to scope the VSS query
      const variantsResult = await invokeExternalDb<{ id: string }>({
        table: 'product_variants',
        operation: 'select',
        select: 'id',
        filters: { product_id: productId },
        limit: 200,
      });

      let vss: VSSRecord | null = null;

      if (variantsResult.records.length) {
        // 2. Get variant_supplier_sources for this supplier + product's variants
        const variantIds = variantsResult.records.map(v => v.id);
        
        for (const variantId of variantIds.slice(0, 5)) {
          const vssResult = await invokeExternalDb<VSSRecord>({
            table: 'variant_supplier_sources',
            operation: 'select',
            select: 'cst, cfop, icms_rate, pis_rate, cofins_rate, cest, csosn, operation_nature, supplier_branch_id',
            filters: { supplier_id: supplierId, variant_id: variantId },
            limit: 1,
          });
          if (vssResult.records.length) {
            vss = vssResult.records[0];
            break;
          }
        }
      }

      // 3. If we have VSS, fetch branch details and return specific data
      if (vss) {
        let branchData: Partial<BranchRecord> = {};
        if (vss.supplier_branch_id) {
          try {
            const branchResult = await invokeExternalDb<BranchRecord>({
              table: 'supplier_branches',
              operation: 'select',
              select: BRANCH_SELECT,
              filters: { id: vss.supplier_branch_id },
              limit: 1,
            });
            if (branchResult.records.length) {
              branchData = branchResult.records[0];
            }
          } catch (err) {
            console.warn('[useSupplierFiscalData] Failed to fetch branch data:', err);
          }
        }

        return {
          cst: vss.cst,
          cfop: vss.cfop,
          cfop_interstate: null,
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
          branch_icms_internal: branchData.icms_internal_rate ?? null,
          branch_icms_interstate: branchData.icms_interstate_rate ?? null,
          isInherited: false,
        };
      }

      // 4. INHERITANCE: No VSS found — fall back to supplier_branches defaults
      try {
        const branchesResult = await invokeExternalDb<BranchRecord>({
          table: 'supplier_branches',
          operation: 'select',
          select: BRANCH_SELECT,
          filters: { supplier_id: supplierId, is_active: true },
          limit: 5,
        });

        if (branchesResult.records.length) {
          // Use the first active branch (usually the main/headquarters)
          // Prefer one marked as is_main if available
          const branch = branchesResult.records[0];
          return buildFromBranch(branch);
        }
      } catch (err) {
        console.warn('[useSupplierFiscalData] Failed to fetch branch defaults for inheritance:', err);
      }

      return null;
    },
    enabled: !!productId && !!supplierId,
    staleTime: 5 * 60 * 1000,
  });
}
