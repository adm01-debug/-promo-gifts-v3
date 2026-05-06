/**
 * BulkVariantWizard — Wizard modal para selecionar cor/variante de cada produto
 * antes de adicioná-los em lote ao carrinho ou orçamento.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Package,
  AlertTriangle,
  SkipForward,
  ShoppingBag,
  FileText,
  Heart,
  GitCompare,
  FolderPlus,
} from 'lucide-react';
import {
  useExternalVariantStock,
  type ExternalVariantStock,
} from '@/hooks/useExternalVariantStock';
import type { Product } from '@/hooks/useProducts';
import { motion, AnimatePresence } from 'framer-motion';

export interface BulkVariantSelection {
  product: Product;
  variant: ExternalVariantStock | null;
  /** Permite múltiplos variantes para o mesmo produto (opcional para manter compatibilidade) */
  variants?: (ExternalVariantStock | null)[];
}

export type BulkWizardMode = 'cart' | 'quote' | 'favorite' | 'compare' | 'collection';

interface BulkVariantWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  mode: BulkWizardMode;
  onComplete: (selections: BulkVariantSelection[]) => void;
  /** Pré-popula o wizard (usado quando o usuário clica em "Voltar" no modal seguinte). */
  initialSelections?: BulkVariantSelection[];
  /** Índice inicial do produto a editar. */
  initialIndex?: number;
}

