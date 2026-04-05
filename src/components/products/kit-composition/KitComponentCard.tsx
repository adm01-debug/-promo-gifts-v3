import { useState, useCallback } from "react";
import {
  Package, Image as ImageIcon, Check, Palette, Settings2, Weight, Eye, Layers,
  BoxSelect, ShoppingBag, ChevronUp, ChevronDown, Tag, FileText, Hash,
  Copy, CheckCheck, Maximize2, Box, Utensils, ArrowUpDown, ArrowLeftRight, MoveHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KitComponent } from "@/types/product-catalog";

/* ── Copy Button ── */
export function CopyButton({ text }: { text: string }) {
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
          <button onClick={handleCopy} className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-muted transition-colors shrink-0">
            {copied ? <CheckCheck className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[10px]">{copied ? "Copiado!" : "Copiar"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Smart Badge ── */
export function SmartBadge({ children, tooltip, className, icon: Icon }: { children: React.ReactNode; tooltip: string; className?: string; icon?: React.ElementType }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 gap-1 cursor-help", className)}>
            {Icon && <Icon className="h-3 w-3" />}
            {children}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Kit Component Card ── */
export interface KitComponentCardProps {
  item: KitComponent;
  index: number;
  variant: "packaging" | "item";
  isSelected: boolean;
  selectable: boolean;
  onToggle: () => void;
  onViewProduct?: (productId: string) => void;
  onZoomImage?: (url: string) => void;
}

export function KitComponentCard({ item, index, variant, isSelected, selectable, onToggle, onViewProduct, onZoomImage }: KitComponentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasDimensions = (item.heightMm != null && item.heightMm > 0) || (item.widthMm != null && item.widthMm > 0) || (item.lengthMm != null && item.lengthMm > 0);
  const hasExpandableInfo = item.description || item.personalizationNotes;
  const hasSpecs = hasDimensions || (item.weightG != null && item.weightG > 0);
  const isPackaging = variant === "packaging";
  const borderColor = isPackaging ? "border-amber-500/25" : "border-border";

  const formatWeight = (g: number) => g >= 1000 ? `${(g / 1000).toFixed(1)} kg` : `${g} g`;

  return (
    <div className={cn("rounded-xl border transition-all overflow-hidden", selectable && isSelected ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10" : cn(borderColor, "bg-card hover:shadow-sm"))}>
      {/* Header Row */}
      <div
        className="flex items-start gap-3.5 px-4 pt-4 pb-3 cursor-pointer group"
        onClick={() => selectable ? onToggle() : hasExpandableInfo && setExpanded(!expanded)}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
      >
        {selectable && (
          <div className={cn("w-5 h-5 mt-1 rounded-md border-2 flex items-center justify-center transition-all shrink-0", isSelected ? "bg-primary border-primary scale-105" : "border-muted-foreground/30 group-hover:border-primary/50")}>
            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
        )}

        <div className="shrink-0">
          <div className="relative">
            <div
              className={cn("w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden border", isPackaging ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/60 border-border/50", item.imageUrl && "cursor-zoom-in hover:ring-2 hover:ring-primary/40 transition-all")}
              onClick={(e) => { if (item.imageUrl && onZoomImage) { e.stopPropagation(); onZoomImage(item.imageUrl); } }}
            >
              {item.imageUrl ? (
                
<img src={item.imageUrl} alt={item.productName} className="w-full h-full object-contain p-1" loading="lazy" />
              ) : isPackaging ? (
                <Box className="h-7 w-7 text-amber-600/40 dark:text-amber-400/40" />
              ) : (
                <Utensils className="h-6 w-6 text-muted-foreground/30" />
              )}
            </div>
            <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
              <span className="text-[9px] font-bold text-muted-foreground tabular-nums">{index}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0 font-bold tabular-nums bg-primary/10 text-primary border-0">{item.quantity}x</Badge>
              <h4 className="text-sm font-semibold text-foreground leading-tight">{item.productName}</h4>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {hasExpandableInfo && !selectable && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                  {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              )}
              {onViewProduct && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onViewProduct(item.productId); }}>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left"><p className="text-xs">Ver produto</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {item.sku && (
              <span className="flex items-center gap-1 font-mono bg-muted/50 rounded px-1.5 py-0.5">
                SKU: {item.sku}<CopyButton text={item.sku} />
              </span>
            )}
            {item.supplierComponentCode && (
              <span className="flex items-center gap-1 font-mono bg-muted/50 rounded px-1.5 py-0.5">
                <Tag className="h-3 w-3 opacity-50" />{item.supplierComponentCode}<CopyButton text={item.supplierComponentCode} />
              </span>
            )}
            {item.componentTypeCode && (
              <span className="flex items-center gap-1"><Hash className="h-3 w-3 opacity-50" />{item.componentTypeCode}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {item.isPackaging && <SmartBadge icon={Package} tooltip="Este componente é a embalagem do kit." className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Embalagem</SmartBadge>}
            {item.isOptional && <SmartBadge tooltip="Item opcional — pode ser removido do kit." className="bg-primary/10 text-primary border-primary/30">Opcional</SmartBadge>}
            {item.isReplaceable && <SmartBadge icon={Settings2} tooltip="Item substituível." className="bg-primary/15 text-primary/80 border-primary/25">Substituível</SmartBadge>}
            {item.allowsPersonalization && <SmartBadge icon={Palette} tooltip="Aceita personalização." className="text-primary border-primary/30 bg-primary/5">Personalizável</SmartBadge>}
            {item.color && <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">Cor: {item.color}</Badge>}
            <SmartBadge icon={Layers} tooltip="Material principal do item." className="bg-muted/40 text-foreground border-border">{item.material || "—"}</SmartBadge>
          </div>
        </div>
      </div>

      {/* Specs */}
      {hasSpecs && (
        <div className="px-4 pb-3">
          <div className="flex items-stretch gap-1.5">
            {(item.heightMm ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1.5 flex-1 min-w-0">
                <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
                <div><div className="text-[9px] text-muted-foreground leading-tight">Altura</div><div className="text-xs font-bold text-foreground tabular-nums leading-tight">{item.heightMm} <span className="text-[9px] font-normal text-muted-foreground">mm</span></div></div>
              </div>
            )}
            {(item.widthMm ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1.5 flex-1 min-w-0">
                <ArrowLeftRight className="h-3.5 w-3.5 text-primary shrink-0" />
                <div><div className="text-[9px] text-muted-foreground leading-tight">Largura</div><div className="text-xs font-bold text-foreground tabular-nums leading-tight">{item.widthMm} <span className="text-[9px] font-normal text-muted-foreground">mm</span></div></div>
              </div>
            )}
            {(item.lengthMm ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1.5 flex-1 min-w-0">
                <MoveHorizontal className="h-3.5 w-3.5 text-primary shrink-0" />
                <div><div className="text-[9px] text-muted-foreground leading-tight">Profundidade</div><div className="text-xs font-bold text-foreground tabular-nums leading-tight">{item.lengthMm} <span className="text-[9px] font-normal text-muted-foreground">mm</span></div></div>
              </div>
            )}
            {item.weightG != null && item.weightG > 0 && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1.5 flex-1 min-w-0">
                <Weight className="h-3.5 w-3.5 text-primary shrink-0" />
                <div><div className="text-[9px] text-muted-foreground leading-tight">Peso</div><div className="text-xs font-bold text-foreground tabular-nums leading-tight">{formatWeight(item.weightG)}</div></div>
              </div>
            )}
            {item.volumeMl != null && item.volumeMl > 0 && (
              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1.5 flex-1 min-w-0">
                <Box className="h-3.5 w-3.5 text-primary shrink-0" />
                <div><div className="text-[9px] text-muted-foreground leading-tight">Volume</div><div className="text-xs font-bold text-foreground tabular-nums leading-tight">{item.volumeMl} <span className="text-[9px] font-normal text-muted-foreground">ml</span></div></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expandable Details */}
      {expanded && hasExpandableInfo && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 animate-in slide-in-from-top-1 duration-200">
          {item.description && (
            <div className="pt-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1.5"><FileText className="h-3 w-3" />Descrição</div>
              <p className="text-xs text-muted-foreground/90 whitespace-pre-line leading-relaxed bg-muted/20 rounded-lg p-3">{item.description}</p>
            </div>
          )}
          {item.personalizationNotes && (
            <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1.5"><Palette className="h-3 w-3" />Notas de Personalização</div>
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">{item.personalizationNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
