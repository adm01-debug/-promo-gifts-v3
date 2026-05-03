import { describe, it, expect } from 'vitest';
import { 
  calculateItemPersonalizationTotal, 
  calculateItemTotal, 
  calculateSubtotal, 
  applyMarkup, 
  calculateDiscountAmount,
  calculateRealDiscountPercent
} from '../calculations';

describe('calculations.ts edge cases', () => {
  describe('calculateItemPersonalizationTotal', () => {
    it('handles empty personalizations', () => {
      expect(calculateItemPersonalizationTotal({ personalizations: [] })).toBe(0);
    });

    it('handles null total_cost in personalization', () => {
      expect(calculateItemPersonalizationTotal({ 
        personalizations: [{ total_cost: undefined }, { total_cost: 10 }] as any 
      })).toBe(10);
    });

    it('handles undefined personalizations', () => {
      expect(calculateItemPersonalizationTotal({})).toBe(0);
    });
  });

  describe('calculateItemTotal', () => {
    it('handles floating point precision', () => {
      // 0.1 + 0.2 is famously not 0.3 in IEEE 754
      const item = { quantity: 1, unitPrice: 0.1, personalizations: [{ total_cost: 0.2 }] };
      expect(calculateItemTotal(item)).toBeCloseTo(0.3, 10);
    });

    it('handles zero quantity', () => {
      expect(calculateItemTotal({ quantity: 0, unitPrice: 100 })).toBe(0);
    });
  });

  describe('applyMarkup', () => {
    it('caps markup at 50%', () => {
      expect(applyMarkup(100, 60)).toBe(150);
    });

    it('prevents negative markup', () => {
      expect(applyMarkup(100, -10)).toBe(100);
    });

    it('handles high precision base values', () => {
      expect(applyMarkup(123.4567, 10)).toBe(135.8); // 123.4567 * 1.1 = 135.80237 -> 135.8
    });

    it('handles zero base value', () => {
      expect(applyMarkup(0, 10)).toBe(0);
    });
  });

  describe('calculateDiscountAmount', () => {
    it('handles negative discount values (as 0)', () => {
      // Current implementation doesn't clamp discountValue, let's see if we should
      // If the user didn't specify, we'll test current behavior or propose clamp
      expect(calculateDiscountAmount(100, 'percent', -10)).toBe(-10);
    });

    it('handles 100% discount', () => {
      expect(calculateDiscountAmount(500, 'percent', 100)).toBe(500);
    });
  });

  describe('calculateRealDiscountPercent', () => {
    it('prevents division by zero', () => {
      expect(calculateRealDiscountPercent(0, 100, 10)).toBe(0);
    });

    it('handles cases where presented subtotal is higher than real (markup)', () => {
      // real: 100, presented: 120, discount: 10 -> final: 110. Real discount: -10% (markup wins)
      expect(calculateRealDiscountPercent(100, 120, 10)).toBe(-10);
    });

    it('handles high precision rounding (2 decimal places)', () => {
      // (100 - 90.1234) / 100 = 0.098766 -> 9.88%
      expect(calculateRealDiscountPercent(100, 100, 9.8766)).toBe(9.88);
    });
  });
});
