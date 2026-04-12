/**
 * CollectionGridCard — Premium bento-style card for local collections.
 * Hero image layout with glassmorphism info overlay.
 */
import { motion } from "framer-motion";
import {
  FolderOpen, MoreVertical, Pencil, Copy, Star,
  Trash2, Package, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const heroImage = allImages[0];
  const thumbImages = allImages.slice(1, 4);
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
        {/* Selection */}
        <div
          className={cn(
            "transition-opacity duration-200",
            isSelected || isSelectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <SelectionCheckbox checked={isSelected} onChange={onToggleSelect} size="lg" animateEntry />
        </div>

        {/* Context menu */}
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

      {/* ── Image area ── */}
      <div className="aspect-[4/3] relative overflow-hidden bg-muted/20">
        {hasImages ? (
          <>
            {/* Hero + side thumbnails layout */}
            <div className="absolute inset-0 flex gap-[2px]">
              {/* Hero (left, or full if only 1 image) */}
              <div className={cn("relative overflow-hidden", thumbImages.length > 0 ? "flex-[2]" : "flex-1")}>
                <img
                  src={heroImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                  loading="lazy"
                />
              </div>

              {/* Side strip (up to 3 thumbs stacked) */}
              {thumbImages.length > 0 && (
                <div className="flex-1 flex flex-col gap-[2px]">
                  {thumbImages.map((img, i) => (
                    <div key={i} className="relative flex-1 overflow-hidden">
                      <img
                        src={img}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom gradient for text contrast */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card via-card/70 to-transparent pointer-events-none" />

            {/* Product count pill overlay */}
            <div className="absolute bottom-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-background/60 backdrop-blur-md text-foreground/80 border border-border/30">
                <Package className="h-2.5 w-2.5" />
                {productCount}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 bg-muted/30"
            >
              <FolderOpen className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <span className="text-[11px] text-muted-foreground/40 font-medium">Coleção vazia</span>
          </div>
        )}
      </div>

      {/* ── Card footer ── */}
      <div className="px-3.5 py-3 flex items-center gap-2.5">
        {/* Collection icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
          style={{
            backgroundColor: `${collection.color}14`,
            color: collection.color,
          }}
        >
          {collection.icon}
        </div>

        {/* Text block */}
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
