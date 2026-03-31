import { useState, useMemo } from "react";
import {
  Package,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  Settings2,
  Weight,
  Eye,
  Layers,
  BoxSelect,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [isOpen, setIsOpen] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

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

  // Separate packaging from products
  const packagingItems = items.filter((i) => i.isPackaging);
  const productItems = items.filter((i) => !i.isPackaging);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* ── Header ── */}
        <CollapsibleTrigger className="flex items-center justify-between w-full px-5 py-4 hover:bg-accent/40 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-foreground text-base">
                Composição do Kit
              </h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {items.length}{" "}
                  {items.length === 1 ? "componente" : "componentes"} •{" "}
                  {stats.totalPieces}{" "}
                  {stats.totalPieces === 1 ? "peça" : "peças"}
                </span>
                {stats.totalWeight > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 gap-0.5"
                  >
                    <Weight className="h-2.5 w-2.5" />
                    {formatWeight(stats.totalWeight)}
                  </Badge>
                )}
              </div>
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
              {stats.personalizableCount > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 text-primary border-primary/30"
                >
                  <Palette className="h-2.5 w-2.5" />
                  {stats.personalizableCount}
                </Badge>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border">
            {/* ── Selection bar ── */}
            {onSelectItems && (
              <div className="flex items-center justify-between px-5 py-2.5 bg-muted/40 border-b border-border">
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
              <div>
                <div className="px-5 py-2 bg-muted/30 border-b border-border">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <BoxSelect className="h-3 w-3" />
                    Embalagem
                  </span>
                </div>
                <div className="grid gap-0 divide-y divide-border">
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
              </div>
            )}

            {/* ── Products section ── */}
            {productItems.length > 0 && (
              <div>
                {packagingItems.length > 0 && (
                  <div className="px-5 py-2 bg-muted/30 border-b border-border">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <ShoppingBag className="h-3 w-3" />
                      Itens do Kit
                    </span>
                  </div>
                )}
                <div className="grid gap-0 divide-y divide-border">
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
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
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
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-5 py-3.5 transition-colors group",
        selectable
          ? isSelected
            ? "bg-primary/5"
            : "hover:bg-accent/30 cursor-pointer"
          : ""
      )}
      onClick={() => selectable && onToggle()}
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
          {isSelected && (
            <Check className="h-3 w-3 text-primary-foreground" />
          )}
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
      <div className="flex-1 min-w-0 space-y-1">
        {/* Name + quantity */}
        <div className="flex items-start gap-2">
          <Badge
            variant="secondary"
            className="text-[11px] px-1.5 py-0 shrink-0 font-bold tabular-nums"
          >
            {item.quantity}x
          </Badge>
          <span className="text-sm font-medium text-foreground leading-tight line-clamp-2">
            {item.productName}
          </span>
        </div>

        {/* SKU + material */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-mono">
            {item.sku || "—"}
          </span>
          {item.material && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-[11px] text-muted-foreground">
                {item.material}
              </span>
            </>
          )}
          {item.weightG != null && item.weightG > 0 && (
            <>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-[11px] text-muted-foreground">
                {item.weightG >= 1000
                  ? `${(item.weightG / 1000).toFixed(1)} kg`
                  : `${item.weightG} g`}
              </span>
            </>
          )}
        </div>

        {/* Feature badges */}
        <div className="flex items-center gap-1 flex-wrap">
          {item.isPackaging && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 gap-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                  >
                    <Package className="h-2.5 w-2.5" />
                    Embalagem
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    Este item é a embalagem/caixa do kit
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 gap-0.5 bg-violet-500/10 text-violet-700 dark:text-violet-400"
                  >
                    <Settings2 className="h-2.5 w-2.5" />
                    Substituível
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">
                    Pode ser trocado por variante equivalente
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        </div>
      </div>

      {/* View product action */}
      {onViewProduct && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
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
  );
}
