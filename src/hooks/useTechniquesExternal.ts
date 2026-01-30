/**
 * Hook para buscar técnicas de personalização do BD EXTERNO
 * 
 * Substitui chamadas diretas a supabase.from('personalization_techniques')
 * que acessavam o banco local (vazio) pelo banco externo via bridge.
 */
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';

export interface ExternalTechnique {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  setup_cost: number | null;
  unit_cost: number | null;
  min_quantity: number | null;
  estimated_days: number | null;
  max_colors: number | null;
  requires_color_count: boolean | null;
  price_by_color: boolean | null;
  price_by_area: boolean | null;
  is_active: boolean;
}

/**
 * Busca todas as técnicas ativas do banco externo
 */
export function useTechniquesExternal() {
  return useQuery({
    queryKey: ['techniques-external'],
    queryFn: async (): Promise<ExternalTechnique[]> => {
      const result = await invokeExternalDb<ExternalTechnique>({
        table: 'personalization_techniques',
        operation: 'select',
        filters: { is_active: true },
        orderBy: { column: 'name', ascending: true },
        limit: 100,
      });

      // Mapear campos para compatibilidade
      return result.records.map(t => ({
        ...t,
        setup_cost: (t as any).setup_price ?? t.setup_cost ?? null,
        unit_cost: (t as any).handling_price ?? t.unit_cost ?? null,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Busca técnicas resumidas (id, name, code) para dropdowns
 */
export function useTechniquesExternalSimple() {
  return useQuery({
    queryKey: ['techniques-external-simple'],
    queryFn: async (): Promise<Array<{ id: string; name: string; code: string | null }>> => {
      const result = await invokeExternalDb<{ id: string; name: string; code: string | null }>({
        table: 'personalization_techniques',
        operation: 'select',
        select: 'id, name, code',
        filters: { is_active: true },
        orderBy: { column: 'name', ascending: true },
        limit: 100,
      });

      return result.records;
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca uma técnica por ID
 */
export function useTechniqueByIdExternal(id: string | undefined) {
  return useQuery({
    queryKey: ['technique-external', id],
    queryFn: async (): Promise<ExternalTechnique | null> => {
      if (!id) return null;
      
      const result = await invokeExternalDb<ExternalTechnique>({
        table: 'personalization_techniques',
        operation: 'select',
        filters: { id },
        limit: 1,
      });

      const tech = result.records[0];
      if (!tech) return null;

      return {
        ...tech,
        setup_cost: (tech as any).setup_price ?? tech.setup_cost ?? null,
        unit_cost: (tech as any).handling_price ?? tech.unit_cost ?? null,
      };
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  });
}
