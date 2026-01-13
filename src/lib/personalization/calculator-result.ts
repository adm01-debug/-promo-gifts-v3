/**
 * Calculator com Result Pattern
 * 
 * Versão das funções de cálculo usando Result<T, E>
 * para tratamento explícito de erros.
 */

import {
  Result,
  ok,
  fail,
  DomainError,
  DomainErrors,
  flatMap,
} from '../result';
import type { PriceTier, PriceCalculationResult } from '@/types/domain';
import type { PriceTableInput } from './types';

// ============================================
// ERROS ESPECÍFICOS DE CÁLCULO
// ============================================

export const CalculatorErrors = {
  noTierFound: (quantity: number) =>
    DomainErrors.notFound('Faixa de quantidade', `qty=${quantity}`),
  
  invalidQuantity: (quantity: number) =>
    DomainErrors.invalidInput('quantity', `Quantidade deve ser positiva: ${quantity}`),
  
  invalidArea: (area: number) =>
    DomainErrors.invalidInput('area', `Área deve ser positiva: ${area}`),
  
  invalidColors: (colors: number) =>
    DomainErrors.invalidInput('colors', `Número de cores inválido: ${colors}`),
  
  tableNotActive: (tableCode: string) =>
    DomainErrors.conflict('PriceTable', `Tabela ${tableCode} não está ativa`),
  
  areaExceedsLimit: (area: number, maxArea: number) =>
    DomainErrors.invalidInput('area', `Área ${area}cm² excede limite de ${maxArea}cm²`),
  
  colorsExceedLimit: (colors: number, maxColors: number) =>
    DomainErrors.invalidInput('colors', `${colors} cores excede limite de ${maxColors}`),
};

// ============================================
// RESULTADO INTERNO DO CALCULADOR
// ============================================

/**
 * Resultado de cálculo interno (simplificado)
 * Compatível com PriceCalculationResult do domínio
 */
export interface CalculatorResult {
  tableId: string;
  tableCode: string;
  techniqueName: string;
  quantity: number;
  tierUsed: number;
  unitPrice: number;
  subtotal: number;
  setupPrice: number;
  handlingPrice: number;
  grandTotal: number;
  slaDays: number | null;
  maxColors: number | null;
  maxArea: { widthCm: number; heightCm: number; areaCm2: number } | null;
  savings?: {
    perUnit: number;
    total: number;
    percentOff: number;
  };
}

// ============================================
// FUNÇÕES DE CÁLCULO COM RESULT
// ============================================

/**
 * Encontra faixa de preço para quantidade
 */
export function findTierForQuantity(
  tiers: PriceTier[],
  quantity: number
): Result<PriceTier, DomainError> {
  if (quantity <= 0) {
    return fail(CalculatorErrors.invalidQuantity(quantity));
  }

  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);
  
  const tier = sortedTiers.find((t, index) => {
    const nextTier = sortedTiers[index + 1];
    if (nextTier) {
      return quantity >= t.minQuantity && quantity < nextTier.minQuantity;
    }
    return quantity >= t.minQuantity;
  });

  if (!tier) {
    return fail(CalculatorErrors.noTierFound(quantity));
  }

  return ok(tier);
}

/**
 * Valida input de cálculo
 */
export function validateCalculationInput(input: {
  quantity: number;
  colors?: number;
  area?: number;
  table: PriceTableInput;
}): Result<typeof input, DomainError> {
  const { quantity, colors, area, table } = input;

  // Validar quantidade
  if (quantity <= 0) {
    return fail(CalculatorErrors.invalidQuantity(quantity));
  }

  // Validar tabela ativa
  if (!table.isActive) {
    return fail(CalculatorErrors.tableNotActive(table.tableCode));
  }

  // Validar cores se aplicável
  if (colors !== undefined && table.priceByColor) {
    if (colors <= 0) {
      return fail(CalculatorErrors.invalidColors(colors));
    }
    if (table.maxColors && colors > table.maxColors) {
      return fail(CalculatorErrors.colorsExceedLimit(colors, table.maxColors));
    }
  }

  // Validar área se aplicável
  if (area !== undefined && table.priceByArea) {
    if (area <= 0) {
      return fail(CalculatorErrors.invalidArea(area));
    }
    if (table.maxAreaCm2 && area > table.maxAreaCm2) {
      return fail(CalculatorErrors.areaExceedsLimit(area, table.maxAreaCm2));
    }
  }

  return ok(input);
}

