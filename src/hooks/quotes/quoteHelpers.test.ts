import { describe, it, expect } from 'vitest';
import { calculateQuoteTotals } from './quoteHelpers';
import { Quote, QuoteItem } from './quoteTypes';

describe('quoteHelpers', () => {
  describe('calculateQuoteTotals', () => {
    it('should calculate totals correctly for a simple quote', () => {
      const quote: Partial<Quote> = {
        discount_percent: 10,
        shipping_cost: 50,
      };
      
      const items: QuoteItem[] = [
        {
          id: '1',
          quantity: 100,
          unit_price: 10,
          personalizations: [
            { total_cost: 200 }
          ]
        } as any
      ];

      const totals = calculateQuoteTotals(quote, items);

      // (100 * 10) + 200 = 1200
      expect(totals.subtotal).toBe(1200);
      // 1200 - 10% = 1080
      // 1080 + 50 = 1130
      expect(totals.total).toBe(1130);
    });

    it('should handle zero quantities', () => {
      const items: QuoteItem[] = [
        { quantity: 0, unit_price: 10 } as any
      ];
      const totals = calculateQuoteTotals({}, items);
      expect(totals.subtotal).toBe(0);
      expect(totals.total).toBe(0);
    });
  });
});
