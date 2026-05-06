import { useState } from 'react';
import { format, addDays } from 'date-fns';

export function useQuoteConditionsState() {
  const [validityDays, setValidityDays] = useState('7');
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'prazo' | 'data'>('prazo');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [shippingType, setShippingType] = useState('');
  const [shippingCost, setShippingCost] = useState(0);

  return {
    validityDays,
    setValidityDays,
    validUntil,
    setValidUntil,
    paymentTerms,
    setPaymentTerms,
    deliveryTime,
    setDeliveryTime,
    deliveryMode,
    setDeliveryMode,
    deliveryDate,
    setDeliveryDate,
    shippingType,
    setShippingType,
    shippingCost,
    setShippingCost,
  };
}
