import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { validateQuoteForm, QUOTE_FIELD_LABELS } from '@/lib/validations';
import { getPriceFreshness } from '@/utils/price-freshness';
import type { QuoteItem } from '@/hooks/useQuotes';
import type { QuoteTemplate, QuoteTemplateItem } from '@/hooks/useQuoteTemplates';
import type { SelectedCompanyInfo, SelectedContactInfo } from '@/components/quotes/CompanyContactSelector';

interface UseQuoteActionsProps {
  clientId: string;
  contactId: string;
  contactInfo: SelectedContactInfo | null;
  companyInfo: SelectedCompanyInfo | null;
  items: QuoteItem[];
  discountType: 'percent' | 'amount';
  discountValue: number;
  negotiationMarkup: number;
  notes: string;
  internalNotes: string;
  validUntil: string;
  paymentTerms: string;
  deliveryTime: string;
  shippingType: string;
  shippingCost: number;
  isEditMode: boolean;
  quoteId: string | undefined;
  maxDiscountPercent: number | null;
  realDiscountPercent: number;
  setItems: (items: QuoteItem[]) => void;
  setDiscountType: (type: 'percent' | 'amount') => void;
  setDiscountValue: (value: number) => void;
  setNotes: (notes: string) => void;
  setInternalNotes: (notes: string) => void;
  setValidUntil: (date: string) => void;
  setTemplateApplied: (name: string | null) => void;
  updateQuote: any;
  createQuote: any;
  requestApproval: any;
  clearAutoSave: () => void;
}

