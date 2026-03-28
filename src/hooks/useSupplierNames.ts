/**
 * Hook para buscar nomes dos fornecedores a partir de IDs.
 * Consulta a tabela 'suppliers' no banco externo.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

interface SupplierRecord {
  id: string;
  name: string;
}

/**
 * Busca nomes dos fornecedores para um conjunto de IDs.
 * Retorna um Map<supplier_id, supplier_name>.
 */
export function useSupplierNames(supplierIds: string[]) {
  const uniqueIds = [...new Set(supplierIds.filter(Boolean))];

  return useQuery({
    queryKey: ['supplier-names', uniqueIds.sort().join(',')],
    queryFn: async (): Promise<Map<string, string>> => {
      if (uniqueIds.length === 0) return new Map();

      try {
        const result = await invokeExternalDb<SupplierRecord>({
          table: 'suppliers',
          operation: 'select',
          select: 'id,name',
          filters: { id: `in.(${uniqueIds.join(',')})` },
          limit: 50,
        });

        return new Map(result.records.map(s => [s.id, s.name]));
      } catch {
        // Fallback: use truncated IDs as names
        return new Map(uniqueIds.map(id => [id, `Fornecedor ${id.slice(0, 6)}`]));
      }
    },
    enabled: uniqueIds.length > 0,
    staleTime: 60 * 60 * 1000, // 1h cache — supplier names rarely change
  });
}
