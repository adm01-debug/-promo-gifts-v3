/**
 * CompareTableView — Tabela detalhada de comparação de produtos
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { X, Check, Minus, Crown, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComparisonHighlight, highlightClasses } from "./ComparisonHighlights";
import type { CompareVariantInfo } from "@/stores/useComparisonStore";

interface CompareEntry {
  product: any;
  variant?: CompareVariantInfo;
  index: number;
}

interface CompareTableViewProps {
  entries: CompareEntry[];
  products: any[];
  formatCurrency: (v: number) => string;
  getStockStatusLabel: (s: string) => { label: string; color: string };
  onRemove: (index: number) => void;
}

export function CompareTableView({ entries, products, formatCurrency, getStockStatusLabel, onRemove }: CompareTableViewProps) {
  const navigate = useNavigate();

  return (
    <ScrollArea className="w-full">
      <div className="min-w-[800px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px] bg-muted/50 sticky left-0 z-10">Atributo</TableHead>
              {entries.map((entry) => (
                <TableHead key={`th-${entry.index}`} className="min-w-[200px] text-center">
                  <div className="relative group">
                    <button aria-label="Remover da comparação" onClick={() => onRemove(entry.index)}
                      className="absolute -top-1 -right-1 p-1 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 z-10">
                      <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </button>
                    <div className="flex flex-col items-center gap-2">
                      <img src={entry.product.images[0]} alt={entry.product.name}
                        className="w-24 h-24 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={() => navigate(`/produto/${entry.product.id}`)} />
                      <span className="font-medium text-foreground text-sm line-clamp-2">{entry.product.name}</span>
                      {entry.variant?.color_name && (
                        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                          {entry.variant.color_hex && <span className="inline-block w-2.5 h-2.5 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: entry.variant.color_hex }} />}
                          {entry.variant.color_name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <HighlightedPriceRow products={products} formatCurrency={formatCurrency} />
            <HighlightedMinQtyRow products={products} />
            <SimpleRow label="SKU" products={products} render={(p) => <span className="font-mono text-sm">{p.sku}</span>} />
            <SimpleRow label="Categoria" products={products} render={(p) => <Badge variant="outline">{p.category.icon} {p.category.name}</Badge>} />
            <SimpleRow label="Fornecedor" products={products} render={(p) => p.supplier.name} />
            <SimpleRow label="Estoque" products={products} render={(p) => {
              const s = getStockStatusLabel(p.stockStatus);
              return (<div className="flex flex-col items-center gap-1"><span className={cn("font-medium", s.color)}>{s.label}</span><span className="text-sm text-muted-foreground">{p.stock.toLocaleString("pt-BR")} un.</span></div>);
            }} />
            <SimpleRow label="É Kit?" products={products} render={(p) => p.isKit ? <Check className="h-5 w-5 text-success mx-auto" /> : <Minus className="h-5 w-5 text-muted-foreground mx-auto" />} />
            <SimpleRow label="Cores Disponíveis" products={products} render={(p) => (
              <div className="flex flex-wrap justify-center gap-1">
                {p.colors.slice(0, 6).map((c: any, i: number) => <div key={i} className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c.hex }} title={c.name} />)}
                {p.colors.length > 6 && <span className="text-xs text-muted-foreground">+{p.colors.length - 6}</span>}
              </div>
            )} />
            <SimpleRow label="Materiais" products={products} render={(p) => (
              <div className="flex flex-wrap justify-center gap-1">
                {p.materials.map((m: string) => <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>)}
              </div>
            )} />
            <SimpleRow label="Público-Alvo" products={products} render={(p) => (
              <div className="flex flex-wrap justify-center gap-1">
                {p.tags.publicoAlvo.slice(0, 3).map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
              </div>
            )} />
            <SimpleRow label="Datas Comemorativas" products={products} render={(p) =>
              p.tags.datasComemorativas.length > 0
                ? <div className="flex flex-wrap justify-center gap-1">{p.tags.datasComemorativas.slice(0, 2).map((d: string) => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}</div>
                : <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
            } />
            <SimpleRow label="Descrição" products={products} render={(p) => <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>} />
            <SimpleRow label="Ações" products={products} render={(p) => <Button size="sm" onClick={() => navigate(`/produto/${p.id}`)}>Ver Detalhes</Button>} />
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function SimpleRow({ label, products, render }: { label: string; products: any[]; render: (p: any) => React.ReactNode }) {
  return (
    <TableRow>
      <TableCell className="font-medium bg-muted/50 sticky left-0">{label}</TableCell>
      {products.map((p, idx) => <TableCell key={`cell-${idx}`} className="text-center">{render(p)}</TableCell>)}
    </TableRow>
  );
}

function HighlightedPriceRow({ products, formatCurrency }: { products: any[]; formatCurrency: (v: number) => string }) {
  const highlights = useComparisonHighlight(products.map(p => p.price), "lower-is-better");
  return (
    <TableRow>
      <TableCell className="font-medium bg-muted/50 sticky left-0">Preço Unitário</TableCell>
      {products.map((p, idx) => (
        <TableCell key={`cell-${idx}`} className={cn("text-center", highlightClasses[highlights[idx]])}>
          <div className="flex items-center justify-center gap-1">
            {highlights[idx] === "best" && <Crown className="h-4 w-4 text-success" />}
            <span className={cn("text-lg font-bold", highlights[idx] === "best" ? "text-success" : highlights[idx] === "worst" ? "text-destructive" : "text-primary")}>{formatCurrency(p.price)}</span>
            {highlights[idx] === "worst" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
}

function HighlightedMinQtyRow({ products }: { products: any[] }) {
  const highlights = useComparisonHighlight(products.map(p => p.minQuantity), "lower-is-better");
  return (
    <TableRow>
      <TableCell className="font-medium bg-muted/50 sticky left-0">Quantidade Mínima</TableCell>
      {products.map((p, idx) => (
        <TableCell key={`cell-${idx}`} className={cn("text-center", highlightClasses[highlights[idx]])}>
          <div className="flex items-center justify-center gap-1">
            {highlights[idx] === "best" && <Crown className="h-3.5 w-3.5 text-success" />}
            <span className={cn(highlights[idx] === "best" ? "font-semibold text-success" : highlights[idx] === "worst" ? "text-destructive" : "")}>{p.minQuantity} un.</span>
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
}