/* ── Step: variant picker for a single product ── */
function ProductVariantStep({
  product,
  onSelect,
  onSkip,
  stepIndex,
  totalSteps,
  initialVariants = [],
}: {
  product: Product;
  onSelect: (variants: (ExternalVariantStock | null)[]) => void;
  onSkip: () => void;
  stepIndex: number;
  totalSteps: number;
  initialVariants?: (ExternalVariantStock | null)[];
}) {
  const [selectedVariants, setSelectedVariants] =
    useState<(ExternalVariantStock | null)[]>(initialVariants);

  // Sincroniza se o produto mudar (via Voltar/Próximo)
  useEffect(() => {
    setSelectedVariants(initialVariants);
  }, [product.id, initialVariants]);

  const toggleVariant = (variant: ExternalVariantStock | null) => {
    setSelectedVariants((prev) => {
      const isSelected = prev.some((v) => v?.id === variant?.id);
      if (isSelected) {
        return prev.filter((v) => v?.id !== variant?.id);
      }
      return [...prev, variant];
    });
  };

  const handleConfirm = () => {
    if (selectedVariants.length === 0) {
      onSkip();
    } else {
      onSelect(selectedVariants);
    }
  };
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
        <ProductHeader product={product} step={stepIndex} total={totalSteps} />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (sortedVariants.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="space-y-3"
    >
      {/* Product info card */}
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-3">
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-12 w-12 shrink-0 rounded-xl border border-border/60 object-cover shadow-sm"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{product.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.sku}</p>
        </div>
        <Badge
          variant="outline"
          className="shrink-0 gap-1 border-success/30 text-[10px] text-success"
        >
          <Package className="h-3 w-3" />
          {fmt(totalStock)}
        </Badge>
      </div>

      {/* Skip / add without color */}
      <button
        onClick={() => toggleVariant(null)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all',
          selectedVariants.some((v) => v === null)
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-dashed border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/5',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-destructive/70 via-success/70 to-info/70 transition-transform group-hover:scale-110">
          {selectedVariants.some((v) => v === null) && (
            <Check className="h-4 w-4 text-white drop-shadow-sm" />
          )}
        </div>
        <span className="flex-1">Sem cor específica</span>
        <SkipForward className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
      </button>

      {/* Variant grid */}
      <div className="scrollbar-thin grid max-h-60 grid-cols-2 gap-2 overflow-y-auto pr-1">
        {sortedVariants.map((variant) => {
          const stock = variant.stock_quantity ?? 0;
          const isOutOfStock = stock === 0;
          const isSelected = selectedVariants.some((v) => v?.id === variant.id);

          return (
            <button
              key={variant.id}
              onClick={() => toggleVariant(variant)}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'hover:border-primary/50 hover:bg-accent/60',
                isOutOfStock && !isSelected
                  ? 'border-border/40 bg-muted/20 opacity-50'
                  : isSelected
                    ? 'border-primary'
                    : 'border-border/60 bg-card',
              )}
            >
              <div className="absolute right-2 top-2">
                {isSelected && <Check className="h-3 w-3 text-primary" />}
              </div>
              {variant.selected_thumbnail ? (
                <img
                  src={`${variant.selected_thumbnail}/thumbnail`}
                  alt={variant.color_name ?? ''}
                  className="h-10 w-10 shrink-0 rounded-xl border border-border/50 object-cover shadow-sm transition-transform group-hover:scale-105"
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
                  className="h-10 w-10 shrink-0 rounded-xl border border-border/50 shadow-sm transition-transform group-hover:scale-105"
                  style={{ backgroundColor: variant.color_hex || '#CCC' }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium leading-tight">
                  {variant.color_name || 'Sem nome'}
                  {variant.size_code && (
                    <span className="ml-1 text-muted-foreground">— {variant.size_code}</span>
                  )}
                </p>
                <div className="mt-1 flex items-center gap-1">
                  {isOutOfStock ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Sem estoque
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'flex items-center gap-0.5 text-[10px] font-medium',
                        isLowStock ? 'text-warning' : 'text-success',
                      )}
                    >
                      <Package className="h-2.5 w-2.5" />
                      {fmt(stock)} un
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="pt-2">
        <Button onClick={handleConfirm} className="w-full gap-2 shadow-sm" size="lg">
          {selectedVariants.length > 0 ? (
            <>
              Confirmar {selectedVariants.length}{' '}
              {selectedVariants.length === 1 ? 'Variação' : 'Variações'}
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Sem cor específica
              <SkipForward className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function ProductHeader({
  product,
  step,
  total,
}: {
  product: Product;
  step: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/40 p-3">
      {product.images?.[0] && (
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-12 w-12 shrink-0 rounded-xl border border-border/60 object-cover shadow-sm"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{product.sku}</p>
      </div>
      <Badge variant="secondary" className="text-[10px]">
        {step + 1}/{total}
      </Badge>
    </div>
  );
}

/* ── Progress bar with glow ── */
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  );
}

/* ── Main Wizard ── */
export function BulkVariantWizard({
  open,
  onOpenChange,
  products,
  mode,
  onComplete,
  initialSelections,
  initialIndex,
}: BulkVariantWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<BulkVariantSelection[]>([]);

  // Reset (ou restaura) quando modal abre
  useEffect(() => {
    if (open) {
      const seed = initialSelections ?? [];
      setSelections(seed);
      // Se vier initialIndex válido, usa; senão começa do início (ou do fim do seed)
      const startIdx =
        typeof initialIndex === 'number'
          ? Math.max(0, Math.min(initialIndex, products.length - 1))
          : 0;
      setCurrentIndex(startIdx);
    }
  }, [open, initialSelections, initialIndex, products.length]);

  const handleSelectMulti = useCallback(
    (selectedVariants: (ExternalVariantStock | null)[]) => {
      const product = products[currentIndex];

      // Criamos seleções individuais para cada variante escolhida
      // Isso mantém a compatibilidade com o BulkAddToCartModal que espera 1 item por linha
      const newItems: BulkVariantSelection[] = selectedVariants.map((v) => ({
        product,
        variant: v,
      }));

      // Removemos seleções anteriores deste produto (para evitar duplicatas em re-edição)
      const otherProductSelections = selections.filter((s) => s.product.id !== product.id);
      const updatedSelections = [...otherProductSelections, ...newItems];

      if (currentIndex + 1 >= products.length) {
        onComplete(updatedSelections);
        onOpenChange(false);
      } else {
        setSelections(updatedSelections);
        setCurrentIndex((i) => i + 1);
      }
    },
    [currentIndex, products, selections, onComplete, onOpenChange],
  );

  const handleSkip = useCallback(() => {
    handleSelectMulti([null]);
  }, [handleSelectMulti]);

  const handleBack = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const currentProduct = products[currentIndex];
  if (!currentProduct) return null;

  const modeConfig: Record<
    BulkWizardMode,
    { icon: typeof ShoppingBag; title: string; colorClass: string; bgClass: string }
  > = {
    cart: {
      icon: ShoppingBag,
      title: 'Adicionar ao Carrinho',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/15',
    },
    quote: {
      icon: FileText,
      title: 'Enviar para Orçamento',
      colorClass: 'text-success',
      bgClass: 'bg-success/15',
    },
    favorite: {
      icon: Heart,
      title: 'Favoritar com Cor',
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/15',
    },
    compare: {
      icon: GitCompare,
      title: 'Comparar com Cor',
      colorClass: 'text-primary',
      bgClass: 'bg-primary/15',
    },
    collection: {
      icon: FolderPlus,
      title: 'Coleção com Cor',
      colorClass: 'text-info',
      bgClass: 'bg-info/15',
    },
  };
  const { icon: Icon, title, colorClass } = modeConfig[mode];
  const bgClass = modeConfig[mode].bgClass;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Header */}
        <div className="space-y-3 px-5 pb-3 pt-5">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2.5 font-display text-base font-semibold">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                  bgClass,
                )}
              >
                <Icon className={cn('h-4 w-4', colorClass)} />
              </div>
              {title}
              <Badge variant="secondary" className="ml-auto text-[10px] font-medium tabular-nums">
                {products.length} produto{products.length > 1 ? 's' : ''}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <ProgressBar current={currentIndex} total={products.length} />

          <p className="text-xs leading-relaxed text-muted-foreground">
            Selecione uma ou mais cores/variações para cada produto e clique em "Confirmar".
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          <AnimatePresence mode="wait">
            <ProductVariantStep
              key={currentProduct.id}
              product={currentProduct}
              onSelect={handleSelectMulti}
              onSkip={handleSkip}
              stepIndex={currentIndex}
              totalSteps={products.length}
              initialVariants={selections
                .filter((s) => s.product.id === currentProduct.id)
                .map((s) => s.variant)}
            />
          </AnimatePresence>
        </div>

        {/* Bottom step indicator + Voltar */}
        <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/20 px-5 py-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIndex === 0}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
              'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              'disabled:pointer-events-none disabled:opacity-40',
            )}
            aria-label="Voltar para o produto anterior"
          >
            ← Voltar
          </button>
          <span className="text-[11px] text-muted-foreground">
            Produto <strong className="text-foreground">{currentIndex + 1}</strong> de{' '}
            <strong className="text-foreground">{products.length}</strong>
          </span>
          <div className="flex gap-1">
            {products.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-all duration-300',
                  i < currentIndex
                    ? 'bg-primary'
                    : i === currentIndex
                      ? 'w-4 bg-primary'
                      : 'bg-muted-foreground/20',
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