/**
 * Calcula preço unitário
 */
export function calculateUnitPrice(
  tier: PriceTier,
  options: {
    colors?: number;
    area?: number;
    priceByColor?: boolean;
    priceByArea?: boolean;
  }
): Result<number, DomainError> {
  let price = tier.unitPrice;

  // Ajuste por cor (simplificado)
  if (options.priceByColor && options.colors && options.colors > 1) {
    // Lógica de preço por cor adicional
    price = price * (1 + (options.colors - 1) * 0.1);
  }

  // Ajuste por área (simplificado)
  if (options.priceByArea && options.area) {
    // Lógica de preço por área
    const areaFactor = Math.max(1, options.area / 50);
    price = price * areaFactor;
  }

  return ok(Math.round(price * 100) / 100);
}

/**
 * Calcula preço total com Result pattern
 */
export function calculateTotalPrice(input: {
  quantity: number;
  colors?: number;
  area?: number;
  table: PriceTableInput;
}): Result<CalculatorResult, DomainError> {
  // Pipeline de validação e cálculo
  return flatMap(
    validateCalculationInput(input),
    (validInput) => {
      const { quantity, colors, area, table } = validInput;

      return flatMap(
        findTierForQuantity(table.tiers, quantity),
        (tier) => {
          return flatMap(
            calculateUnitPrice(tier, {
              colors,
              area,
              priceByColor: table.priceByColor,
              priceByArea: table.priceByArea,
            }),
            (unitPrice) => {
              const subtotal = unitPrice * quantity;
              const setupPrice = table.setupPrice || 0;
              const handlingPrice = table.handlingPrice || 0;
              const grandTotal = subtotal + setupPrice + handlingPrice;

              const result: CalculatorResult = {
                tableId: table.id,
                tableCode: table.tableCode,
                techniqueName: table.techniqueName,
                quantity,
                tierUsed: tier.tier,
                unitPrice,
                subtotal,
                setupPrice,
                handlingPrice,
                grandTotal,
                slaDays: tier.slaDays,
                maxColors: table.maxColors,
                maxArea: table.maxWidthCm && table.maxHeightCm ? {
                  widthCm: table.maxWidthCm,
                  heightCm: table.maxHeightCm,
                  areaCm2: table.maxAreaCm2 || (table.maxWidthCm * table.maxHeightCm),
                } : null,
              };

              return ok(result);
            }
          );
        }
      );
    }
  );
}

/**
 * Converte CalculatorResult para PriceCalculationResult do domínio
 */
export function toCalculationResult(calc: CalculatorResult): PriceCalculationResult {
  return {
    tableId: calc.tableId,
    tableCode: calc.tableCode,
    techniqueName: calc.techniqueName,
    quantity: calc.quantity,
    tierUsed: calc.tierUsed,
    unitPrice: calc.unitPrice,
    subtotal: calc.subtotal,
    setupPrice: calc.setupPrice,
    handlingPrice: calc.handlingPrice,
    grandTotal: calc.grandTotal,
    slaDays: calc.slaDays,
    maxColors: calc.maxColors,
    maxArea: calc.maxArea,
    savings: calc.savings,
  };
}

/**
 * Calcula múltiplas tabelas e retorna a melhor
 */
export function findBestPrice(
  tables: PriceTableInput[],
  input: {
    quantity: number;
    colors?: number;
    area?: number;
  }
): Result<{ table: PriceTableInput; result: CalculatorResult }, DomainError> {
  const results = tables
    .map(table => ({
      table,
      result: calculateTotalPrice({ ...input, table }),
    }))
    .filter(({ result }) => result.ok)
    .map(({ table, result }) => ({
      table,
      result: (result as { ok: true; value: CalculatorResult }).value,
    }));

  if (results.length === 0) {
    return fail(DomainErrors.notFound('Tabela de preço válida'));
  }

  // Encontrar menor preço total
  const best = results.reduce((prev, curr) => 
    curr.result.grandTotal < prev.result.grandTotal ? curr : prev
  );

  return ok(best);
}
