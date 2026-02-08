/**
 * useGravacaoPriceV2 - Fluxo de 3 passos para cálculo de preço de gravação
 * 
 * PASSO 1: fn_get_product_print_areas → áreas com técnicas mestre
 * PASSO 2: category_area_techniques → variantes da técnica selecionada
 * PASSO 3: fn_get_customization_price_v2 → cálculo de preço com variante
 * 
 * IMPORTANTE:
 * - techniques[].id do passo 1 é o ID MESTRE
 * - Para calcular preço, precisamos do tecnica_variante_id do passo 2
 * - fn_get_customization_price_v2 é a RPC correta (NÃO usar fn_get_customization_price)
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import { invokeExternalRpc } from '@/lib/external-rpc';

// ============================================
// TYPES
// ============================================

/**
 * Variante de técnica retornada pelo passo 2
 * (category_area_techniques JOIN tecnica_gravacao_variante)
 */
export interface TecnicaVariante {
  tecnica_variante_id: string;
  max_colors: number;
  is_recommended: boolean;
  tecnica_gravacao_variante: {
    id: string;
    nome: string;
    codigo: string;
  };
}

/**
 * Retorno da fn_get_customization_price_v2
 * 
 * REGRAS DE NEGÓCIO:
 * - Markup 115%: custo × 2.15 = preço de venda (já calculado pela função)
 * - Setup = faturamento mínimo (piso): NÃO é somado ao total
 *   Se subtotal < piso → cobra o piso. Senão → cobra o subtotal.
 */
export interface CustomizationPriceV2Result {
  success: boolean;
  technique: string;          // Nome completo para exibir
  unit_price: number;         // Preço unitário de gravação (já com markup)
  subtotal_pecas: number;     // unit_price × quantidade
  faturamento_minimo_gravacao: number;  // Piso mínimo
  minimum_applied: boolean;   // true = cobrou o mínimo
  total_price: number;        // ★ VALOR FINAL DA GRAVAÇÃO
  prazo_dias: number;         // Prazo de produção
  codigo_orcamento: string;   // Ref. para orçamento
  num_cores: number;
  markup_percent: number;
  faixa_utilizada: number;
  // Campos opcionais (podem vir da RPC dependendo da versão)
  margin_percent?: number;
  tier_min_qty?: number;
  tier_max_qty?: number;
  cost_unit_total?: number;   // Custo unitário (sem markup) para cálculo de margem
}

/**
 * Params para buscar variantes (Passo 2)
 */
export interface FetchVariantsParams {
  categoryPrintAreaId: string;  // area_id do passo 1
  tecnicaGravacaoId: string;    // technique.id (ID MESTRE) do passo 1
}

/**
 * Params para calcular preço (Passo 3)
 */
export interface CalculatePriceV2Params {
  tecnicaVarianteId: string;    // UUID da VARIANTE (passo 2)
  quantidade: number;
  numCores: number;
}

// invokeExternalRpc importado de @/lib/external-rpc

// ============================================
// PASSO 2: Buscar variantes de uma técnica para uma área
// ============================================

/**
 * Hook: Busca variantes disponíveis de uma técnica em uma área específica
 * 
 * Se retornar 1 variante → usar direto
 * Se retornar 2+ variantes → mostrar dropdown (ex: "Fiber Laser Plana" vs "Fiber Laser Cilíndrica")
 */
export function useTecnicaVariants(
  categoryPrintAreaId: string | null,
  tecnicaGravacaoId: string | null
) {
  return useQuery({
    queryKey: ['tecnica-variants', categoryPrintAreaId, tecnicaGravacaoId],
    queryFn: async (): Promise<TecnicaVariante[]> => {
      if (!categoryPrintAreaId || !tecnicaGravacaoId) return [];

      const result = await invokeExternalDb<TecnicaVariante>({
        table: 'category_area_techniques',
        operation: 'select',
        select: 'tecnica_variante_id,max_colors,is_recommended,tecnica_gravacao_variante!inner(id,nome,codigo)',
        filters: {
          category_print_area_id: categoryPrintAreaId,
          tecnica_gravacao_id: tecnicaGravacaoId,
          is_active: true,
        },
        orderBy: { column: 'display_order', ascending: true },
      });

      return result.records || [];
    },
    enabled: !!categoryPrintAreaId && !!tecnicaGravacaoId,
    staleTime: 60 * 1000,
  });
}

// ============================================
// PASSO 3: Calcular preço com fn_get_customization_price_v2
// ============================================

/**
 * Hook: Calcula preço de gravação usando fn_get_customization_price_v2
 * 
 * ⚠️ USAR SEMPRE fn_get_customization_price_v2
 * NÃO usar: fn_get_customization_price, fn_calcular_preco_personalizacao_v2,
 *           calcular_preco_personalizacao, get_customization_price
 */
export function useCustomizationPriceV2() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePrice = useCallback(async (
    params: CalculatePriceV2Params
  ): Promise<CustomizationPriceV2Result | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await invokeExternalRpc<CustomizationPriceV2Result>(
        'fn_get_customization_price_v2',
        {
          p_tecnica_variante_id: params.tecnicaVarianteId,
          p_quantidade: params.quantidade,
          p_num_cores: params.numCores,
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
 * Função standalone para calcular preço v2 (sem hook)
 * Útil para uso em Promise.all() no simulador
 */
export async function calculateCustomizationPriceV2(
  params: CalculatePriceV2Params
): Promise<CustomizationPriceV2Result> {
  return invokeExternalRpc<CustomizationPriceV2Result>(
    'fn_get_customization_price_v2',
    {
      p_tecnica_variante_id: params.tecnicaVarianteId,
      p_quantidade: params.quantidade,
      p_num_cores: params.numCores,
    }
  );
}

/**
 * Busca variantes de uma técnica (standalone, sem hook)
 */
export async function fetchTecnicaVariants(
  params: FetchVariantsParams
): Promise<TecnicaVariante[]> {
  const result = await invokeExternalDb<TecnicaVariante>({
    table: 'category_area_techniques',
    operation: 'select',
    select: 'tecnica_variante_id,max_colors,is_recommended,tecnica_gravacao_variante!inner(id,nome,codigo)',
    filters: {
      category_print_area_id: params.categoryPrintAreaId,
      tecnica_gravacao_id: params.tecnicaGravacaoId,
      is_active: true,
    },
    orderBy: { column: 'display_order', ascending: true },
  });

  return result.records || [];
}

// ============================================
// HELPER: Determinar max_colors do seletor
// ============================================

/**
 * Regras de UX para cores:
 * - max_colors = 0 → técnica não cobra por cor (ex: UV Digital)
 * - max_colors = 1 → não mostrar seletor de cores (ex: Laser)
 * - max_colors > 1 → mostrar seletor limitado a esse valor
 */
export function getColorSelectorConfig(maxColors: number) {
  if (maxColors === 0) {
    return { showSelector: false, maxValue: 0, label: 'Full Color (sem limite)' };
  }
  if (maxColors === 1) {
    return { showSelector: false, maxValue: 1, label: '1 cor (fixa)' };
  }
  return { showSelector: true, maxValue: maxColors, label: `Até ${maxColors} cores` };
}
