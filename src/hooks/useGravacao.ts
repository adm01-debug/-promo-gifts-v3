/**
 * useGravacao - Hooks para Sistema de Gravação/Personalização
 * 
 * Baseado no briefing técnico 02/02/2026.
 * Usa RPCs do banco externo Promobrind diretamente.
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalRpc } from '@/lib/external-rpc';

// ============================================
// TIPOS (conforme briefing)
// ============================================

export interface TecnicaGravacao {
  id: string;
  codigo: string;
  nome: string;
  slug: string;
  descricao: string | null;
  permite_cores: boolean;
  max_cores: number | null;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  tempo_producao_dias: number;
  ativo: boolean;
}

export interface PrintAreaWithTechniques {
  area_id: string;
  area_code: string;
  area_name: string;
  max_width: number;
  max_height: number;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  techniques: {
    id: string;
    nome: string;
    codigo: string;
  }[];
}

export interface CustomizationPrice {
  area_id: string;
  area_code: string;
  area_name: string;
  table_code: string;
  technique: string;
  quantity: number;
  num_cores: number;
  tier_used: number;
  unit_price: number;
  setup_price: number;
  total_price: number;
  price_by_color: boolean;
  max_colors: number | null;
}

// invokeExternalRpc importado de @/lib/external-rpc

// ============================================
// HOOKS
// ============================================

/**
 * Hook: Busca áreas de gravação de um produto com técnicas
 * Usa RPC fn_get_product_print_areas
 */
export function useProductPrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['product-print-areas', productId],
    queryFn: async (): Promise<PrintAreaWithTechniques[]> => {
      if (!productId) return [];

      const result = await invokeExternalRpc<PrintAreaWithTechniques[]>(
        'fn_get_product_print_areas',
        { p_product_id: productId }
      );
      
      return result || [];
    },
    enabled: !!productId,
    staleTime: 60 * 1000, // 1 minuto
  });
}

/**
 * Hook: Busca todas as técnicas de gravação ativas
 */
export function useTecnicasGravacao() {
  return useQuery({
    queryKey: ['tecnicas-gravacao'],
    queryFn: async (): Promise<TecnicaGravacao[]> => {
      // tecnica_gravacao é mapeado para tabela_preco_gravacao_oficial no edge function
      const { data, error } = await supabase.functions.invoke('external-db-bridge', {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { ativo: true },
          orderBy: { column: 'nome', ascending: true },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar técnicas');
      
      return data.data?.records || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Calcula preço de personalização
 * Usa RPC fn_get_customization_price
 */
export function useCustomizationPrice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePrice = useCallback(async (
    areaId: string,
    quantidade: number,
    numCores: number = 1
  ): Promise<CustomizationPrice | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await invokeExternalRpc<CustomizationPrice>(
        'fn_get_customization_price',
        {
          p_area_id: areaId,
          p_quantidade: quantidade,
          p_num_cores: numCores,
        }
      );
      
      setLoading(false);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular preço';
      setError(message);
      setLoading(false);
      return null;
    }
  }, []);

  return { calculatePrice, loading, error };
}

/**
 * Hook: Encontra tabela de preço compatível
 * Usa RPC fn_find_fornecedor_price_table
 */
export function useFindPriceTable() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findTable = useCallback(async (
    tecnicaId: string,
    areaWidth: number,
    areaHeight: number,
    numCores: number = 1
  ): Promise<any | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await invokeExternalRpc<any>(
        'fn_find_fornecedor_price_table',
        {
          p_tecnica_id: tecnicaId,
          p_area_width: areaWidth,
          p_area_height: areaHeight,
          p_num_cores: numCores,
        }
      );
      
      setLoading(false);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar tabela';
      setError(message);
      setLoading(false);
      return null;
    }
  }, []);

  return { findTable, loading, error };
}

// ============================================
// CONSTANTES (conforme briefing)
// ============================================

export const TECHNIQUE_COLORS: Record<string, string> = {
  SERIGRAFIA: 'bg-blue-100 text-blue-800',
  LASER: 'bg-red-100 text-red-800',
  LASER_CO2: 'bg-red-100 text-red-800',
  LASER_UV: 'bg-red-100 text-red-800',
  UV_DIGITAL: 'bg-purple-100 text-purple-800',
  TAMPOGRAFIA: 'bg-green-100 text-green-800',
  BORDADO: 'bg-yellow-100 text-yellow-800',
  SUBLIMACAO: 'bg-pink-100 text-pink-800',
  HOT_STAMPING: 'bg-orange-100 text-orange-800',
  TRANSFER_DIGITAL: 'bg-cyan-100 text-cyan-800',
  ADESIVO: 'bg-indigo-100 text-indigo-800',
  ETIQUETA: 'bg-gray-100 text-gray-800',
  HEAT_TRANSFER: 'bg-rose-100 text-rose-800',
};

export const TECHNIQUE_ICONS: Record<string, string> = {
  SERIGRAFIA: '🖌️',
  LASER: '⚡',
  LASER_CO2: '⚡',
  LASER_UV: '⚡',
  UV_DIGITAL: '🎨',
  TAMPOGRAFIA: '📘',
  BORDADO: '🧵',
  SUBLIMACAO: '🌈',
  HOT_STAMPING: '✨',
  TRANSFER_DIGITAL: '📋',
  ADESIVO: '🏷️',
  ETIQUETA: '🏷️',
  HEAT_TRANSFER: '🔥',
};

export const AREA_SHAPES = {
  rectangle: 'Retângulo',
  circle: 'Círculo',
  oval: 'Oval',
  triangle: 'Triângulo',
  custom: 'Customizado',
} as const;

export const QUANTITY_TIERS = [
  { min: 1, max: 9, label: '1-9 un' },
  { min: 10, max: 24, label: '10-24 un' },
  { min: 25, max: 49, label: '25-49 un' },
  { min: 50, max: 99, label: '50-99 un' },
  { min: 100, max: 249, label: '100-249 un' },
  { min: 250, max: 499, label: '250-499 un' },
  { min: 500, max: 999, label: '500-999 un' },
  { min: 1000, max: null, label: '1000+ un' },
];
