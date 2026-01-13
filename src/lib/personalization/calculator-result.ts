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
  combine,
  flatMap,
  map,
} from '../result';
import type { PriceTier, PriceCalculationResult } from '@/types/domain';
import type { PriceTableInput, TechniqueInput } from './types';

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
}): Result<PriceCalculationResult, DomainError> {
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
              const setupCost = table.setupPrice || 0;
              const handlingCost = table.handlingPrice || 0;
              const total = subtotal + setupCost + handlingCost;

              const result: PriceCalculationResult = {
                unitPrice,
                subtotal,
                setupCost,
                handlingCost,
                total,
                breakdown: {
                  basePrice: tier.unitPrice,
                  colorAdjustment: colors && colors > 1 
                    ? unitPrice - tier.unitPrice 
                    : 0,
                  areaAdjustment: 0,
                  quantityDiscount: 0,
                },
                appliedTier: tier,
                warnings: [],
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
 * Calcula múltiplas tabelas e retorna a melhor
 */
export function findBestPrice(
  tables: PriceTableInput[],
  input: {
    quantity: number;
    colors?: number;
    area?: number;
  }
): Result<{ table: PriceTableInput; result: PriceCalculationResult }, DomainError> {
  const results = tables
    .map(table => ({
      table,
      result: calculateTotalPrice({ ...input, table }),
    }))
    .filter(({ result }) => result.ok)
    .map(({ table, result }) => ({
      table,
      result: (result as { ok: true; value: PriceCalculationResult }).value,
    }));

  if (results.length === 0) {
    return fail(DomainErrors.notFound('Tabela de preço válida'));
  }

  // Encontrar menor preço total
  const best = results.reduce((prev, curr) => 
    curr.result.total < prev.result.total ? curr : prev
  );

  return ok(best);
}
