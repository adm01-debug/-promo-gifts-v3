/**
 * CollectionGridCard — Premium card with geometric honeycomb image mosaic.
 */
import { motion } from "framer-motion";
import {
  FolderOpen, MoreVertical, Pencil, Copy, Star,
  Trash2, Package, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelectionCheckbox } from "@/components/common/SelectionCheckbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Collection } from "@/hooks/useCollections";

/* ── Hexagon clip paths ── */
const hexClip = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

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

/* ── Honeycomb Image Mosaic ── */
function HoneycombMosaic({ images }: { images: string[] }) {
  const count = images.length;

  if (count === 1) {
    return (
      <div className="absolute inset-0">
        <img src={images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="absolute inset-0 flex gap-[3px]">
        {images.map((img, i) => (
          <div key={i} className="flex-1 relative overflow-hidden">
            <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[3px]">
        <div className="row-span-2 relative overflow-hidden">
          <img src={images[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="relative overflow-hidden">
          <img src={images[1]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        <div className="relative overflow-hidden">
          <img src={images[2]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
    );
  }

  // 4+ images → geometric mosaic with hexagonal clip on center piece
  const display = images.slice(0, 5);
  return (
    <div className="absolute inset-0">
      {/* Background grid */}
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-[3px]">
        {/* Top-left large */}
        <div className="col-span-2 relative overflow-hidden">
          <img src={display[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        {/* Top-right */}
        <div className="relative overflow-hidden">
          <img src={display[1]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        {/* Bottom-left */}
        <div className="relative overflow-hidden">
          <img src={display[2]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        </div>
        {/* Bottom-center+right */}
        {display[3] && (
          <div className="relative overflow-hidden">
            <img src={display[3]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        {display[4] ? (
          <div className="relative overflow-hidden">
            <img src={display[4]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </div>
        ) : (
          <div className="relative overflow-hidden bg-muted/30" />
        )}
      </div>

      {/* Hexagonal center overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[45%] aspect-[1/1.15] overflow-hidden shadow-xl"
          style={{ clipPath: hexClip }}
        >
          <img
            src={display[Math.min(1, display.length - 1)]}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
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
        "group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
        "bg-card border border-border/50",
        "hover:border-primary/30 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.18)]",
        isSelected && "border-primary ring-2 ring-primary/25 shadow-lg shadow-primary/10"
      )}
      onClick={onNavigate}
    >
      {/* ── Top controls ── */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-10 flex items-start justify-between">
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
              className="h-7 w-7 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-background/50 backdrop-blur-md hover:bg-background/70 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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

      {/* ── Image area — taller aspect for bigger cards ── */}
      <div className="aspect-[3/4] relative overflow-hidden bg-muted/20">
        {hasImages ? (
          <>
            <HoneycombMosaic images={allImages} />

            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/70 to-transparent pointer-events-none" />

            {/* Product count pill */}
            <div className="absolute bottom-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-background/60 backdrop-blur-md text-foreground/80 border border-border/30">
                <Package className="h-3 w-3" />
                {productCount}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-muted/30">
              <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <span className="text-xs text-muted-foreground/40 font-medium">Coleção vazia</span>
          </div>
        )}
      </div>

      {/* ── Card footer ── */}
      <div className="px-4 py-3.5 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
          style={{
            backgroundColor: `${collection.color}14`,
            color: collection.color,
          }}
        >
          {collection.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-semibold text-sm leading-tight text-foreground truncate">
              {collection.name}
            </h3>
            {collection.isFeatured && (
              <Star className="h-3 w-3 text-primary fill-primary shrink-0" />
            )}
          </div>
          {updatedAgo && (
            <p className="text-[11px] text-muted-foreground/50 mt-0.5 flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {updatedAgo}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
