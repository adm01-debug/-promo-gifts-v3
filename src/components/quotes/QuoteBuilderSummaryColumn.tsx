/**
 * QuoteBuilderSummaryColumn — Coluna 3: Resumo com cards de itens, desconto e CTAs
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Edit,
  Loader2,
  Package,
  Percent,
  Save,
  Send,
  Shield,
  ShoppingCart,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuoteItem } from '@/hooks/useQuotes';
import { NegotiationMarkupCard } from '@/components/quote/NegotiationMarkupCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getPriceFreshness } from '@/utils/price-freshness';
import { PriceFreshnessBadge } from '@/components/products/PriceFreshnessBadge';
import { toast } from 'sonner';

interface Props {
  items: QuoteItem[];
  activeItemIndex: number | null;
  setActiveItemIndex: (i: number | null) => void;
  removeItem: (i: number) => void;
  discountType: 'percent' | 'amount';
  setDiscountType: (v: 'percent' | 'amount') => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  discountAmount: number;
  total: number;
  isFormValid: boolean;
  isDraftValid: boolean;
  validationErrors: string[];
  quotesLoading: boolean;
  isEditMode: boolean;
  formatCurrency: (v: number) => string;
  calculateItemPersonalizationTotal: (item: QuoteItem) => number;
  calculateItemTotal: (item: QuoteItem) => number;
  onSave: (status: 'draft' | 'pending' | 'pending_approval', sellerNotes?: string) => void;
  maxDiscountPercent?: number | null;
  isDiscountExceeded?: boolean;
  negotiationMarkup?: number;
  setNegotiationMarkup?: (v: number) => void;
  realSubtotal?: number;
  realDiscountPercent?: number;
  /** Marca um item como "preço confirmado com fornecedor" — suprime alerta stale. */
  confirmItemPrice?: (index: number) => void;
  /** Marca todos os itens com preço aging/stale como confirmados. */
  confirmAllStalePrices?: () => void;
}

