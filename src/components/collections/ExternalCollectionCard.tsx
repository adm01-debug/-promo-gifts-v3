/**
 * ExternalCollectionCard — Grid/List card for catalog (external) collections.
 * Extracted from CollectionsPage for modularity.
 */
import { motion } from "framer-motion";
import { FolderOpen, Package, Star, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExternalCollection } from "@/hooks/useExternalCollections";

interface ExternalCollectionCardProps {
  collection: ExternalCollection;
  productCount: number | undefined;
  viewMode: "grid" | "list";
  onNavigate: () => void;
  onDuplicate: () => void;
  index: number;
}

export function ExternalCollectionCard({
  collection,
  productCount,
  viewMode,
  onNavigate,
  onDuplicate,
  index,
}: ExternalCollectionCardProps) {
  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.03 }}
        className="group flex items-center gap-4 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:shadow-md cursor-pointer transition-all duration-200"
        onClick={onNavigate}
      >
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-lg shrink-0 overflow-hidden"
          style={{ backgroundColor: collection.color ? `${collection.color}20` : "hsl(var(--muted))" }}
        >
          {collection.image_url ? (
            <img src={collection.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <FolderOpen className="h-6 w-6" style={{ color: collection.color || "hsl(var(--primary))" }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">{collection.name}</h3>
          {collection.description && (
            <p className="text-sm text-muted-foreground truncate">{collection.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />
            {productCount ?? "…"}
          </span>
          {collection.is_featured && <Star className="h-4 w-4 text-primary" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 400, damping: 25 }}
      className="group relative rounded-xl sm:rounded-2xl bg-card overflow-hidden cursor-pointer border-[1.5px] border-primary/20 hover:border-primary/50 hover:shadow-xl card-lift transition-all duration-300"
      onClick={onNavigate}
    >
      <div
        className="aspect-[4/3] overflow-hidden flex items-center justify-center relative"
        style={{
          backgroundColor: collection.color ? `${collection.color}12` : "hsl(var(--muted))",
        }}
      >
        {collection.image_url ? (
          <img
            src={collection.image_url}
            alt={collection.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FolderOpen
              className="h-14 w-14 transition-transform duration-300 group-hover:scale-110"
              style={{ color: collection.color || "hsl(var(--primary))" }}
            />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card/80 to-transparent" />
      </div>

      <div className="p-4 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{
            backgroundColor: collection.color ? `${collection.color}20` : "hsl(var(--muted))",
          }}
        >
          {collection.icon || "📁"}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold text-foreground truncate">
            {collection.name}
          </h3>
          {collection.description && (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
              {collection.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Package className="h-3 w-3" />
              {productCount ?? "…"} produtos
            </p>
            {collection.is_featured && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20"
              >
                <Star className="h-3 w-3 mr-0.5" />
                Destaque
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Duplicar como coleção local"
          className="h-8 w-8 bg-background/60 backdrop-blur-sm hover:bg-background/80"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
