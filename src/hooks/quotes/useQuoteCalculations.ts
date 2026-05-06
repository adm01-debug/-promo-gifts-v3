import { useMemo, useCallback } from 'react';
import * as QuoteCalc from '@/logic/quotes/calculations';
import type { QuoteItem } from '@/hooks/useQuotes';

interface UseQuoteCalculationsProps {
  items: QuoteItem[];
  negotiationMarkup: number;
  discountType: 'percent' | 'amount';
  discountValue: number;
  shippingType: string;
  shippingCost: number;
}

export function useQuoteCalculations({
  items,
  negotiationMarkup,
  discountType,
  discountValue,
  shippingType,
  shippingCost,
}: UseQuoteCalculationsProps) {
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, []);

  const calculateItemPersonalizationTotal = useCallback((item: QuoteItem) => {
    return QuoteCalc.calculateItemPersonalizationTotal(item);
  }, []);

  const calculateItemTotal = useCallback((item: QuoteItem) => {
    return QuoteCalc.calculateItemTotal({
      quantity: item.quantity,
      unitPrice: item.unit_price,
      personalizations: item.personalizations,
    });
  }, []);

  const realSubtotal = useMemo(
    () =>
      QuoteCalc.calculateSubtotal(
        items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unit_price,
          personalizations: i.personalizations,
        })),
      ),
    [items],
  );

  const subtotal = useMemo(
    () => QuoteCalc.applyMarkup(realSubtotal, negotiationMarkup),
    [realSubtotal, negotiationMarkup],
  );

  const discountAmount = useMemo(
    () => QuoteCalc.calculateDiscountAmount(subtotal, discountType, discountValue),
    [subtotal, discountType, discountValue],
  );

  const shippingCostValue = useMemo(
    () => (shippingType === 'fob' || shippingType === 'fob_pre' ? shippingCost || 0 : 0),
    [shippingType, shippingCost],
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount + shippingCostValue),
    [subtotal, discountAmount, shippingCostValue],
  );

  const realDiscountPercent = useMemo(
    () => QuoteCalc.calculateRealDiscountPercent(realSubtotal, subtotal, discountAmount),
    [realSubtotal, subtotal, discountAmount],
  );

  return {
    formatCurrency,
    calculateItemPersonalizationTotal,
    calculateItemTotal,
    realSubtotal,
    subtotal,
    discountAmount,
    total,
    realDiscountPercent,
  };
}
