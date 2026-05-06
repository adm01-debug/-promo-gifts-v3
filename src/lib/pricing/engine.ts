// src/lib/pricing/engine.ts
/**
 * Core pricing engine for Promo Brindes.
 * Handles base prices, quantity brackets, and personalization costs.
 */

export interface PriceBracket {
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: number;
}

export interface PersonalizationOption {
  id: string;
  name: string;
  setupFee: number;
  unitPricePerColor: number;
  maxColors: number;
}

export interface PricingConfig {
  baseBrackets: PriceBracket[];
  personalizationOptions: PersonalizationOption[];
}

export class PricingEngine {
  constructor(private config: PricingConfig) {}

  /**
   * Calculates the unit price based on base brackets and quantity.
   */
  getBaseUnitPrice(quantity: number): number {
    const bracket = this.config.baseBrackets.find(
      b => quantity >= b.minQuantity && (b.maxQuantity === null || quantity <= b.maxQuantity)
    );
    
    if (!bracket) {
      // Return the last bracket price if quantity exceeds all maxQuantities
      return this.config.baseBrackets[this.config.baseBrackets.length - 1]?.unitPrice || 0;
    }
    
    return bracket.unitPrice;
  }

  /**
   * Calculates total personalization cost.
   */
  getPersonalizationTotal(
    optionId: string,
    quantity: number,
    colors: number,
    positions: number = 1
  ): { total: number; setupFee: number; unitCost: number } {
    const option = this.config.personalizationOptions.find(o => o.id === optionId);
    if (!option) throw new Error(`Personalization option ${optionId} not found`);

    const colorsToCharge = Math.min(colors, option.maxColors);
    const setupFeeTotal = option.setupFee * positions;
    const unitCostTotal = option.unitPricePerColor * colorsToCharge * quantity * positions;

    return {
      total: setupFeeTotal + unitCostTotal,
      setupFee: setupFeeTotal,
      unitCost: unitCostTotal / quantity,
    };
  }

  /**
   * Calculates the final total price.
   */
  calculateFinalTotal(
    quantity: number,
    personalization?: { optionId: string; colors: number; positions: number }
  ): { unitPrice: number; total: number; breakdown: any } {
    const baseUnitPrice = this.getBaseUnitPrice(quantity);
    let personalizationTotal = 0;
    let personalizationBreakdown = null;

    if (personalization) {
      const p = this.getPersonalizationTotal(
        personalization.optionId,
        quantity,
        personalization.colors,
        personalization.positions
      );
      personalizationTotal = p.total;
      personalizationBreakdown = p;
    }

    const subtotal = baseUnitPrice * quantity;
    const total = subtotal + personalizationTotal;

    return {
      unitPrice: total / quantity,
      total,
      breakdown: {
        subtotal,
        personalization: personalizationBreakdown,
      },
    };
  }
}
