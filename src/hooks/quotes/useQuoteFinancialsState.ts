import { useState } from 'react';

export function useQuoteFinancialsState() {
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [negotiationMarkup, setNegotiationMarkup] = useState(0);

  return {
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    negotiationMarkup,
    setNegotiationMarkup,
  };
}
