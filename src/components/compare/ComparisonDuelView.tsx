/**
 * ComparisonDuelView — Layout 2-coluna "duelo" para compareCount === 2.
 * Fotos enormes, atributos em zebra alternada, vencedor da linha em destaque.
 */
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, X, Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useComparisonScore } from '@/hooks/useComparisonScore';

interface Props {
  products: any[];
  formatCurrency: (v: number) => string;
  onRemove: (idx: number) => void;
  onProductClick?: (id: string) => void;
}

const ROWS: Array<{
  key: string;
  label: string;
  format: (p: any) => string | number;
  raw: (p: any) => number;
  better: 'lower' | 'higher';
}> = [
  {
    key: 'price',
    label: 'Preço unitário',
    format: (p) => p.price,
    raw: (p) => p.price,
    better: 'lower',
  },
  {
    key: 'minQty',
    label: 'Quantidade mínima',
    format: (p) => `${p.minQuantity ?? 0} un.`,
    raw: (p) => p.minQuantity ?? 0,
    better: 'lower',
  },
  {
    key: 'stock',
    label: 'Estoque',
    format: (p) => `${p.stock ?? 0} un.`,
    raw: (p) => p.stock ?? 0,
    better: 'higher',
  },
  {
    key: 'colors',
    label: 'Variedade de cores',
    format: (p) => `${p.colors?.length ?? 0} opções`,
    raw: (p) => p.colors?.length ?? 0,
    better: 'higher',
  },
  {
    key: 'leadTime',
    label: 'Lead time (dias)',
    format: (p) => (p.leadTimeDays ? `${p.leadTimeDays}d` : '—'),
    raw: (p) => p.leadTimeDays ?? 999,
    better: 'lower',
  },
];

export function ComparisonDuelView({ products, formatCurrency, onRemove, onProductClick }: Props) {
  const scoreItems = useComparisonScore(products);
  const winnerIdx = useMemo(() => {
    if (scoreItems.length === 0) return -1;
    return scoreItems.reduce(
      (best, cur, idx, arr) => (cur.total > arr[best].total ? idx : best),
      0,
    );
  }, [scoreItems]);

  if (products.length !== 2) return null;
  const [a, b] = products;

  const renderRow = (row: (typeof ROWS)[number]) => {
    const va = row.raw(a);
    const vb = row.raw(b);
    let aWin = false,
      bWin = false;
    if (va !== vb) {
      if (row.better === 'lower') {
        aWin = va < vb;
        bWin = vb < va;
      } else {
        aWin = va > vb;
        bWin = vb > va;
      }
    }
    return (
      <div
        key={row.key}
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl px-4 py-3 transition-colors odd:bg-muted/30 hover:bg-primary/5"
      >
        <div
          className={cn(
            'text-right text-sm font-medium tabular-nums',
            aWin && 'font-bold text-amber-600 dark:text-amber-400',
          )}
        >
          {row.key === 'price' ? formatCurrency(row.raw(a)) : row.format(a)}
          {aWin && <Crown className="ml-1.5 inline h-3.5 w-3.5" />}
        </div>
        <div className="px-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          {row.label}
        </div>
        <div
          className={cn(
            'text-left text-sm font-medium tabular-nums',
            bWin && 'font-bold text-amber-600 dark:text-amber-400',
          )}
        >
          {bWin && <Crown className="mr-1.5 inline h-3.5 w-3.5" />}
          {row.key === 'price' ? formatCurrency(row.raw(b)) : row.format(b)}
        </div>
      </div>
    );
  };

  const renderHeader = (p: any, idx: number, side: 'left' | 'right') => (
    <div className={cn('space-y-3', side === 'right' && 'lg:text-right')}>
      <div className="group relative aspect-square overflow-hidden rounded-xl border-2 border-border bg-muted">
        <img
          src={p.images?.[0]}
          alt={p.name}
          className="h-full w-full cursor-pointer object-contain p-4 transition-transform group-hover:scale-105"
          onClick={() => onProductClick?.(p.id)}
          loading="lazy"
        />
        {winnerIdx === idx && (
          <Badge className="absolute left-3 top-3 gap-1 bg-primary text-primary-foreground shadow-lg">
            <Crown className="h-3 w-3" />
            Recomendado
          </Badge>
        )}
        <button
          aria-label="Remover"
          onClick={() => onRemove(idx)}
          className="absolute right-3 top-3 rounded-full bg-background/80 p-1.5 backdrop-blur-sm transition hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3
        className="line-clamp-2 cursor-pointer font-display text-lg font-bold transition-colors hover:text-primary"
        onClick={() => onProductClick?.(p.id)}
      >
        {p.name}
      </h3>
      <p className="text-xl font-bold tabular-nums text-primary">{formatCurrency(p.price)}</p>
      {p.supplier?.name && (
        <p className="text-[11px] text-muted-foreground">por {p.supplier.name}</p>
      )}
    </div>
  );

  return (
    <div className="relative space-y-6 overflow-hidden rounded-xl border-[2px] border-amber-400/30 bg-gradient-to-br from-amber-400/5 via-card to-card p-4 shadow-xl sm:p-6">
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
      <div className="flex items-center justify-center gap-3 pb-2">
        <Badge
          variant="outline"
          className="border-amber-400/40 bg-amber-400/10 text-[10px] text-amber-700"
        >
          ⚔️ ARENA DE DUELO
        </Badge>
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">
          Confronto Direto
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_auto_1fr]">
        {renderHeader(a, 0, 'left')}
        <div className="hidden flex-col items-center justify-center pt-32 lg:flex">
          <div className="h-32 w-px bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />
          <span className="my-4 animate-pulse font-display text-2xl font-black text-amber-500/30">
            VS
          </span>
          <div className="h-32 w-px bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />
        </div>
        <div className="flex items-center justify-center py-2 lg:hidden">
          <span className="font-display text-xl font-black text-amber-500/30">VS</span>
        </div>
        {renderHeader(b, 1, 'right')}
      </div>

      <div className="space-y-1 border-t border-border pt-4">{ROWS.map(renderRow)}</div>

      <div className="flex justify-center gap-3 pt-2">
        <Button variant="outline" onClick={() => onProductClick?.(a.id)}>
          Ver {a.name.slice(0, 22)}
        </Button>
        <Button variant="outline" onClick={() => onProductClick?.(b.id)}>
          Ver {b.name.slice(0, 22)}
        </Button>
      </div>
    </div>
  );
}
