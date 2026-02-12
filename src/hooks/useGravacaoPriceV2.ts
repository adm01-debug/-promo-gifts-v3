/**
 * useGravacaoPriceV2 - Fluxo para cálculo de preço de gravação
 * 
 * PASSO 1: Busca áreas de gravação via product_print_areas + tabela_preco_gravacao_oficial
 * PASSO 2: fn_get_customization_price_v2 → cálculo de preço com variante
 * 
 * NOTA: RPCs fn_get_product_print_areas e v2 referenciam tabela legacy inexistente.
 * Por isso usamos queries diretas nas tabelas reais.
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalRpc } from '@/lib/external-rpc';
import { invokeExternalDb } from '@/lib/external-db';

// ============================================
// TYPES
// ============================================

export interface TechniqueVariant {
  variante_id: string;
  nome: string;
  codigo: string;
  max_colors: number;
  is_recommended: boolean;
  has_pricing: boolean;
  override_width: number | null;
  override_height: number | null;
  notes: string | null;
}

export interface PrintAreaTechnique {
  id: string;
  nome: string;
  codigo: string;
  variantes: TechniqueVariant[];
}

export interface PrintAreaV2 {
  area_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  component_code: string | null;
  location_name: string | null;
  location_code: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  techniques: PrintAreaTechnique[];
}

export interface CustomizationPriceV2Result {
  success: boolean;
  technique: string;
  tabela_codigo: string;
  tabela_codigo_curto: string;
  codigo_orcamento: string;
  quantity: number;
  num_cores: number;
  cost_base_unit: number;
  cost_unit_total: number;
  cost_setup: number;
  cost_total: number;
  markup_percent: number;
  preco_minimo_unitario: number;
  unit_price: number;
  subtotal_pecas: number;
  faturamento_minimo_gravacao: number;
  minimum_applied: boolean;
  total_price: number;
  margin_percent: number;
  faixa_utilizada: number;
  prazo_dias: number;
}

// ============================================
// Interface RAW de product_print_areas
// ============================================

interface ProductPrintAreaRaw {
  id: string;
  product_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  component_code: string | null;
  location_name: string | null;
  location_code: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  is_active: boolean;
  allowed_technique_ids: string[] | null;
  customization_price_table_id: string | null;
}

interface TecnicaOficialRaw {
  id: string;
  codigo: string;
  codigo_curto: string;
  nome: string;
  grupo_tecnica: string;
  nome_grupo: string;
  max_cores: number;
  ativo: boolean;
}

// ============================================
// PASSO 1: Buscar áreas + técnicas via queries diretas
// ============================================

async function buildPrintAreasFromTables(productId: string): Promise<PrintAreaV2[]> {
  // 1. Buscar áreas do produto
  const areasResult = await invokeExternalDb<ProductPrintAreaRaw>({
    table: 'product_print_areas',
    operation: 'select',
    filters: { product_id: productId, is_active: true },
    orderBy: { column: 'display_order', ascending: true },
    limit: 50,
  });

  if (!areasResult.records.length) return [];

  // 2. Coletar todos os customization_price_table_id únicos das áreas
  const priceTableIds = new Set<string>();
  for (const area of areasResult.records) {
    if (area.customization_price_table_id) {
      priceTableIds.add(area.customization_price_table_id);
    }
  }

  // 3. Buscar técnicas ativas e filtrar apenas as referenciadas por este produto
  const techById = new Map<string, TecnicaOficialRaw>();
  if (priceTableIds.size > 0) {
    const techResults = await invokeExternalDb<TecnicaOficialRaw>({
      table: 'tabela_preco_gravacao_oficial',
      operation: 'select',
      filters: { ativo: true },
      orderBy: { column: 'nome', ascending: true },
      limit: 100,
    });
    // Filtrar client-side apenas as técnicas usadas por este produto
    for (const t of techResults.records) {
      if (priceTableIds.has(t.id)) {
        techById.set(t.id, t);
      }
    }
  }

  // 4. Montar PrintAreaV2 para cada área usando customization_price_table_id
  return areasResult.records.map(area => {
    const techniques: PrintAreaTechnique[] = [];
    const priceTableId = area.customization_price_table_id;

    if (priceTableId) {
      const tech = techById.get(priceTableId);
      if (tech) {
        techniques.push({
          id: tech.id,
          nome: tech.nome,
          codigo: tech.codigo,
          variantes: [{
            variante_id: tech.id,
            nome: tech.nome,
            codigo: tech.codigo,
            max_colors: tech.max_cores,
            is_recommended: true,
            has_pricing: true,
            override_width: null,
            override_height: null,
            notes: null,
          }],
        });
      }
    }

    return {
      area_id: area.id,
      area_code: area.area_code,
      area_name: area.area_name,
      component_name: area.component_name,
      component_code: area.component_code,
      location_name: area.location_name,
      location_code: area.location_code,
      max_width: area.max_width,
      max_height: area.max_height,
      unit: area.unit || 'cm',
      shape: area.shape || 'rectangle',
      is_curved: area.is_curved ?? false,
      is_primary: area.is_primary ?? false,
      display_order: area.display_order ?? 0,
      techniques,
    };
  });
}

export function useProductPrintAreasV2(productId: string | null) {
  return useQuery({
    queryKey: ['print-areas-v2', productId],
    queryFn: async (): Promise<PrintAreaV2[]> => {
      if (!productId) return [];
      return buildPrintAreasFromTables(productId);
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchProductPrintAreasV2(productId: string): Promise<PrintAreaV2[]> {
  return buildPrintAreasFromTables(productId);
}

// ============================================
// PASSO 2: Calcular preço
// ============================================

export interface CalculatePriceV2Params {
  tecnicaVarianteId: string;
  quantidade: number;
  numCores: number;
}

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

export function getColorSelectorConfig(maxColors: number) {
  if (maxColors === 0) {
    return { showSelector: false, maxValue: 0, label: 'Full Color (sem limite)' };
  }
  if (maxColors === 1) {
    return { showSelector: false, maxValue: 1, label: '1 cor (fixa)' };
  }
  return { showSelector: true, maxValue: maxColors, label: `Até ${maxColors} cores` };
}

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