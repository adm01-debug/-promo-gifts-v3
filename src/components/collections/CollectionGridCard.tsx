/**
 * CollectionGridCard — Premium card with dynamic diagonal collage layout.
 * Inspired by editorial photo grids with angular cuts.
 */
import { motion } from "framer-motion";
import {
  FolderOpen, MoreVertical, Pencil, Copy, Star,
  Trash2, Package, Clock, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Collection } from "@/hooks/useCollections";

interface CollectionGridCardProps {
  collection: Collection;
  products: { images: string[] }[];
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelect: () => void;
  onNavigate: () => void;
  onEdit: () => void;
  onClone: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
  updatedAgo?: string | null;
  index: number;
}

/* ── Thin glass seam lines between collage panels ── */
function FrostSeams({ layout }: { layout: 2 | 3 | 4 }) {
  // Thin diagonal line (2px visual width via narrow clip)
  const diagonalStyle: React.CSSProperties = {
    clipPath: layout === 2
      ? "polygon(49% 0, 51% 0, 41% 100%, 39% 100%)"
      : "polygon(53% 0, 55% 0, 43% 100%, 41% 100%)",
    background: "hsl(var(--background) / 0.55)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };

  const horizontalStyle: React.CSSProperties = {
    clipPath: "polygon(0 53.5%, 100% 53.5%, 100% 55%, 0 55%)",
    background: "hsl(var(--background) / 0.55)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };

  return (
    <div className="absolute inset-0 z-[2] pointer-events-none">
      <div className="absolute inset-0" style={diagonalStyle} />
      {layout >= 3 && <div className="absolute inset-0" style={horizontalStyle} />}
    </div>
  );
}

/* ── Dynamic Collage ── */
function DynamicCollage({ images }: { images: string[] }) {
  const count = images.length;

  if (count === 1) {
    return (
      <div className="absolute inset-0">
        <img src={images[0]} alt="" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" loading="lazy" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 0, 55% 0, 45% 100%, 0 100%)" }}>
          <img src={images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(55% 0, 100% 0, 100% 100%, 45% 100%)" }}>
          <img src={images[1]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        <FrostSeams layout={2} />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 0, 60% 0, 50% 55%, 0 55%)" }}>
          <img src={images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(62% 0, 100% 0, 100% 55%, 52% 55%)" }}>
          <img src={images[1]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 57%, 100% 57%, 100% 100%, 0 100%)" }}>
          <img src={images[2]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        <FrostSeams layout={3} />
      </div>
    );
  }

  const display = images.slice(0, 4);
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 0, 58% 0, 48% 52%, 0 52%)" }}>
        <img src={display[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(60% 0, 100% 0, 100% 52%, 50% 52%)" }}>
        <img src={display[1]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 54%, 48% 54%, 42% 100%, 0 100%)" }}>
        <img src={display[2]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(50% 54%, 100% 54%, 100% 100%, 44% 100%)" }}>
        <img src={display[3]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      </div>
      <FrostSeams layout={4} />
    </div>
  );
}

export function CollectionGridCard({
  collection,
  products,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  onNavigate,
  onEdit,
  onClone,
  onToggleFeatured,
  onDelete,
  updatedAgo,
  index,
}: CollectionGridCardProps) {
  const allImages = products.flatMap((p) => p.images).filter(Boolean);
  const hasImages = allImages.length > 0;
  const productCount = collection.productIds.length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, type: "spring", stiffness: 380, damping: 28 }}
      className={cn(
        "group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500",
        "border-[1.5px] border-white/20",
        "hover:border-white/30",
        isSelected && "border-primary ring-2 ring-primary/25 shadow-lg shadow-primary/10",
        "holo-card"
      )}
      onClick={onNavigate}
    >
      {/* ── Top controls ── */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-start justify-between">
        <div
          className={cn(
            "transition-opacity duration-200",
            isSelected || isSelectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <SelectionCheckbox checked={isSelected} onChange={onToggleSelect} size="lg" animateEntry />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mais opções"
              className="h-8 w-8 rounded-xl sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-card/80 backdrop-blur-xl hover:bg-card shadow-sm border border-border/20"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClone(); }}>
              <Copy className="h-4 w-4 mr-2" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFeatured(); }}>
              <Star className="h-4 w-4 mr-2" />
              {collection.isFeatured ? "Remover destaque" : "Destacar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Image area ── */}
      <div className="aspect-[3/4] relative overflow-hidden bg-white/[0.03]">
        {hasImages ? (
          <>
            <DynamicCollage images={allImages} />

            {/* Product count pill */}
            <div className="absolute top-3 right-14 sm:right-3 sm:group-hover:right-14 transition-all duration-200">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-card/90 backdrop-blur-xl text-foreground border border-border/20 shadow-sm">
                <Package className="h-3 w-3 text-primary" />
                {productCount}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-muted/15 border border-border/20">
              <FolderOpen className="h-8 w-8 text-muted-foreground/25" />
            </div>
            <span className="text-xs text-muted-foreground/35 font-medium tracking-wide">Coleção vazia</span>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-4 space-y-3 bg-white/[0.06] backdrop-blur-md border-t border-white/10">
        {/* Row 1: Icon + Title + Star */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-md"
            style={{
              backgroundColor: collection.color,
              color: "#fff",
            }}
          >
            {collection.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-bold text-base leading-tight text-foreground line-clamp-2">
              {collection.name}
            </h3>
          </div>
          {collection.isFeatured && (
            <Star className="h-4 w-4 text-primary fill-primary shrink-0" />
          )}
        </div>

        {/* Row 2: Meta chips */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 font-medium">
              <Package className="h-3 w-3 text-primary" />
              {productCount} {productCount === 1 ? "item" : "itens"}
            </span>
            {updatedAgo && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50">
                <Clock className="h-3 w-3" />
                {updatedAgo}
              </span>
            )}
          </div>

          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 shadow-sm">
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
