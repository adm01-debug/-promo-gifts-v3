/**
 * Domain Transformers: Personalização
 * 
 * Funções puras para transformação entre formatos de dados.
 * Converte entre tipos de infraestrutura (API/DB) e tipos de domínio.
 */

import type {
  PriceTableInput,
  TechniqueInput,
  PriceTier,
} from './types';

import type {
  TabelaPrecoTecnica,
  TecnicaUnificada,
  FaixaQuantidade,
  CustomizationPriceTableRaw,
  PersonalizationTechniqueRaw,
} from '@/types/tecnica-unificada';

// ============================================
// FROM INFRASTRUCTURE TO DOMAIN
// ============================================

/**
 * Transforma TabelaPrecoTecnica (hook) para PriceTableInput (domain)
 */
export function tabelaToPriceTableInput(tabela: TabelaPrecoTecnica): PriceTableInput {
  return {
    id: tabela.id,
    tableCode: tabela.codigoTabela,
    tableCodeOption: tabela.codigoTabelaOpcao,
    techniqueName: tabela.nomeTecnica,
    
    maxColors: tabela.maxCores,
    maxWidthCm: tabela.larguraMaxCm,
    maxHeightCm: tabela.alturaMaxCm,
    minAreaCm2: tabela.areaMinCm2,
    maxAreaCm2: tabela.areaMaxCm2,
    
    priceByColor: tabela.precoPorCor,
    priceByArea: tabela.precoPorArea,
    priceByStitches: tabela.precoPorPontos,
    
    setupPrice: tabela.precoSetup,
    handlingPrice: tabela.precoManuseio,
    
    tiers: tabela.faixas.map(faixaToPriceTier),
    
    isActive: tabela.ativo,
  };
}

/**
 * Transforma FaixaQuantidade para PriceTier
 */
export function faixaToPriceTier(faixa: FaixaQuantidade, index?: number, arr?: FaixaQuantidade[]): PriceTier {
  const nextFaixa = arr && index !== undefined ? arr[index + 1] : undefined;
  
  return {
    tier: faixa.faixa,
    minQuantity: faixa.quantidadeMinima,
    maxQuantity: nextFaixa ? nextFaixa.quantidadeMinima - 1 : null,
    unitPrice: faixa.precoUnitario,
    slaDays: faixa.slaDias,
  };
}

/**
 * Transforma TecnicaUnificada para TechniqueInput
 */
export function tecnicaToTechniqueInput(tecnica: TecnicaUnificada): TechniqueInput {
  return {
    id: tecnica.id,
    code: tecnica.codigo,
    name: tecnica.nome,
    category: tecnica.categoria,
    
    requiresColors: tecnica.permiteCores,
    minColors: tecnica.minCores,
    maxColors: tecnica.maxCores,
    priceByColor: tecnica.precoPorCor,
    extraColorPrice: tecnica.precoCorExtra,
    
    priceByArea: tecnica.precoPorArea,
    priceByStitches: tecnica.precoPorPontos,
    minAreaCm2: tecnica.areaMinimaCm2,
    maxAreaCm2: tecnica.areaMaximaCm2,
    
    setupPrice: tecnica.custoSetup,
    handlingPrice: tecnica.custoManuseio,
    costMultiplier: tecnica.multiplicadorCusto,
    
    appliesToCurved: tecnica.aplicaSuperficieCurva,
    
    isActive: tecnica.ativo,
  };
}

// ============================================
// FROM RAW DB TO DOMAIN
// ============================================

/**
 * Transforma CustomizationPriceTableRaw (DB) para PriceTableInput (domain)
 */
