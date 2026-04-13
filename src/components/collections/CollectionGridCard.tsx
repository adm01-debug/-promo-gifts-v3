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

function CollagePanel({ src, clipPath }: { src: string; clipPath: string }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden will-change-transform [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
      style={{ clipPath, WebkitClipPath: clipPath }}
    >
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        loading="lazy"
      />
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
        <CollagePanel src={images[0]} clipPath="polygon(-2px -2px, calc(56% + 2px) -2px, calc(46% + 2px) calc(100% + 2px), -2px calc(100% + 2px))" />
        <CollagePanel src={images[1]} clipPath="polygon(calc(54% - 2px) -2px, calc(100% + 2px) -2px, calc(100% + 2px) calc(100% + 2px), calc(44% - 2px) calc(100% + 2px))" />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="absolute inset-0">
        <CollagePanel src={images[0]} clipPath="polygon(-2px -2px, calc(61% + 2px) -2px, calc(51.5% + 2px) calc(56.5% + 2px), -2px calc(56.5% + 2px))" />
        <CollagePanel src={images[1]} clipPath="polygon(calc(59% - 2px) -2px, calc(100% + 2px) -2px, calc(100% + 2px) calc(56.5% + 2px), calc(49.5% - 2px) calc(56.5% + 2px))" />
        <CollagePanel src={images[2]} clipPath="polygon(-2px calc(54.5% - 2px), calc(100% + 2px) calc(54.5% - 2px), calc(100% + 2px) calc(100% + 2px), -2px calc(100% + 2px))" />
      </div>
    );
  }

  const display = images.slice(0, 4);
  return (
    <div className="absolute inset-0">
      <CollagePanel src={display[0]} clipPath="polygon(-2px -2px, calc(59% + 2px) -2px, calc(49.5% + 2px) calc(53.5% + 2px), -2px calc(53.5% + 2px))" />
      <CollagePanel src={display[1]} clipPath="polygon(calc(57% - 2px) -2px, calc(100% + 2px) -2px, calc(100% + 2px) calc(53.5% + 2px), calc(47.5% - 2px) calc(53.5% + 2px))" />
      <CollagePanel src={display[2]} clipPath="polygon(-2px calc(51.5% - 2px), calc(49.5% + 2px) calc(51.5% - 2px), calc(43.5% + 2px) calc(100% + 2px), -2px calc(100% + 2px))" />
      <CollagePanel src={display[3]} clipPath="polygon(calc(47.5% - 2px) calc(51.5% - 2px), calc(100% + 2px) calc(51.5% - 2px), calc(100% + 2px) calc(100% + 2px), calc(41.5% - 2px) calc(100% + 2px))" />
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
        "group relative rounded-2xl overflow-hidden cursor-pointer bg-card shadow-sm transition-all duration-500",
        "border-[1.5px] border-border/40 hover:border-primary/40",
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
              className="h-8 w-8 rounded-xl sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-background/95 hover:bg-background shadow-sm border border-border/30"
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
      <div className="aspect-[3/4] relative overflow-hidden bg-muted/20">
        {hasImages ? (
          <>
            <DynamicCollage images={allImages} />

            {/* Product count pill */}
            <div className="absolute top-3 right-14 sm:right-3 sm:group-hover:right-14 transition-all duration-200 z-[5]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-background/95 text-foreground border border-border/30 shadow-sm">
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
      <div className="p-4 space-y-3 bg-card border-t border-border/20">
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
