/**
 * BulkVariantWizard — Wizard modal para selecionar cor/variante de cada produto
 * antes de adicioná-los em lote ao carrinho ou orçamento.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Package, AlertTriangle, Check, ChevronRight, SkipForward, ShoppingBag, FileText, Loader2,
} from 'lucide-react';
import { useExternalVariantStock, type ExternalVariantStock } from '@/hooks/useExternalVariantStock';
import type { Product } from '@/hooks/useProducts';

export interface BulkVariantSelection {
  product: Product;
  variant: ExternalVariantStock | null;
}

interface BulkVariantWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  mode: 'cart' | 'quote';
  onComplete: (selections: BulkVariantSelection[]) => void;
}

/* ── Step: variant picker for a single product ── */
function ProductVariantStep({
  product,
  onSelect,
  onSkip,
  stepIndex,
  totalSteps,
}: {
  product: Product;
  onSelect: (variant: ExternalVariantStock | null) => void;
  onSkip: () => void;
  stepIndex: number;
  totalSteps: number;
}) {
  const { data: variants, isLoading } = useExternalVariantStock(product.id);

  const sortedVariants = useMemo(() => {
    if (!variants) return [];
    return [...variants].sort((a, b) => {
      const aStock = a.stock_quantity ?? 0;
      const bStock = b.stock_quantity ?? 0;
      if (aStock > 0 && bStock === 0) return -1;
      if (aStock === 0 && bStock > 0) return 1;
      return (a.color_name ?? '').localeCompare(b.color_name ?? '');
    });
  }, [variants]);

  const totalStock = useMemo(
    () => sortedVariants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0),
    [sortedVariants],
  );

  const fmt = (qty: number) => (qty >= 1000 ? `${(qty / 1000).toFixed(1)}k` : qty.toString());

  // Auto-skip if no variants found
  useEffect(() => {
    if (!isLoading && sortedVariants.length === 0) {
      onSkip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, sortedVariants.length]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <StepHeader product={product} step={stepIndex} total={totalSteps} />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (sortedVariants.length === 0) return null;

  return (
    <div className="space-y-3">
      <StepHeader product={product} step={stepIndex} total={totalSteps} totalStock={totalStock} fmt={fmt} />

      {/* Skip / add without color */}
      <button
        onClick={onSkip}
        className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left text-sm text-muted-foreground"
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-destructive/80 via-success/80 to-info/80 border border-border shrink-0" />
        <span className="flex-1">Sem cor específica</span>
        <SkipForward className="h-3.5 w-3.5" />
      </button>

      {/* Variant grid */}
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {sortedVariants.map((variant) => {
          const stock = variant.stock_quantity ?? 0;
          const isOutOfStock = stock === 0;
          const isLowStock = stock > 0 && stock < 100;

          return (
            <button
              key={variant.id}
              onClick={() => onSelect(variant)}
              className={cn(
                'relative flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left',
                'hover:border-primary/50 hover:bg-accent',
                isOutOfStock
                  ? 'opacity-60 border-border bg-muted/30'
                  : 'border-border bg-card',
              )}
            >
              {variant.selected_thumbnail ? (
                <img
                  src={`${variant.selected_thumbnail}/thumbnail`}
                  alt={variant.color_name ?? ''}
                  className="w-9 h-9 rounded-md object-cover border border-border shrink-0"
                  onError={(e) => {
                    const t = e.currentTarget;
                    if (t.src.includes('/thumbnail')) {
                      t.src = variant.selected_thumbnail!;
                    } else {
                      t.style.display = 'none';
                    }
                  }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-md border border-border shrink-0"
                  style={{ backgroundColor: variant.color_hex || '#CCC' }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {variant.color_name || 'Sem nome'}
                  {variant.size_code && (
                    <span className="text-muted-foreground ml-1">— {variant.size_code}</span>
                  )}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isOutOfStock ? (
                    <span className="text-[10px] text-destructive flex items-center gap-0.5">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Sem estoque
                    </span>
                  ) : (
                    <span className={cn('text-[10px] font-medium', isLowStock ? 'text-warning' : 'text-success')}>
                      <Package className="h-2.5 w-2.5 inline mr-0.5" />
                      {fmt(stock)} un
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepHeader({
  product,
  step,
  total,
  totalStock,
  fmt,
}: {
  product: Product;
  step: number;
  total: number;
  totalStock?: number;
  fmt?: (q: number) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      {product.images?.[0] && (
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-10 h-10 rounded-md object-cover border border-border shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {totalStock !== undefined && fmt && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Package className="h-3 w-3" />
            {fmt(totalStock)}
          </Badge>
        )}
        <Badge variant="secondary" className="text-[10px]">
          {step + 1}/{total}
        </Badge>
      </div>
    </div>
  );
}

/* ── Progress bar ── */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? ((current) / total) * 100 : 0;
  return (
    <div className="h-1 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── Main Wizard ── */
export function BulkVariantWizard({ open, onOpenChange, products, mode, onComplete }: BulkVariantWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<BulkVariantSelection[]>([]);

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setSelections([]);
    }
  }, [open]);

  const handleSelect = useCallback(
    (variant: ExternalVariantStock | null) => {
      const product = products[currentIndex];
      const newSelections = [...selections, { product, variant }];

      if (currentIndex + 1 >= products.length) {
        onComplete(newSelections);
        onOpenChange(false);
      } else {
        setSelections(newSelections);
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentIndex, products, selections, onComplete, onOpenChange],
  );

  const handleSkip = useCallback(() => {
    handleSelect(null);
  }, [handleSelect]);

  const currentProduct = products[currentIndex];
  if (!currentProduct) return null;

  const icon = mode === 'cart' ? ShoppingBag : FileText;
  const Icon = icon;
  const title = mode === 'cart' ? 'Adicionar ao Carrinho' : 'Enviar para Orçamento';
  const colorClass = mode === 'cart' ? 'text-cart' : 'text-primary';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon className={cn('h-4 w-4', colorClass)} />
            {title}
            <Badge variant="outline" className="ml-auto text-xs">
              {products.length} produto{products.length > 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ProgressBar current={currentIndex} total={products.length} />

        <p className="text-xs text-muted-foreground">
          Escolha a cor/variação de cada produto. Clique em "Sem cor específica" para pular.
        </p>

        <ProductVariantStep
          key={currentProduct.id}
          product={currentProduct}
          onSelect={handleSelect}
          onSkip={handleSkip}
          stepIndex={currentIndex}
          totalSteps={products.length}
        />
      </DialogContent>
    </Dialog>
  );
}