export function useQuoteActions({
  clientId,
  contactId,
  contactInfo,
  companyInfo,
  items,
  discountType,
  discountValue,
  negotiationMarkup,
  notes,
  internalNotes,
  validUntil,
  paymentTerms,
  deliveryTime,
  shippingType,
  shippingCost,
  isEditMode,
  quoteId,
  maxDiscountPercent,
  realDiscountPercent,
  setItems,
  setDiscountType,
  setDiscountValue,
  setNotes,
  setInternalNotes,
  setValidUntil,
  setTemplateApplied,
  updateQuote,
  createQuote,
  requestApproval,
  clearAutoSave,
}: UseQuoteActionsProps) {
  const navigate = useNavigate();

  const validationErrors = useMemo(
    () =>
      validateQuoteForm({
        clientId,
        contactId,
        paymentTerms,
        deliveryTime,
        shippingType,
        shippingCost,
        itemsCount: items.length,
      }),
    [clientId, contactId, paymentTerms, deliveryTime, shippingType, shippingCost, items],
  );

  const isFormValid = validationErrors.length === 0;
  const isDraftValid = !!clientId;

  const applyTemplate = useCallback((template: QuoteTemplate) => {
    const newItems: QuoteItem[] = template.items_data.map((item) => ({
      product_id: item.productId || '',
      product_name: item.productName,
      product_sku: item.productSku,
      product_image_url: item.productImageUrl,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      color_name: item.colorName,
      color_hex: item.colorHex,
      personalizations: item.personalizations?.map((p) => ({
        technique_id: p.techniqueId,
        technique_name: p.techniqueName,
        colors_count: p.colorsCount,
        positions_count: p.positionsCount,
        unit_cost: p.unitCost,
        setup_cost: p.setupCost,
      })),
    }));
    setItems(newItems);
    if (template.discount_percent > 0) {
      setDiscountType('percent');
      setDiscountValue(template.discount_percent);
    } else if (template.discount_amount > 0) {
      setDiscountType('amount');
      setDiscountValue(template.discount_amount);
    }
    if (template.notes) setNotes(template.notes);
    if (template.internal_notes) setInternalNotes(template.internal_notes);
    if (template.validity_days)
      setValidUntil(format(addDays(new Date(), template.validity_days), 'yyyy-MM-dd'));
    setTemplateApplied(template.name);
    toast.success(`Template "${template.name}" aplicado!`);
  }, [setItems, setDiscountType, setDiscountValue, setNotes, setInternalNotes, setValidUntil, setTemplateApplied]);

  const getTemplateItems = useCallback((): QuoteTemplateItem[] => {
    return items.map((item) => ({
      productId: item.product_id,
      productSku: item.product_sku,
      productName: item.product_name,
      productImageUrl: item.product_image_url,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      colorName: item.color_name,
      colorHex: item.color_hex,
      personalizations: item.personalizations?.map((p) => ({
        techniqueId: p.technique_id,
        techniqueName: p.technique_name || '',
        colorsCount: p.colors_count,
        positionsCount: p.positions_count,
        unitCost: p.unit_cost,
        setupCost: p.setup_cost,
      })),
    }));
  }, [items]);

  const handleSaveQuote = useCallback(
    async (status: 'draft' | 'pending' | 'pending_approval' = 'draft', sellerNotes?: string) => {
      if (status === 'draft') {
        if (!isDraftValid) {
          toast.error('Selecione uma empresa para salvar o rascunho.');
          return;
        }
      } else if (!isFormValid) {
        const missing = validationErrors.map((e) => QUOTE_FIELD_LABELS[e] || e).join(', ');
        toast.error(`Preencha os campos obrigatórios: ${missing}`);
        return;
      }

      if (status !== 'draft') {
        const staleUnconfirmed = items.filter((item) => {
          if (item.price_confirmed_at) return false;
          const f = getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days);
          return f.isStale;
        });
        if (staleUnconfirmed.length > 0) {
          const names = staleUnconfirmed.slice(0, 3).map((i) => i.product_name).filter(Boolean).join(', ');
          const extra = staleUnconfirmed.length > 3 ? ` e mais ${staleUnconfirmed.length - 3}` : '';
          toast.error('Confirme os preços defasados antes de fechar o orçamento', {
            description: `${staleUnconfirmed.length} ${staleUnconfirmed.length === 1 ? 'item está' : 'itens estão'} com preço possivelmente defasado: ${names}${extra}.`,
            duration: 8000,
          });
          return;
        }
      }

      const effectiveStatus = status === 'pending_approval' ? 'pending_approval' : status;

      const quoteData = {
        client_id: clientId || undefined,
        client_name: contactInfo?.name || undefined,
        client_company: companyInfo?.name || undefined,
        client_cnpj: companyInfo?.cnpj || undefined,
        client_email: contactInfo?.email || undefined,
        client_phone: contactInfo?.phone || undefined,
        status: effectiveStatus,
        discount_percent: discountType === 'percent' ? discountValue : 0,
        discount_amount: discountType === 'amount' ? discountValue : 0,
        negotiation_markup_percent: Math.min(50, Math.max(0, negotiationMarkup || 0)),
        notes: notes || undefined,
        internal_notes: internalNotes || undefined,
        valid_until: validUntil || undefined,
        payment_terms: paymentTerms || undefined,
        delivery_time: deliveryTime || undefined,
        shipping_type: shippingType || undefined,
        shipping_cost: (shippingType === 'fob_pre' || shippingType === 'fob') ? shippingCost : undefined,
      };

      let result;
      if (isEditMode && quoteId) {
        result = await updateQuote(quoteId, quoteData, items);
      } else {
        result = await createQuote(quoteData, items);
      }

      if (result && status === 'pending_approval' && maxDiscountPercent != null) {
        await requestApproval(result.id, realDiscountPercent, maxDiscountPercent, sellerNotes);
      }

      if (result) {
        clearAutoSave();
        navigate(`/orcamentos/${result.id}`);
      }
    },
    [isDraftValid, isFormValid, validationErrors, clientId, contactInfo, companyInfo, discountType, discountValue, negotiationMarkup, realDiscountPercent, notes, internalNotes, validUntil, paymentTerms, deliveryTime, shippingType, shippingCost, isEditMode, quoteId, items, navigate, updateQuote, createQuote, maxDiscountPercent, requestApproval, clearAutoSave]
  );

  return {
    validationErrors,
    isFormValid,
    isDraftValid,
    applyTemplate,
    getTemplateItems,
    handleSaveQuote,
  };
}
