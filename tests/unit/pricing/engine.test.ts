// tests/unit/pricing/engine.test.ts
import { describe, it, expect } from 'vitest';
import { PricingEngine, PricingConfig } from '../../../src/lib/pricing/engine';

describe('PricingEngine', () => {
  const mockConfig: PricingConfig = {
    baseBrackets: [
      { minQuantity: 1, maxQuantity: 49, unitPrice: 10.0 },
      { minQuantity: 50, maxQuantity: 99, unitPrice: 8.5 },
      { minQuantity: 100, maxQuantity: null, unitPrice: 7.0 },
    ],
    personalizationOptions: [
      {
        id: 'serigrafia',
        name: 'Serigrafia',
        setupFee: 50.0,
        unitPricePerColor: 0.5,
        maxColors: 4,
      },
    ],
  };

  const engine = new PricingEngine(mockConfig);

  it('calculates correct base unit price for quantity 25', () => {
    expect(engine.getBaseUnitPrice(25)).toBe(10.0);
  });

  it('calculates correct base unit price for quantity 75', () => {
    expect(engine.getBaseUnitPrice(75)).toBe(8.5);
  });

  it('calculates correct base unit price for quantity 150', () => {
    expect(engine.getBaseUnitPrice(150)).toBe(7.0);
  });

  it('calculates personalization cost correctly', () => {
    const p = engine.getPersonalizationTotal('serigrafia', 100, 2, 1);
    // Setup fee (50) + (0.5 * 2 colors * 100 qty) = 50 + 100 = 150
    expect(p.total).toBe(150);
    expect(p.setupFee).toBe(50);
    expect(p.unitCost).toBe(1.0); // 100 / 100
  });

  it('calculates final total correctly', () => {
    const result = engine.calculateFinalTotal(100, {
      optionId: 'serigrafia',
      colors: 2,
      positions: 1,
    });
    // Base (100 * 7.0 = 700) + Personalization (150) = 850
    expect(result.total).toBe(850);
    expect(result.unitPrice).toBe(8.5);
  });
});
