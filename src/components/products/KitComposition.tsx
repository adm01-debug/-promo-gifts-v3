import { useState, useMemo } from "react";
import {
  Package,
  Image as ImageIcon,
  Check,
  Palette,
  Settings2,
  Weight,
  Eye,
  Layers,
  BoxSelect,
  ShoppingBag,
  ChevronUp,
  ChevronDown,
  Ruler,
  Tag,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { KitComponent } from "@/types/product-catalog";

interface KitCompositionProps {
  items: KitComponent[];
  onSelectItems?: (selectedItems: KitComponent[]) => void;
  onViewProduct?: (productId: string) => void;
}

export function KitComposition({
  items,
  onSelectItems,
  onViewProduct,
}: KitCompositionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    packaging: true,
    products: true,
  });

  const stats = useMemo(() => {
    const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = items.reduce(
      (sum, item) => sum + (item.weightG ?? 0) * item.quantity,
      0
    );
    const packagingCount = items.filter((i) => i.isPackaging).length;
    const productCount = items.filter((i) => !i.isPackaging).length;
    const personalizableCount = items.filter(
      (i) => i.allowsPersonalization
    ).length;
    return { totalPieces, totalWeight, packagingCount, productCount, personalizableCount };
  }, [items]);

  const toggleItem = (itemId: string) => {
    const newSelected = selectedItems.includes(itemId)
      ? selectedItems.filter((id) => id !== itemId)
      : [...selectedItems, itemId];
    setSelectedItems(newSelected);
    setSelectAll(newSelected.length === items.length);
    onSelectItems?.(items.filter((item) => newSelected.includes(item.id)));
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      onSelectItems?.([]);
    } else {
      const allIds = items.map((item) => item.id);
      setSelectedItems(allIds);
      onSelectItems?.(items);
    }
    setSelectAll(!selectAll);
  };

  const formatWeight = (grams: number) => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(1)} kg`;
    return `${grams} g`;
  };

  const packagingItems = items.filter((i) => i.isPackaging);
  const productItems = items.filter((i) => !i.isPackaging);

  return (
    <>
      {/* ── Trigger Card (inline, compact) ── */}
      <div
        className="rounded-xl border border-border bg-card overflow-hidden shadow-sm cursor-pointer hover:border-primary/40 transition-all group"
        onClick={() => setDialogOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setDialogOpen(true)}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground text-base">
                Composição do Kit
              </h3>
              <span className="text-xs text-muted-foreground">
                Veja os {items.length} componentes deste kit
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mini stats pills */}
            <div className="hidden sm:flex items-center gap-1.5">
              {stats.productCount > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <ShoppingBag className="h-2.5 w-2.5" />
                  {stats.productCount}
                </Badge>
              )}
              {stats.packagingCount > 0 && (
                <Badge variant="secondary" className="text-[10px] gap-1">
                  <BoxSelect className="h-2.5 w-2.5" />
                  {stats.packagingCount}
                </Badge>
              )}
              {stats.totalWeight > 0 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <Weight className="h-2.5 w-2.5" />
                  {formatWeight(stats.totalWeight)}
                </Badge>
              )}
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* ── Dialog Modal ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Composição do Kit
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  {items.length} {items.length === 1 ? "componente" : "componentes"} • {stats.totalPieces}{" "}
                  {stats.totalPieces === 1 ? "peça" : "peças"}
                </DialogDescription>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 flex-wrap">
              {stats.productCount > 0 && (
                <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1">
                  <ShoppingBag className="h-3 w-3" />
                  {stats.productCount} {stats.productCount === 1 ? "item" : "itens"}
                </Badge>
              )}
              {stats.packagingCount > 0 && (
                <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1">
                  <BoxSelect className="h-3 w-3" />
                  {stats.packagingCount} {stats.packagingCount === 1 ? "embalagem" : "embalagens"}
                </Badge>
              )}
              {stats.personalizableCount > 0 && (
                <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 text-primary border-primary/30">
                  <Palette className="h-3 w-3" />
                  {stats.personalizableCount} personalizáveis
                </Badge>
              )}
              {stats.totalWeight > 0 && (
                <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1">
                  <Weight className="h-3 w-3" />
                  {formatWeight(stats.totalWeight)} total
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="max-h-[calc(85vh-180px)]">
            <div className="px-6 py-4 space-y-4">
              {/* Selection bar */}
              {onSelectItems && (
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground">
                    {selectedItems.length} de {items.length} selecionados
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className={cn(
                      "h-7 text-xs",
                      selectAll && "bg-primary/10 text-primary"
                    )}
                  >
                    {selectAll ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Desmarcar
                      </>
                    ) : (
                      "Selecionar Todos"
                    )}
                  </Button>
                </div>
              )}

              {/* Packaging section */}
              {packagingItems.length > 0 && (
                <Collapsible
                  open={expandedSections.packaging}
                  onOpenChange={(open) =>
                    setExpandedSections((s) => ({ ...s, packaging: open }))
                  }
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BoxSelect className="h-3 w-3" />
                      Embalagem ({packagingItems.length})
                    </span>
                    {expandedSections.packaging ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 rounded-lg border border-border overflow-hidden divide-y divide-border">
                      {packagingItems.map((item) => (
                        <KitComponentCard
                          key={item.id}
                          item={item}
                          isSelected={selectedItems.includes(item.id)}
                          selectable={!!onSelectItems}
                          onToggle={() => toggleItem(item.id)}
                          onViewProduct={onViewProduct}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Products section */}
              {productItems.length > 0 && (
                <Collapsible
                  open={expandedSections.products}
                  onOpenChange={(open) =>
                    setExpandedSections((s) => ({ ...s, products: open }))
                  }
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="h-3 w-3" />
                      Itens do Kit ({productItems.length})
                    </span>
                    {expandedSections.products ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 rounded-lg border border-border overflow-hidden divide-y divide-border">
                      {productItems.map((item) => (
                        <KitComponentCard
                          key={item.id}
                          item={item}
                          isSelected={selectedItems.includes(item.id)}
                          selectable={!!onSelectItems}
                          onToggle={() => toggleItem(item.id)}
                          onViewProduct={onViewProduct}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ─────────────── Individual Component Card ─────────────── */

interface KitComponentCardProps {
  item: KitComponent;
  isSelected: boolean;
  selectable: boolean;
  onToggle: () => void;
  onViewProduct?: (productId: string) => void;
}

function KitComponentCard({
  item,
  isSelected,
  selectable,
  onToggle,
  onViewProduct,
}: KitComponentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDimensions =
    (item.heightMm != null && item.heightMm > 0) ||
    (item.widthMm != null && item.widthMm > 0) ||
    (item.lengthMm != null && item.lengthMm > 0);

  const hasExpandableInfo =
    item.description ||
    item.personalizationNotes;

  const formatDim = () => {
    const parts: string[] = [];
    if (item.heightMm) parts.push(`${item.heightMm}`);
    if (item.widthMm) parts.push(`${item.widthMm}`);
    if (item.lengthMm) parts.push(`${item.lengthMm}`);
    return parts.join(" × ") + " mm";
  };

  const formatWeight = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  return (
    <div
      className={cn(
        "transition-colors group",
        selectable
          ? isSelected
            ? "bg-primary/5"
            : "hover:bg-accent/30"
          : "hover:bg-accent/20"
      )}
    >
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => (selectable ? onToggle() : hasExpandableInfo && setExpanded(!expanded))}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
      >
        {/* Checkbox */}
        {selectable && (
          <div
            className={cn(
              "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
              isSelected
                ? "bg-primary border-primary scale-105"
                : "border-muted-foreground/30 group-hover:border-primary/50"
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
        )}

        {/* Image */}
        <div className="w-14 h-14 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden border border-border/50">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.productName}
              className="w-full h-full object-contain p-0.5"
              loading="lazy"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Name row */}
          <div className="flex items-start gap-2">
            <Badge
              variant="secondary"
              className="text-[11px] px-1.5 py-0 shrink-0 font-bold tabular-nums"
            >
              {item.quantity}x
            </Badge>
            <span className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
              {item.productName}
            </span>
          </div>

          {/* Inline specs: SKU • material • weight • dimensions */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
            {item.sku ? (
              <span className="font-mono">{item.sku}</span>
            ) : (
              <span className="font-mono">—</span>
            )}
            {item.material && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span>{item.material}</span>
              </>
            )}
            {item.weightG != null && item.weightG > 0 && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span>{formatWeight(item.weightG)}</span>
              </>
            )}
            {hasDimensions && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-0.5">
                  <Ruler className="h-2.5 w-2.5" />
                  {formatDim()}
                </span>
              </>
            )}
            {item.supplierComponentCode && (
              <>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-0.5">
                  <Tag className="h-2.5 w-2.5" />
                  {item.supplierComponentCode}
                </span>
              </>
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-1 flex-wrap">
            {item.isPackaging && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
              >
                <Package className="h-2.5 w-2.5" />
                Embalagem
              </Badge>
            )}
            {item.isOptional && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-400"
              >
                Opcional
              </Badge>
            )}
            {item.isReplaceable && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 gap-0.5 bg-violet-500/10 text-violet-700 dark:text-violet-400"
              >
                <Settings2 className="h-2.5 w-2.5" />
                Substituível
              </Badge>
            )}
            {item.allowsPersonalization && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 gap-0.5 text-primary border-primary/30 bg-primary/5"
              >
                <Palette className="h-2.5 w-2.5" />
                Personalizável
              </Badge>
            )}
            {item.color && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 gap-0.5"
              >
                Cor: {item.color}
              </Badge>
            )}
            {item.componentTypeCode && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 gap-0.5"
              >
                {item.componentTypeCode}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {hasExpandableInfo && !selectable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
          )}
          {onViewProduct && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewProduct(item.productId);
                    }}
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">Ver produto</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Expanded details (description & personalization notes only) */}
      {expanded && hasExpandableInfo && (
        <div className="px-4 pb-3.5 pt-0 ml-[4.75rem] space-y-2 border-t border-border/30 mt-0">
          {item.description && (
            <div className="pt-2 text-[11px] text-muted-foreground">
              <span className="font-medium flex items-center gap-1 mb-0.5">
                <FileText className="h-3 w-3" /> Descrição
              </span>
              <p className="text-muted-foreground/80 whitespace-pre-line leading-relaxed">
                {item.description}
              </p>
            </div>
          )}

          {item.personalizationNotes && (
            <div className="text-[11px] rounded-md bg-primary/5 border border-primary/10 p-2">
              <span className="font-medium flex items-center gap-1 mb-0.5 text-primary">
                <Palette className="h-3 w-3" /> Notas de Personalização
              </span>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {item.personalizationNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
