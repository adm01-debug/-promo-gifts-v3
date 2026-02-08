/**
 * useGravacaoPriceV2 - Fluxo SIMPLIFICADO de 2 passos para cálculo de preço de gravação
 * 
 * FLUXO v3 (simplificado):
 * PASSO 1: fn_get_product_print_areas_v2 → áreas + técnicas + VARIANTES (tudo em 1 call)
 * PASSO 2: fn_get_customization_price_v2 → cálculo de preço com variante
 * 
 * NÃO USAR (desatualizadas):
 * - fn_get_product_print_areas (v1 — não retorna variantes)
 * - fn_get_customization_price (v1 — usa area_id)
 * - Queries diretas em category_area_techniques
 * 
 * São apenas 2 chamadas. O frontend NÃO precisa consultar tabela intermediária.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalRpc } from '@/lib/external-rpc';

// ============================================
// TYPES - Retorno de fn_get_product_print_areas_v2
// ============================================

/** Variante de uma técnica de gravação */
export interface TechniqueVariant {
  variante_id: string;     // ★ UUID para fn_get_customization_price_v2
  nome: string;            // Nome completo (ex: "Fiber Laser | Plana")
  codigo: string;          // Código (ex: "FIBER_LASER_PLANA")
  max_colors: number;      // 0 = ilimitado, 1 = mono, >1 = até N cores
  is_recommended: boolean; // Variante recomendada (⭐)
  has_pricing: boolean;    // false = "preço sob consulta"
  override_width: number | null;
  override_height: number | null;
  notes: string | null;
}

/** Técnica mestre com variantes */
export interface PrintAreaTechnique {
  id: string;        // ID mestre — NÃO usar para preço
  nome: string;      // Nome da técnica mestre (ex: "Fiber Laser")
  codigo: string;    // Código (ex: "LASER")
  variantes: TechniqueVariant[];
}

/** Área de gravação completa (retorno de fn_get_product_print_areas_v2) */
export interface PrintAreaV2 {
  area_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  location_name: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  techniques: PrintAreaTechnique[];
}

// ============================================
// TYPES - Retorno de fn_get_customization_price_v2
// ============================================

/**
 * Retorno completo da fn_get_customization_price_v2
 * 
 * REGRAS DE NEGÓCIO:
 * - Markup 115%: custo × 2.15 = preço de venda (já calculado pela função)
 * - Setup = faturamento mínimo (piso): NÃO é somado ao total
 *   Se subtotal < piso → cobra o piso. Senão → cobra o subtotal.
 */
export interface CustomizationPriceV2Result {
  success: boolean;
  technique: string;                     // Nome completo para exibir
  tabela_codigo: string;
  tabela_codigo_curto: string;
  codigo_orcamento: string;              // Ref. para orçamento (ex: "SC01-1-02")
  quantity: number;
  num_cores: number;

  // Custos base (sem markup)
  cost_base_unit: number;
  cost_unit_total: number;
  cost_setup: number;
  cost_total: number;

  // Markup
  markup_percent: number;                // Ex: 115.0
  preco_minimo_unitario: number;

  // Preços finais (com markup)
  unit_price: number;                    // Preço unitário de gravação
  subtotal_pecas: number;                // unit_price × quantidade
  faturamento_minimo_gravacao: number;   // Piso mínimo
  minimum_applied: boolean;              // true = cobrou o mínimo

  total_price: number;                   // ★ VALOR FINAL DA GRAVAÇÃO

  // Margem e faixa
  margin_percent: number;
  faixa_utilizada: number;
  prazo_dias: number;
}

// ============================================
// PASSO 1: Buscar áreas + técnicas + variantes (1 call = tudo)
// ============================================

/**
 * Hook: Busca áreas de gravação de um produto com técnicas E variantes
 * Usa fn_get_product_print_areas_v2 — retorna TUDO em 1 chamada.
 * 
 * Substitui: fn_get_product_print_areas + category_area_techniques
 */
export function useProductPrintAreasV2(productId: string | null) {
  return useQuery({
    queryKey: ['print-areas-v2', productId],
    queryFn: async (): Promise<PrintAreaV2[]> => {
      if (!productId) return [];

      const result = await invokeExternalRpc<PrintAreaV2[]>(
        'fn_get_product_print_areas_v2',
        { p_product_id: productId }
      );

      return Array.isArray(result) ? result : [];
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Função standalone para buscar áreas v2 (sem hook)
 * Útil para uso em Promise.all() no simulador
 */
export async function fetchProductPrintAreasV2(
  productId: string
): Promise<PrintAreaV2[]> {
  const result = await invokeExternalRpc<PrintAreaV2[]>(
    'fn_get_product_print_areas_v2',
    { p_product_id: productId }
  );
  return Array.isArray(result) ? result : [];
}

// ============================================
// PASSO 2: Calcular preço com fn_get_customization_price_v2
// ============================================

export interface CalculatePriceV2Params {
  tecnicaVarianteId: string;    // UUID da VARIANTE (passo 1 → variantes[].variante_id)
  quantidade: number;
  numCores: number;             // Padrão: 1
}

/**
 * Hook: Calcula preço de gravação usando fn_get_customization_price_v2
 * 
 * ⚠️ USAR SEMPRE fn_get_customization_price_v2
 * O variante_id vem do passo 1 (fn_get_product_print_areas_v2)
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
 * Hook reativo: Calcula preço automaticamente quando parâmetros mudam
 */
export function useCustomizationPriceReactive(
  varianteId: string | null,
  quantidade: number,
  numCores: number = 1
) {
  const [price, setPrice] = useState<CustomizationPriceV2Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!varianteId || quantidade <= 0) {
      setPrice(null);
      return;
    }

    setLoading(true);
    setError(null);

    invokeExternalRpc<CustomizationPriceV2Result>(
      'fn_get_customization_price_v2',
      {
        p_tecnica_variante_id: varianteId,
        p_quantidade: quantidade,
        p_num_cores: numCores,
      }
    )
      .then((data) => {
        if (data && !data.success) {
          setError('Erro no cálculo');
        } else {
          setPrice(data);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao calcular preço');
      })
      .finally(() => setLoading(false));
  }, [varianteId, quantidade, numCores]);

  return { price, loading, error };
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

// ============================================
// HELPERS
// ============================================

/**
 * Regras de UX para cores:
 * - max_colors = 0 → técnica não cobra por cor (ex: UV Digital) → NÃO mostrar seletor
 * - max_colors = 1 → monocromática (ex: Laser) → NÃO mostrar seletor
 * - max_colors > 1 → mostrar seletor de 1 até max_colors cores
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

/**
 * Flatten todas as variantes de todas as técnicas de uma área
 * para uso em comparação de preços
 */
export function flattenVariantsFromArea(area: PrintAreaV2): Array<{
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  variant: TechniqueVariant;
}> {
  const results: Array<{
    techniqueId: string;
    techniqueName: string;
    techniqueCode: string;
    variant: TechniqueVariant;
  }> = [];

  for (const tech of area.techniques) {
    for (const variant of tech.variantes) {
      results.push({
        techniqueId: tech.id,
        techniqueName: tech.nome,
        techniqueCode: tech.codigo,
        variant,
      });
    }
  }

  return results;
}
