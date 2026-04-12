/**
 * CollectionGridCard — Premium grid card for local collections.
 * Redesigned for visual harmony and polish.
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
  const previewImages = products.slice(0, 4).map((p) => p.images[0]);
  const hasImages = previewImages.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "group relative rounded-2xl bg-card overflow-hidden cursor-pointer transition-all duration-300",
        "border border-border/40 hover:border-primary/40",
        "hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15)]",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
          : ""
      )}
      onClick={onNavigate}
    >
      {/* Context menu */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mais opções"
              className="h-7 w-7 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-md hover:bg-black/60 text-white"
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

      {/* Selection checkbox */}
      <div
        className={cn(
          "absolute top-2.5 left-2.5 z-10 transition-opacity duration-200",
          isSelected || isSelectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectionCheckbox
          checked={isSelected}
          onChange={onToggleSelect}
          size="lg"
          animateEntry
        />
      </div>

      {/* Featured badge overlay */}
      {collection.isFeatured && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-10">
          <Badge
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-primary/90 text-primary-foreground border-0 backdrop-blur-sm shadow-sm"
          >
            <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Destaque
          </Badge>
        </div>
      )}

      {/* Preview images — clean mosaic */}
      <div className="aspect-[4/3] overflow-hidden relative bg-muted/30">
        {hasImages ? (
          <div className="grid grid-cols-2 gap-[3px] p-[3px] h-full">
            {previewImages.map((img, imgIdx) => (
              <div
                key={imgIdx}
                className={cn(
                  "overflow-hidden bg-muted/40",
                  imgIdx === 0 && "rounded-tl-[13px]",
                  imgIdx === 1 && "rounded-tr-[13px]",
                  imgIdx === 2 && "rounded-bl-[13px]",
                  imgIdx === 3 && "rounded-br-[13px]",
                  previewImages.length === 1 && "col-span-2 row-span-2 rounded-[13px]",
                  previewImages.length === 2 && "row-span-2",
                  previewImages.length === 2 && imgIdx === 0 && "rounded-l-[13px] rounded-tr-none",
                  previewImages.length === 2 && imgIdx === 1 && "rounded-r-[13px] rounded-tl-none",
                  previewImages.length === 3 && imgIdx === 0 && "row-span-2 rounded-l-[13px] rounded-tr-none rounded-br-none",
                )}
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
            ))}
            {previewImages.length === 3 && (
              <div className="rounded-br-[13px] bg-muted/20" />
            )}
            {previewImages.length < 3 &&
              Array(4 - Math.max(previewImages.length, previewImages.length === 2 ? 4 : previewImages.length))
                .fill(0)
                .map((_, i) => <div key={`empty-${i}`} className="bg-muted/20" />)
            }
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2.5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
              style={{ backgroundColor: `${collection.color}15` }}
            >
              <FolderOpen
                className="h-8 w-8"
                style={{ color: collection.color }}
              />
            </div>
            <span className="text-[11px] text-muted-foreground/60 font-medium">Coleção vazia</span>
          </div>
        )}

        {/* Soft gradient overlay at bottom for text readability */}
        {hasImages && (
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card/50 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Card info — clean and balanced */}
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 transition-colors duration-200"
            style={{
              backgroundColor: `${collection.color}12`,
              color: collection.color,
            }}
          >
            {collection.icon}
          </div>

          {/* Text */}
          <div className="min-w-0 flex-1">
            <h3 className="font-display font-semibold text-[0.9rem] leading-tight text-foreground truncate">
              {collection.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                <Package className="h-3 w-3" />
                {collection.productIds.length} {collection.productIds.length === 1 ? "produto" : "produtos"}
              </span>
              {updatedAgo && (
                <>
                  <span className="text-muted-foreground/30 text-[10px]">•</span>
                  <span className="text-[11px] text-muted-foreground/50 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {updatedAgo}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
