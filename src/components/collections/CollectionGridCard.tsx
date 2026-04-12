/**
 * CollectionGridCard — Premium grid card for local collections.
 * Extracted from CollectionsPage for maintainability.
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "group relative rounded-xl sm:rounded-2xl bg-card overflow-hidden cursor-pointer border-[1.5px] hover:shadow-xl card-lift transition-all duration-300",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10"
          : "border-primary/20 hover:border-primary/50"
      )}
      onClick={onNavigate}
    >
      {/* Context menu */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Mais opções"
              className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-background/60 backdrop-blur-sm hover:bg-background/80"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
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
          "absolute top-3 left-3 z-10 transition-opacity duration-200",
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

      {/* Preview images grid */}
      <div
        className="aspect-[4/3] overflow-hidden relative"
        style={{ backgroundColor: `${collection.color}12` }}
      >
        {previewImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-1.5 p-3 h-full">
            {previewImages.map((img, imgIdx) => (
              <div key={imgIdx} className="rounded-lg overflow-hidden bg-background/50">
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
            {previewImages.length < 4 &&
              Array(4 - previewImages.length)
                .fill(0)
                .map((_, i) => <div key={`empty-${i}`} className="rounded-lg bg-background/20" />)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <FolderOpen
              className="h-14 w-14 transition-transform duration-300 group-hover:scale-110"
              style={{ color: collection.color }}
            />
            <span className="text-xs text-muted-foreground">Sem produtos</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/60 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${collection.color}20` }}
        >
          {collection.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-foreground truncate">{collection.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              {collection.productIds.length} produtos
            </p>
            {collection.isFeatured && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
              >
                <Star className="h-2.5 w-2.5 mr-0.5" /> Destaque
              </Badge>
            )}
            {updatedAgo && (
              <span className="text-xs text-muted-foreground/60 flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {updatedAgo}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
