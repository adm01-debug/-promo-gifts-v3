import { useState, useMemo, useCallback } from "react";
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
  Tag,
  FileText,
  Hash,
  Copy,
  CheckCheck,
  Maximize2,
  Box,
  Utensils,
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

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

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
    return {
      totalPieces,
      totalWeight,
      packagingCount,
      productCount,
      personalizableCount,
    };
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
      {/* ── Trigger Card ── */}
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
                {items.length} componentes • {stats.totalPieces} peças
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mini avatar stack */}
            <div className="hidden sm:flex -space-x-2">
              {items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center overflow-hidden"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <Package className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                </div>
              ))}
              {items.length > 4 && (
                <div className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +{items.length - 4}
                </div>
              )}
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* ── Dialog Modal ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden">
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
                  {items.length}{" "}
                  {items.length === 1 ? "componente" : "componentes"} •{" "}
                  {stats.totalPieces}{" "}
                  {stats.totalPieces === 1 ? "peça" : "peças"}
                </DialogDescription>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-2 flex-wrap">
              {stats.productCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1.5 px-2.5 py-1"
                >
                  <ShoppingBag className="h-3 w-3" />
                  {stats.productCount}{" "}
                  {stats.productCount === 1 ? "item" : "itens"}
                </Badge>
              )}
              {stats.packagingCount > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs gap-1.5 px-2.5 py-1"
                >
                  <BoxSelect className="h-3 w-3" />
                  {stats.packagingCount}{" "}
                  {stats.packagingCount === 1 ? "embalagem" : "embalagens"}
                </Badge>
              )}
              {stats.personalizableCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 px-2.5 py-1 text-primary border-primary/30"
                >
                  <Palette className="h-3 w-3" />
                  {stats.personalizableCount} personalizáveis
                </Badge>
              )}
              {stats.totalWeight > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs gap-1.5 px-2.5 py-1"
                >
                  <Weight className="h-3 w-3" />
                  {formatWeight(stats.totalWeight)} total
                </Badge>
              )}
            </div>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="px-6 py-4 space-y-5">
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

              {/* ── Packaging section ── */}
              {packagingItems.length > 0 && (
                <Collapsible
                  open={expandedSections.packaging}
                  onOpenChange={(open) =>
                    setExpandedSections((s) => ({ ...s, packaging: open }))
                  }
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg hover:bg-amber-500/10 transition-colors">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Box className="h-3.5 w-3.5" />
                      Embalagem ({packagingItems.length})
                    </span>
                    {expandedSections.packaging ? (
                      <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      {packagingItems.map((item, idx) => (
                        <KitComponentCard
                          key={item.id}
                          item={item}
                          index={idx + 1}
                          variant="packaging"
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

              {/* ── Items section ── */}
              {productItems.length > 0 && (
                <Collapsible
                  open={expandedSections.products}
                  onOpenChange={(open) =>
                    setExpandedSections((s) => ({ ...s, products: open }))
                  }
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      Itens do Kit ({productItems.length})
                    </span>
                    {expandedSections.products ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      {productItems.map((item, idx) => (
                        <KitComponentCard
                          key={item.id}
                          item={item}
                          index={idx + 1}
                          variant="item"
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

/* ═══════════════════════════════════════════════
   COPY BUTTON
   ═══════════════════════════════════════════════ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [text]
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors shrink-0"
          >
            {copied ? (
              <CheckCheck className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">
          {copied ? "Copiado!" : "Copiar"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ═══════════════════════════════════════════════
   DIMENSION DIAGRAM — Mini visual for A×L×P
   ═══════════════════════════════════════════════ */

function DimensionDiagram({
  height,
  width,
  depth,
}: {
  height?: number | null;
  width?: number | null;
  depth?: number | null;
}) {
  const h = height ?? 0;
  const w = width ?? 0;
  const d = depth ?? 0;
  if (!h && !w && !d) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
      {/* Mini 3D box icon */}
      <div className="shrink-0 relative w-12 h-12">
        {/* Simple isometric box representation */}
        <svg viewBox="0 0 48 48" className="w-full h-full text-primary" fill="none">
          {/* Front face */}
          <path
            d="M8 16 L24 24 L24 42 L8 34 Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Right face */}
          <path
            d="M24 24 L40 16 L40 34 L24 42 Z"
            fill="currentColor"
            fillOpacity="0.08"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Top face */}
          <path
            d="M8 16 L24 8 L40 16 L24 24 Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Dimensions */}
      <div className="flex-1 grid grid-cols-3 gap-x-4 gap-y-1">
        {h > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
              Altura
            </div>
            <div className="text-sm font-bold text-foreground tabular-nums">
              {h} <span className="text-[10px] font-normal text-muted-foreground">mm</span>
            </div>
          </div>
        )}
        {w > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
              Largura
            </div>
            <div className="text-sm font-bold text-foreground tabular-nums">
              {w} <span className="text-[10px] font-normal text-muted-foreground">mm</span>
            </div>
          </div>
        )}
        {d > 0 && (
          <div>
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
              Profund.
            </div>
            <div className="text-sm font-bold text-foreground tabular-nums">
              {d} <span className="text-[10px] font-normal text-muted-foreground">mm</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   BADGE WITH TOOLTIP
   ═══════════════════════════════════════════════ */

function SmartBadge({
  children,
  tooltip,
  className,
  icon: Icon,
}: {
  children: React.ReactNode;
  tooltip: string;
  className?: string;
  icon?: React.ElementType;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 gap-1 cursor-help", className)}>
            {Icon && <Icon className="h-3 w-3" />}
            {children}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ═══════════════════════════════════════════════
   COMPONENT CARD
   ═══════════════════════════════════════════════ */

interface KitComponentCardProps {
  item: KitComponent;
  index: number;
  variant: "packaging" | "item";
  isSelected: boolean;
  selectable: boolean;
  onToggle: () => void;
  onViewProduct?: (productId: string) => void;
}

function KitComponentCard({
  item,
  index,
  variant,
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

  const hasExpandableInfo = item.description || item.personalizationNotes;
  const hasSpecs =
    hasDimensions || (item.weightG != null && item.weightG > 0) || item.material;

  const formatWeight = (g: number) =>
    g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  const isPackaging = variant === "packaging";

  const borderColor = isPackaging
    ? "border-amber-500/25"
    : "border-border";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all overflow-hidden",
        selectable && isSelected
          ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10"
          : cn(borderColor, "bg-card hover:shadow-sm")
      )}
    >
      {/* ── Header Row ── */}
      <div
        className="flex items-start gap-3.5 px-4 pt-4 pb-3 cursor-pointer group"
        onClick={() =>
          selectable ? onToggle() : hasExpandableInfo && setExpanded(!expanded)
        }
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
      >
        {/* Checkbox */}
        {selectable && (
          <div
            className={cn(
              "w-5 h-5 mt-1 rounded-md border-2 flex items-center justify-center transition-all shrink-0",
              isSelected
                ? "bg-primary border-primary scale-105"
                : "border-muted-foreground/30 group-hover:border-primary/50"
            )}
          >
            {isSelected && (
              <Check className="h-3 w-3 text-primary-foreground" />
            )}
          </div>
        )}

        {/* Image with index badge */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden border",
              isPackaging
                ? "bg-amber-500/5 border-amber-500/20"
                : "bg-muted/60 border-border/50"
            )}
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.productName}
                className="w-full h-full object-contain p-1"
                loading="lazy"
              />
            ) : isPackaging ? (
              <Box className="h-7 w-7 text-amber-600/40 dark:text-amber-400/40" />
            ) : (
              <Utensils className="h-6 w-6 text-muted-foreground/30" />
            )}
          </div>
          {/* Index number */}
          <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
            <span className="text-[9px] font-bold text-muted-foreground tabular-nums">
              {index}
            </span>
          </div>
        </div>

        {/* Name + identifiers + badges */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Row 1: Name + quantity */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <Badge
                variant="secondary"
                className="text-xs px-2 py-0.5 shrink-0 font-bold tabular-nums bg-primary/10 text-primary border-0"
              >
                {item.quantity}x
              </Badge>
              <h4 className="text-sm font-semibold text-foreground leading-tight">
                {item.productName}
              </h4>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
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
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
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

          {/* Row 2: SKU + supplier code (copiable) */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {item.sku && (
              <span className="flex items-center gap-1 font-mono bg-muted/50 rounded px-1.5 py-0.5">
                SKU: {item.sku}
                <CopyButton text={item.sku} />
              </span>
            )}
            {item.supplierComponentCode && (
              <span className="flex items-center gap-1 font-mono bg-muted/50 rounded px-1.5 py-0.5">
                <Tag className="h-3 w-3 opacity-50" />
                {item.supplierComponentCode}
                <CopyButton text={item.supplierComponentCode} />
              </span>
            )}
            {item.componentTypeCode && (
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3 opacity-50" />
                {item.componentTypeCode}
              </span>
            )}
          </div>

          {/* Row 3: Two-column layout — Badges | Material */}
          <div className="grid grid-cols-2 gap-3 items-start">
            {/* Col 1: Smart Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.isPackaging && (
                <SmartBadge
                  icon={Package}
                  tooltip="Este componente é a embalagem do kit. Contém os demais itens."
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                >
                  Embalagem
                </SmartBadge>
              )}
              {item.isOptional && (
                <SmartBadge
                  tooltip="Item opcional — pode ser removido do kit sem afetar os demais."
                  className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                >
                  Opcional
                </SmartBadge>
              )}
              {item.isReplaceable && (
                <SmartBadge
                  icon={Settings2}
                  tooltip="Item substituível — pode ser trocado por variantes compatíveis."
                  className="bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30"
                >
                  Substituível
                </SmartBadge>
              )}
              {item.allowsPersonalization && (
                <SmartBadge
                  icon={Palette}
                  tooltip="Aceita gravação/personalização com a logo do cliente."
                  className="text-primary border-primary/30 bg-primary/5"
                >
                  Personalizável
                </SmartBadge>
              )}
              {item.color && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-2 py-0.5 gap-1"
                >
                  Cor: {item.color}
                </Badge>
              )}
            </div>

            {/* Col 2: Material */}
            <div className="flex justify-end">
              {item.material ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 shrink-0">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-medium">Material</span>
                    <span className="text-[11px] font-semibold text-foreground">{item.material}</span>
                  </div>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">—</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Specs Section ── */}
      {hasSpecs && (
        <div className="px-4 pb-3 space-y-2">
          {/* Material + Weight row */}
          {(item.material || (item.weightG != null && item.weightG > 0)) && (
            <div className="flex items-stretch gap-2">
              {item.material && (
                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5 flex-1 min-w-0">
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                      Material
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate">
                      {item.material}
                    </div>
                  </div>
                </div>
              )}
              {item.weightG != null && item.weightG > 0 && (
                <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5 min-w-[110px]">
                  <Weight className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                      Peso {item.quantity > 1 ? "(un.)" : ""}
                    </div>
                    <div className="text-xs font-bold text-foreground tabular-nums">
                      {formatWeight(item.weightG)}
                      {item.quantity > 1 && (
                        <span className="text-[10px] font-normal text-muted-foreground ml-1">
                          ({formatWeight(item.weightG * item.quantity)} total)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dimensions — consolidated diagram */}
          {hasDimensions && (
            <DimensionDiagram
              height={item.heightMm}
              width={item.widthMm}
              depth={item.lengthMm}
            />
          )}
        </div>
      )}

      {/* ── Expandable Details ── */}
      {expanded && hasExpandableInfo && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
          {item.description && (
            <div className="pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3 w-3" />
                Descrição
              </div>
              <p className="text-xs text-muted-foreground/90 whitespace-pre-line leading-relaxed bg-muted/20 rounded-lg p-3">
                {item.description}
              </p>
            </div>
          )}

          {item.personalizationNotes && (
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1.5">
                <Palette className="h-3 w-3" />
                Notas de Personalização
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                {item.personalizationNotes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
