/**
 * ComparisonDuelView — Layout 2-coluna "duelo" para compareCount === 2.
 * Fotos enormes, atributos em zebra alternada, vencedor da linha em destaque.
 */
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crown, X, Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComparisonScore } from "@/hooks/useComparisonScore";

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
  better: "lower" | "higher";
}> = [
  { key: "price", label: "Preço unitário", format: p => p.price, raw: p => p.price, better: "lower" },
  { key: "minQty", label: "Quantidade mínima", format: p => `${p.minQuantity ?? 0} un.`, raw: p => p.minQuantity ?? 0, better: "lower" },
  { key: "stock", label: "Estoque", format: p => `${p.stock ?? 0} un.`, raw: p => p.stock ?? 0, better: "higher" },
  { key: "colors", label: "Variedade de cores", format: p => `${p.colors?.length ?? 0} opções`, raw: p => p.colors?.length ?? 0, better: "higher" },
  { key: "leadTime", label: "Lead time (dias)", format: p => p.leadTimeDays ? `${p.leadTimeDays}d` : "—", raw: p => p.leadTimeDays ?? 999, better: "lower" },
];

export function ComparisonDuelView({ products, formatCurrency, onRemove, onProductClick }: Props) {
  const scoreItems = useComparisonScore(products);
  const winnerIdx = useMemo(() => {
    if (scoreItems.length === 0) return -1;
    return scoreItems.reduce((best, cur, idx, arr) => cur.total > arr[best].total ? idx : best, 0);
  }, [scoreItems]);

  if (products.length !== 2) return null;
  const [a, b] = products;

  const renderRow = (row: typeof ROWS[number]) => {
    const va = row.raw(a);
    const vb = row.raw(b);
    let aWin = false, bWin = false;
    if (va !== vb) {
      if (row.better === "lower") {
        aWin = va < vb;
        bWin = vb < va;
      } else {
        aWin = va > vb;
        bWin = vb > va;
      }
    }
    return (
      <div key={row.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 odd:bg-muted/30 px-4 rounded-lg transition-colors hover:bg-primary/5">
        <div className={cn("text-right text-sm font-medium tabular-nums", aWin && "text-amber-600 dark:text-amber-400 font-bold")}>
          {row.key === "price" ? formatCurrency(row.raw(a)) : row.format(a)}
          {aWin && <Crown className="h-3.5 w-3.5 inline ml-1.5" />}
        </div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 text-center px-2">{row.label}</div>
        <div className={cn("text-left text-sm font-medium tabular-nums", bWin && "text-amber-600 dark:text-amber-400 font-bold")}>
          {bWin && <Crown className="h-3.5 w-3.5 inline mr-1.5" />}
          {row.key === "price" ? formatCurrency(row.raw(b)) : row.format(b)}
        </div>
      </div>
    );
  };

  const renderHeader = (p: any, idx: number, side: "left" | "right") => (
    <div className={cn("space-y-3", side === "right" && "lg:text-right")}>
      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border-2 border-border group">
        <img
          src={p.images?.[0]}
          alt={p.name}
          className="w-full h-full object-contain p-4 cursor-pointer transition-transform group-hover:scale-105"
          onClick={() => onProductClick?.(p.id)}
          loading="lazy"
        />
        {winnerIdx === idx && (
          <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground gap-1 shadow-lg">
            <Crown className="h-3 w-3" />
            Recomendado
          </Badge>
        )}
        <button
          aria-label="Remover"
          onClick={() => onRemove(idx)}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3
        className="font-display text-lg font-bold cursor-pointer hover:text-primary transition-colors line-clamp-2"
        onClick={() => onProductClick?.(p.id)}
      >
        {p.name}
      </h3>
      <p className="text-xl font-bold text-primary tabular-nums">{formatCurrency(p.price)}</p>
      {p.supplier?.name && (
        <p className="text-[11px] text-muted-foreground">por {p.supplier.name}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 rounded-lg border-[2px] border-amber-400/30 bg-gradient-to-br from-amber-400/5 via-card to-card p-4 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50" />
      <div className="flex items-center justify-center gap-3 pb-2">
        <Badge variant="outline" className="text-[10px] border-amber-400/40 text-amber-700 bg-amber-400/10">⚔️ ARENA DE DUELO</Badge>
        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/80">Confronto Direto</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
        {renderHeader(a, 0, "left")}
        <div className="hidden lg:flex flex-col items-center justify-center pt-32">
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />
          <span className="text-2xl font-display font-black text-amber-500/30 my-4 animate-pulse">VS</span>
          <div className="w-px h-32 bg-gradient-to-b from-transparent via-amber-400/30 to-transparent" />
        </div>
        <div className="lg:hidden flex items-center justify-center py-2">
          <span className="text-xl font-display font-black text-amber-500/30">VS</span>
        </div>
        {renderHeader(b, 1, "right")}
      </div>

      <div className="space-y-1 pt-4 border-t border-border">
        {ROWS.map(renderRow)}
      </div>

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