export function rawTableToPriceTableInput(raw: CustomizationPriceTableRaw): PriceTableInput {
  const tiers = extractTiersFromRaw(raw);
  
  return {
    id: raw.id,
    tableCode: raw.table_code,
    tableCodeOption: raw.table_code_option,
    techniqueName: raw.customization_type_name,
    
    maxColors: raw.max_colors,
    maxWidthCm: raw.max_area_width_cm,
    maxHeightCm: raw.max_area_height_cm,
    minAreaCm2: raw.area_min_cm2,
    maxAreaCm2: raw.area_max_cm2,
    
    priceByColor: raw.price_by_color,
    priceByArea: raw.price_by_area,
    priceByStitches: raw.price_by_stitches,
    
    setupPrice: raw.setup_price,
    handlingPrice: raw.handling_price,
    
    tiers,
    
    isActive: raw.is_active,
  };
}

/**
 * Extrai faixas de preço do formato raw
 */
function extractTiersFromRaw(raw: CustomizationPriceTableRaw): PriceTier[] {
  const tiers: PriceTier[] = [];
  
  for (let i = 1; i <= 15; i++) {
    const minQty = raw[`min_qty_${i}` as keyof CustomizationPriceTableRaw] as number;
    const price = raw[`price_${i}` as keyof CustomizationPriceTableRaw] as number;
    const sla = raw[`sla_${i}` as keyof CustomizationPriceTableRaw] as number | null;
    
    if (minQty != null && price != null) {
      const nextMinQty = raw[`min_qty_${i + 1}` as keyof CustomizationPriceTableRaw] as number | undefined;
      
      tiers.push({
        tier: i,
        minQuantity: minQty,
        maxQuantity: nextMinQty ? nextMinQty - 1 : null,
        unitPrice: price,
        slaDays: sla ?? null,
      });
    }
  }
  
  return tiers;
}

/**
 * Transforma PersonalizationTechniqueRaw (DB) para TechniqueInput (domain)
 */
export function rawTechniqueToTechniqueInput(raw: PersonalizationTechniqueRaw): TechniqueInput {
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    category: raw.category,
    
    requiresColors: raw.requires_color_count,
    minColors: raw.min_colors,
    maxColors: raw.max_colors,
    priceByColor: raw.price_by_color,
    extraColorPrice: raw.extra_color_price,
    
    priceByArea: raw.price_by_area,
    priceByStitches: raw.price_by_stitches,
    minAreaCm2: raw.min_area_cm2,
    maxAreaCm2: raw.max_area_cm2,
    
    setupPrice: raw.setup_price,
    handlingPrice: raw.handling_price,
    costMultiplier: raw.base_cost_multiplier,
    
    appliesToCurved: raw.applies_to_curved,
    
    isActive: raw.is_active,
  };
}

// ============================================
// FROM DOMAIN TO DISPLAY
// ============================================

/**
 * Formata preço para exibição
 */
export function formatPrice(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * Formata área para exibição
 */
export function formatArea(widthCm: number, heightCm: number): string {
  return `${widthCm} x ${heightCm} cm`;
}

/**
 * Formata SLA para exibição
 */
export function formatSla(days: number | null): string {
  if (days === null) return 'A consultar';
  if (days === 0) return 'Pronta entrega';
  if (days === 1) return '1 dia útil';
  return `${days} dias úteis`;
}

/**
 * Formata economia para exibição
 */
export function formatSavings(percentOff: number): string {
  if (percentOff <= 0) return '';
  return `${percentOff}% de economia`;
}

// ============================================
// BATCH TRANSFORMATIONS
// ============================================

/**
 * Transforma array de tabelas
 */
export function transformTables(tabelas: TabelaPrecoTecnica[]): PriceTableInput[] {
  return tabelas.map(tabelaToPriceTableInput);
}

/**
 * Transforma array de técnicas
 */
export function transformTechniques(tecnicas: TecnicaUnificada[]): TechniqueInput[] {
  return tecnicas.map(tecnicaToTechniqueInput);
}

/**
 * Transforma array de tabelas raw
 */
export function transformRawTables(raws: CustomizationPriceTableRaw[]): PriceTableInput[] {
  return raws.map(rawTableToPriceTableInput);
}

/**
 * Transforma array de técnicas raw
 */
export function transformRawTechniques(raws: PersonalizationTechniqueRaw[]): TechniqueInput[] {
  return raws.map(rawTechniqueToTechniqueInput);
}