export function QuoteBuilderSummaryColumn({
  items,
  activeItemIndex,
  setActiveItemIndex,
  removeItem,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  discountAmount,
  total,
  isFormValid,
  isDraftValid,
  validationErrors,
  quotesLoading,
  isEditMode,
  formatCurrency,
  calculateItemPersonalizationTotal,
  calculateItemTotal,
  onSave,
  maxDiscountPercent,
  isDiscountExceeded,
  negotiationMarkup = 0,
  setNegotiationMarkup,
  realSubtotal = 0,
  realDiscountPercent = 0,
  confirmItemPrice,
  confirmAllStalePrices,
}: Props) {
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [sellerNotes, setSellerNotes] = useState('');
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [showOnlyStale, setShowOnlyStale] = useState(false);

  // ── Itens com preço pendente de confirmação (aging/stale e ainda não confirmado) ──
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const staleIndexes = useMemo(() => {
    const set = new Set<number>();
    safeItems.forEach((item, idx) => {
      if (item.price_confirmed_at) return;
      const f = getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days);
      if (f.shouldWarn) set.add(idx);
    });
    return set;
  }, [safeItems]);

  const staleCount = staleIndexes.size;
  const visibleItems = useMemo(
    () =>
      showOnlyStale
        ? safeItems.map((it, idx) => ({ it, idx })).filter(({ idx }) => staleIndexes.has(idx))
        : safeItems.map((it, idx) => ({ it, idx })),
    [safeItems, showOnlyStale, staleIndexes],
  );

  // Auto-desliga o filtro se a contagem zerar (após confirmar todos)
  if (showOnlyStale && staleCount === 0) {
    setTimeout(() => setShowOnlyStale(false), 0);
  }

  const handleRequestApproval = () => {
    onSave('pending_approval', sellerNotes);
    setApprovalDialogOpen(false);
    setSellerNotes('');
  };

  return (
    <div className="lg:col-span-4">
      <div className="sticky top-24">
        <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card shadow-xl">
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2 p-4 pb-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-display text-base font-semibold">Resumo (Apresentado)</h3>
          </div>

          {/* Stale price filter — só aparece quando há itens com preço pendente de confirmação */}
          {staleCount > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3">
              <button
                type="button"
                onClick={() => setShowOnlyStale((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border-[1.5px] px-2.5 py-1 text-xs font-medium transition-all',
                  showOnlyStale
                    ? 'border-warning bg-warning/15 text-warning shadow-sm'
                    : 'border-warning/40 bg-warning/5 text-warning hover:bg-warning/10',
                )}
                aria-pressed={showOnlyStale}
                aria-label={`Mostrar apenas ${staleCount} item(ns) com preço a confirmar`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Preços a confirmar</span>
                <Badge
                  variant="secondary"
                  className="h-4 border-0 bg-warning px-1.5 text-[10px] text-warning-foreground"
                >
                  {staleCount}
                </Badge>
                {showOnlyStale && <X className="ml-0.5 h-3 w-3" aria-hidden="true" />}
              </button>
              {confirmAllStalePrices && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 border-warning/40 px-2.5 text-xs text-warning hover:bg-warning/10 hover:text-warning"
                        onClick={() => setConfirmAllOpen(true)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirmar todos
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                      Confirmar que todos os preços stale foram validados com o fornecedor
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}

          {/* Product Cards */}
          <div className="max-h-[50vh] min-h-0 flex-1 overflow-y-auto px-4">
            <div className="space-y-3 pr-1">
              {items.length === 0 ? (
                <div className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 p-8 transition-all duration-300 hover:border-primary/30">
                  <div className="mb-3 rounded-full bg-muted/30 p-3 transition-colors group-hover:bg-primary/10">
                    <Package className="h-6 w-6 text-muted-foreground/40 group-hover:text-primary/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground group-hover:text-primary/70">
                    Nenhum item adicionado
                  </p>
                  <p className="mt-1 max-w-[150px] text-center text-[11px] text-muted-foreground/60">
                    Busque produtos na coluna ao lado para começar
                  </p>
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-warning/30 bg-warning/[0.03] p-6">
                  <CheckCircle2 className="mb-2 h-6 w-6 text-warning" />
                  <p className="text-sm font-medium text-warning">Preços Confirmados</p>
                  <button
                    type="button"
                    onClick={() => setShowOnlyStale(false)}
                    className="mt-2 text-xs text-muted-foreground underline transition-colors hover:text-foreground"
                  >
                    Ver todos os itens
                  </button>
                </div>
              ) : (
                visibleItems.map(({ it: item, idx }) => {
                  const persTotal = calculateItemPersonalizationTotal(item);
                  const isActive = activeItemIndex === idx;
                  const isStale = staleIndexes.has(idx);
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'cursor-pointer rounded-xl border transition-all',
                        isActive
                          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border/60 bg-muted/30 hover:border-border',
                        isStale && !isActive && 'border-warning/40 bg-warning/[0.04]',
                        isStale && isActive && 'ring-warning/30',
                      )}
                      onClick={() => setActiveItemIndex(idx)}
                    >
                      <div className="space-y-2 p-3">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0">
                            {item.product_image_url ? (
                              <img
                                src={item.product_image_url}
                                alt={item.product_name}
                                className="h-12 w-12 rounded-xl bg-muted object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium leading-tight">
                              {item.product_name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="h-4 px-1.5 py-0 font-mono text-[10px]"
                              >
                                {item.product_sku}
                              </Badge>
                              {item.color_name && (
                                <div className="flex items-center gap-1">
                                  <div
                                    className="h-2.5 w-2.5 rounded-full border border-border/50"
                                    style={{ backgroundColor: item.color_hex || '#CCC' }}
                                  />
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.color_name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Editar"
                                    className={cn(
                                      'h-6 w-6',
                                      isActive ? 'text-primary' : 'text-muted-foreground',
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveItemIndex(idx);
                                    }}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                                  Ajustar quantidades e personalização deste item
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Excluir"
                                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItem(idx);
                                      if (activeItemIndex === idx) setActiveItemIndex(null);
                                      else if (activeItemIndex !== null && activeItemIndex > idx)
                                        setActiveItemIndex(activeItemIndex - 1);
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                                  Remover este produto do orçamento
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Qtd:</span>
                          <span className="font-medium">{item.quantity}</span>
                          <span className="text-muted-foreground">×</span>
                          <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                          <span className="ml-auto font-semibold tabular-nums text-foreground">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </span>
                        </div>
                        {(item.price_updated_at || item.price_confirmed_at) && (
                          <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                            <PriceFreshnessBadge
                              priceUpdatedAt={item.price_updated_at}
                              thresholdDays={item.price_freshness_threshold_days}
                              confirmedAt={item.price_confirmed_at}
                              variant="inline"
                              onConfirm={
                                confirmItemPrice
                                  ? () => {
                                      confirmItemPrice(idx);
                                      toast.success('Preço confirmado com fornecedor', {
                                        description: item.product_name,
                                      });
                                    }
                                  : undefined
                              }
                            />
                          </div>
                        )}
                      </div>
                      {item.personalizations && item.personalizations.length > 0 && (
                        <div className="px-3 pb-3 pt-0">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Gravações ({item.personalizations.length})
                            </span>
                            <span className="text-xs font-semibold tabular-nums text-primary">
                              {formatCurrency(persTotal)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {item.personalizations.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between gap-1 rounded-xl border border-border/40 bg-card px-2 py-1 text-xs"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                  <Badge
                                    variant="secondary"
                                    className="h-4 shrink-0 px-1 py-0 text-[9px] font-bold"
                                  >
                                    {pIdx + 1}
                                  </Badge>
                                  <div className="min-w-0">
                                    <span className="block truncate text-[11px] font-medium text-primary">
                                      {p.technique_name}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                      {p.width_cm && p.height_cm && (
                                        <span>
                                          {p.width_cm}×{p.height_cm}cm
                                        </span>
                                      )}
                                      {p.personalized_quantity && (
                                        <span>• {p.personalized_quantity} pç(s)</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="shrink-0 font-bold tabular-nums text-foreground">
                                  {formatCurrency(p.total_cost || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Discount */}
          {items.length > 0 && (
            <div className="space-y-2.5 px-4 pt-3">
              {maxDiscountPercent != null && (
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                    isDiscountExceeded
                      ? 'border border-amber-500/30 bg-amber-500/10'
                      : 'bg-muted/50',
                  )}
                >
                  <Shield
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      isDiscountExceeded ? 'text-amber-500' : 'text-muted-foreground',
                    )}
                  />
                  <span className="text-muted-foreground">
                    Seu limite:{' '}
                    <span
                      className={cn(
                        'font-bold',
                        isDiscountExceeded ? 'text-amber-500' : 'text-foreground',
                      )}
                    >
                      {maxDiscountPercent}%
                    </span>
                  </span>
                  {isDiscountExceeded && (
                    <Badge
                      variant="secondary"
                      className="ml-auto h-4 gap-0.5 border-amber-500/30 bg-amber-500/15 text-[9px] font-semibold text-amber-600"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" /> Excedido
                    </Badge>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Select
                  value={discountType}
                  onValueChange={(v) => setDiscountType(v as 'percent' | 'amount')}
                >
                  <SelectTrigger className="h-8 w-16 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="amount">R$</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={discountType === 'percent' ? 1 : 0.01}
                  max={discountType === 'percent' ? 100 : undefined}
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="Desconto"
                  className={cn(
                    'h-8 text-sm transition-all',
                    isDiscountExceeded &&
                      'border-amber-500 bg-amber-500/[0.03] ring-2 ring-amber-500/20',
                  )}
                />
              </div>
              {isDiscountExceeded && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold text-amber-600">
                      Desconto acima do autorizado
                    </p>
                    <p className="mt-0.5 text-[11px] text-amber-600/80">
                      O orçamento será enviado para aprovação do administrador antes de poder ser
                      finalizado.
                    </p>
                  </div>
                </div>
              )}
              {discountAmount > 0 && !isDiscountExceeded && (
                <div className="flex justify-between text-xs text-destructive">
                  <span>Desconto aplicado</span>
                  <span className="font-semibold tabular-nums">
                    -{formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Negotiation Markup (uso interno) */}
          {items.length > 0 && setNegotiationMarkup && (
            <div className="px-4 pt-3">
              <NegotiationMarkupCard
                value={negotiationMarkup}
                onChange={setNegotiationMarkup}
                realSubtotal={realSubtotal}
                apparentDiscountPercent={
                  discountType === 'percent'
                    ? discountValue
                    : realSubtotal > 0
                      ? (discountValue / (realSubtotal * (1 + (negotiationMarkup || 0) / 100))) *
                        100
                      : 0
                }
                realDiscountPercent={realDiscountPercent}
                maxDiscountPercent={maxDiscountPercent ?? null}
              />
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 shrink-0 space-y-3 border-t border-border/50 px-4 pb-4 pt-3">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <span className="text-base font-bold">Total</span>
                {items.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    ≈
                    {formatCurrency(
                      items.reduce((s, i) => s + i.quantity, 0) > 0
                        ? total / items.reduce((s, i) => s + i.quantity, 0)
                        : 0,
                    )}
                    /un.
                  </p>
                )}
              </div>
              <span className="text-xl font-bold tabular-nums text-primary">
                {formatCurrency(total)}
              </span>
            </div>

            {!isFormValid && (
              <div className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="flex items-center gap-1 text-xs font-semibold text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Campos obrigatórios pendentes:
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-xs text-destructive/80">
                  {validationErrors.includes('empresa') && <li>Empresa</li>}
                  {validationErrors.includes('contato') && <li>Contato</li>}
                  {validationErrors.includes('prazo_pagamento') && <li>Prazo de Pagamento</li>}
                  {validationErrors.includes('prazo_entrega') && <li>Prazo de Entrega</li>}
                  {validationErrors.includes('frete') && <li>Frete</li>}
                  {validationErrors.includes('valor_frete') && <li>Valor do Frete</li>}
                  {validationErrors.includes('itens') && <li>Itens do Orçamento</li>}
                </ul>
              </div>
            )}

            {isDiscountExceeded ? (
              <Button
                size="lg"
                className="h-12 w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-bold text-white shadow-lg shadow-warning/20 hover:from-amber-600 hover:to-amber-700"
                onClick={() => setApprovalDialogOpen(true)}
                disabled={quotesLoading || !isFormValid}
              >
                {quotesLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Shield className="h-5 w-5" />
                )}
                Solicitar Aprovação
              </Button>
            ) : (
              <Button
                size="lg"
                className="h-12 w-full gap-2 bg-gradient-to-r from-primary to-primary/80 text-sm font-bold shadow-lg shadow-primary/20"
                onClick={() => onSave('pending')}
                disabled={quotesLoading || !isFormValid}
              >
                {quotesLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                {isEditMode ? 'Salvar' : 'Criar'}
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onSave('draft')}
              disabled={quotesLoading || !isDraftValid}
            >
              {quotesLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? 'Salvar Alterações' : 'Salvar Rascunho'}
            </Button>
          </div>
        </div>
      </div>

      {/* Approval Request Dialog */}
      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Solicitar Aprovação de Desconto
            </DialogTitle>
            <DialogDescription>
              O desconto de{' '}
              <span className="font-semibold text-foreground">
                {discountType === 'percent' ? `${discountValue}%` : formatCurrency(discountValue)}
              </span>{' '}
              excede seu limite de{' '}
              <span className="font-semibold text-foreground">{maxDiscountPercent}%</span>.
              Justifique o motivo para o administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Visual comparison */}
            <div className="space-y-2 rounded-xl border border-border/40 bg-muted/50 p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Seu Limite
                  </p>
                  <p className="mt-0.5 text-sm font-semibold">{maxDiscountPercent}%</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Solicitado
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-amber-500">
                    {discountType === 'percent'
                      ? `${discountValue}%`
                      : formatCurrency(discountValue)}
                  </p>
                </div>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/40"
                  style={{ width: `${Math.min(maxDiscountPercent || 0, 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-amber-500"
                  style={{
                    width: `${Math.min(discountType === 'percent' ? discountValue : 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Justificativa <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                value={sellerNotes}
                onChange={(e) => setSellerNotes(e.target.value)}
                placeholder="Ex: Cliente estratégico, pedido de grande volume, negociação especial..."
                rows={3}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700"
              onClick={handleRequestApproval}
              disabled={quotesLoading}
            >
              {quotesLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Enviar para Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm All Stale Prices Dialog */}
      <ConfirmDialog
        open={confirmAllOpen}
        onOpenChange={setConfirmAllOpen}
        variant="warning"
        title="Confirmar preços com o fornecedor?"
        description={`Você está confirmando que validou ${staleCount} preço(s) diretamente com o(s) fornecedor(es). O alerta de preço defasado será removido destes itens neste orçamento.`}
        confirmText={`Confirmar ${staleCount} preço${staleCount === 1 ? '' : 's'}`}
        cancelText="Cancelar"
        onConfirm={() => {
          confirmAllStalePrices?.();
          setConfirmAllOpen(false);
          setShowOnlyStale(false);
          toast.success(`${staleCount} preço(s) confirmado(s) com fornecedor`);
        }}
      />
    </div>
  );
}
