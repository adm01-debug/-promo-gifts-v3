/**
 * NoveltyCards — Grid, List, Table, and Skeleton card components for novelties.
 * Extracted from NoveltyProductGrid.tsx.
 */
import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Building2, FolderTree, Sparkles } from "lucide-react";
import { NoveltyBadge } from "@/components/products/NoveltyBadge";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import { cn } from "@/lib/utils";
import type { NoveltyWithDetails } from "@/hooks/useNovelties";

function isFresh(detectedAt: string): boolean {
  return Math.floor((Date.now() - new Date(detectedAt).getTime()) / 86400000) <= 2;
}

function formatPrice(price: number) {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export interface NoveltyCardProps {
  product: NoveltyWithDetails;
  onClick: () => void;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export const NoveltyGridCard = memo(function NoveltyGridCard({ product, onClick, selectionMode, isSelected, onToggleSelect }: NoveltyCardProps) {
  const fresh = isFresh(product.detected_at);
  return (
    <Card
      className={cn(
        "group cursor-pointer overflow-hidden transition-all duration-300",
        "border-border/50 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30",
        fresh && "border-success/30 shadow-[0_0_16px_hsl(var(--success)/0.1)]",
        isSelected && "ring-2 ring-primary border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
      )}
      onClick={selectionMode ? onToggleSelect : onClick}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
          {product.product_image ? (
            <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="h-12 w-12 text-muted-foreground/20" /></div>
          )}
          {selectionMode && (
            <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
              <SelectionCheckbox checked={isSelected} onChange={onToggleSelect} size="md" animateEntry />
            </div>
          )}
          <div className="absolute top-2 left-2"><NoveltyBadge daysRemaining={product.days_remaining} size="sm" /></div>
          {fresh && !selectionMode && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-success/90 text-success-foreground text-[9px] px-1.5 py-0 gap-0.5 border-0"><Sparkles className="h-2.5 w-2.5" />NEW</Badge>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="p-2.5 space-y-1">
          <h4 className="font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug min-h-[2rem]">{product.product_name}</h4>
          <div className="flex items-center justify-between gap-1">
            {product.product_sku && <p className="text-[10px] text-muted-foreground truncate">{product.product_sku}</p>}
            {product.category_name && <Badge variant="outline" className="text-[9px] shrink-0 px-1 py-0">{product.category_name}</Badge>}
          </div>
          {product.supplier_name && (
            <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1"><Building2 className="h-2.5 w-2.5 shrink-0" />{product.supplier_name}</p>
          )}
          {product.base_price != null && product.base_price > 0 && (
            <p className="text-sm font-semibold text-primary tabular-nums">{formatPrice(product.base_price)}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export const NoveltyListCard = memo(function NoveltyListCard({ product, onClick, selectionMode, isSelected, onToggleSelect }: NoveltyCardProps) {
  const fresh = isFresh(product.detected_at);
  return (
    <Card className={cn("group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30", fresh && "border-success/30 shadow-[0_0_12px_hsl(var(--success)/0.08)]", isSelected && "ring-2 ring-primary border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]")} onClick={selectionMode ? onToggleSelect : onClick}>
      <CardContent className="p-2.5 flex items-center gap-2.5">
        {selectionMode && <div className="shrink-0" onClick={(e) => e.stopPropagation()}><SelectionCheckbox checked={isSelected} onChange={onToggleSelect} size="md" animateEntry /></div>}
        <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-muted overflow-hidden relative">
          {product.product_image ? <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/30" /></div>}
          {fresh && <div className="absolute inset-0 ring-2 ring-success/40 rounded-lg" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <NoveltyBadge daysRemaining={product.days_remaining} size="sm" />
            {fresh && <Badge className="bg-success/90 text-success-foreground text-[9px] px-1 py-0 border-0">NEW</Badge>}
          </div>
          <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">{product.product_name}</h4>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {product.product_sku && <p className="text-[10px] text-muted-foreground">SKU: {product.product_sku}</p>}
            {product.supplier_name && <Badge variant="outline" className="text-[9px] border-info/30 text-info px-1 py-0"><Building2 className="h-2.5 w-2.5 mr-0.5" />{product.supplier_name}</Badge>}
            {product.category_name && <Badge variant="outline" className="text-[9px] px-1 py-0"><FolderTree className="h-2.5 w-2.5 mr-0.5" />{product.category_name}</Badge>}
          </div>
        </div>
        {product.base_price != null && product.base_price > 0 && <div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums">{formatPrice(product.base_price)}</p></div>}
      </CardContent>
    </Card>
  );
});

export function NoveltyTableView({ products, onProductClick, selectionMode, selectedIds, onToggleSelect }: {
  products: NoveltyWithDetails[]; onProductClick: (id: string) => void;
  selectionMode: boolean; selectedIds: Set<string>; onToggleSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {selectionMode && <TableHead className="w-[40px] px-2"></TableHead>}
            <TableHead className="w-[44px] px-2">Img</TableHead>
            <TableHead className="px-2">Produto</TableHead>
            <TableHead className="hidden sm:table-cell px-2">SKU</TableHead>
            <TableHead className="hidden md:table-cell px-2">Fornecedor</TableHead>
            <TableHead className="hidden lg:table-cell px-2">Categoria</TableHead>
            <TableHead className="text-center px-2">Status</TableHead>
            <TableHead className="text-right px-2">Preço</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const fresh = isFresh(product.detected_at);
            const isSelected = selectedIds.has(product.product_id);
            return (
              <TableRow key={product.novelty_id} className={cn("cursor-pointer transition-colors", fresh && "bg-success/5", isSelected && "bg-primary/10")} onClick={() => selectionMode ? onToggleSelect(product.product_id) : onProductClick(product.product_id)}>
                {selectionMode && <TableCell className="p-1.5"><div onClick={(e) => e.stopPropagation()}><SelectionCheckbox checked={isSelected} onChange={() => onToggleSelect(product.product_id)} size="sm" /></div></TableCell>}
                <TableCell className="p-1.5"><div className="w-9 h-9 rounded bg-muted overflow-hidden">{product.product_image ? <img src={product.product_image} alt={product.product_name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-3.5 w-3.5 text-muted-foreground/30" /></div>}</div></TableCell>
                <TableCell className="px-2 py-1.5"><p className="font-medium text-xs line-clamp-1">{product.product_name}</p></TableCell>
                <TableCell className="hidden sm:table-cell px-2 py-1.5"><span className="text-[11px] text-muted-foreground">{product.product_sku || "—"}</span></TableCell>
                <TableCell className="hidden md:table-cell px-2 py-1.5"><span className="text-[11px] text-muted-foreground">{product.supplier_name || "—"}</span></TableCell>
                <TableCell className="hidden lg:table-cell px-2 py-1.5"><span className="text-[11px] text-muted-foreground">{product.category_name || "—"}</span></TableCell>
                <TableCell className="text-center px-2 py-1.5"><NoveltyBadge daysRemaining={product.days_remaining} size="sm" /></TableCell>
                <TableCell className="text-right px-2 py-1.5">{product.base_price != null && product.base_price > 0 ? <span className="text-xs font-semibold tabular-nums">{formatPrice(product.base_price)}</span> : <span className="text-[11px] text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

type ViewMode = "grid" | "list" | "table";

export function NoveltyCardSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (<Card className="border-border/50"><CardContent className="p-2.5 flex items-center gap-2.5"><div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shimmer" /><div className="flex-1 space-y-1.5"><div className="h-3 w-16 rounded shimmer" /><div className="h-3.5 w-full rounded shimmer" style={{ animationDelay: '150ms' }} /><div className="h-3 w-24 rounded shimmer" style={{ animationDelay: '300ms' }} /></div></CardContent></Card>);
  }
  if (viewMode === "table") {
    return (<div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/30"><div className="w-9 h-9 rounded shimmer" /><div className="flex-1 h-3 rounded shimmer" style={{ animationDelay: '100ms' }} /><div className="w-14 h-3 rounded shimmer" style={{ animationDelay: '200ms' }} /><div className="w-14 h-3 rounded shimmer" style={{ animationDelay: '300ms' }} /></div>);
  }
  return (<Card className="border-border/50 overflow-hidden"><CardContent className="p-0"><div className="aspect-square shimmer" /><div className="p-2.5 space-y-1.5"><div className="h-3.5 w-full rounded shimmer" style={{ animationDelay: '100ms' }} /><div className="h-3.5 w-3/4 rounded shimmer" style={{ animationDelay: '200ms' }} /><div className="flex justify-between"><div className="h-3 w-14 rounded shimmer" style={{ animationDelay: '300ms' }} /><div className="h-4 w-12 rounded shimmer" style={{ animationDelay: '400ms' }} /></div></div></CardContent></Card>);
}
