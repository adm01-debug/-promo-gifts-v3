/**
 * ComparisonMobileView — Carousel vertical de atributos para mobile (<768px).
 * Cada linha = atributo, produtos viram chips horizontais swipeable.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComparisonScore } from "@/hooks/useComparisonScore";

interface Props {
  products: any[];
  formatCurrency: (v: number) => string;
  onRemove: (idx: number) => void;
  onProductClick?: (id: string) => void;
}

const ROWS = [
  { key: "image", label: "Foto" },
  { key: "name", label: "Produto" },
  { key: "price", label: "Preço" },
  { key: "minQty", label: "Qtd. mínima" },
  { key: "stock", label: "Estoque" },
  { key: "colors", label: "Cores" },
  { key: "supplier", label: "Fornecedor" },
] as const;

export function ComparisonMobileView({ products, formatCurrency, onRemove, onProductClick }: Props) {
  const scoreItems = useComparisonScore(products);
  const winnerIdx = scoreItems.length > 0
    ? scoreItems.reduce((best, cur, idx, arr) => cur.total > arr[best].total ? idx : best, 0)
    : -1;

  const renderCell = (rowKey: typeof ROWS[number]["key"], p: any, idx: number) => {
    switch (rowKey) {
      case "image":
        return (
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-muted">
            <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-contain" loading="lazy" />
            {winnerIdx === idx && (
              <Badge className="absolute top-1 left-1 text-[9px] gap-0.5 px-1 py-0">
                <Crown className="h-2.5 w-2.5" />
              </Badge>
            )}
            <button
              aria-label="Remover"
              onClick={() => onRemove(idx)}
              className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      case "name":
        return (
          <button
            onClick={() => onProductClick?.(p.id)}
            className="text-xs font-medium text-left line-clamp-2 hover:text-primary"
          >
            {p.name}
          </button>
        );
      case "price":
        return <span className="text-sm font-bold text-primary">{formatCurrency(p.price)}</span>;
      case "minQty":
        return <span className="text-xs">{p.minQuantity ?? 0} un.</span>;
      case "stock":
        return <span className="text-xs">{p.stock ?? 0}</span>;
      case "colors":
        return (
          <div className="flex gap-0.5 flex-wrap">
            {(p.colors ?? []).slice(0, 4).map((c: any, i: number) => (
              <div key={i} className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
            ))}
            {p.colors?.length > 4 && <span className="text-[10px]">+{p.colors.length - 4}</span>}
          </div>
        );
      case "supplier":
        return <span className="text-[10px] text-muted-foreground line-clamp-1">{p.supplier?.name ?? "—"}</span>;
    }
  };

  return (
    <div className="md:hidden space-y-3">
      {ROWS.map((row) => (
        <div key={row.key} className="rounded-xl border border-border bg-card overflow-hidden shadow-sm transition-all duration-300">
          <div className="px-3 py-2 bg-muted/40 text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground/60 border-b border-border/40">
            {row.label}
          </div>
          <div className="flex gap-2 p-3 overflow-x-auto snap-x snap-mandatory scrollbar-none">
            {products.map((p, idx) => (
              <div
                key={`${p.id}-${idx}`}
                className={cn(
                  "shrink-0 snap-start min-w-[48%] max-w-[48%] flex items-center justify-center p-3 rounded-2xl border border-border bg-background transition-all duration-500",
                  winnerIdx === idx && "border-amber-500/50 bg-amber-500/[0.02] ring-2 ring-amber-500/10 shadow-lg shadow-amber-500/5"
                )}
              >
                {renderCell(row.key, p, idx)}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full border-amber-500/20 text-amber-600 hover:bg-amber-500/5 font-black uppercase text-[10px] tracking-widest h-10" onClick={() => onProductClick?.(products[0]?.id)}>
        Ver Detalhes do Líder
      </Button>
    </div>
  );
}
