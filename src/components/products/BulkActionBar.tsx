/**
 * BulkActionBar — Barra flutuante para ações em lote no catálogo.
 * Aparece quando 1+ produtos estão selecionados no modo lista.
 */
import { memo } from "react";
import { Heart, GitCompare, FolderPlus, X, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkFavorite: () => void;
  onBulkCompare: () => void;
  onBulkCollection: () => void;
}

export const BulkActionBar = memo(function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkFavorite,
  onBulkCompare,
  onBulkCollection,
}: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-3 px-4 py-2.5 rounded-2xl",
            "bg-card/95 backdrop-blur-xl border border-primary/30 shadow-2xl shadow-primary/10"
          )}
        >
          <div className="flex items-center gap-2 pr-3 border-r border-border">
            <Badge variant="default" className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5">
              {selectedCount}
            </Badge>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              selecionado{selectedCount > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={onBulkFavorite}>
              <Heart className="h-3.5 w-3.5" /> Favoritar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={onBulkCompare}
              disabled={selectedCount > 4}
            >
              <GitCompare className="h-3.5 w-3.5" /> Comparar
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" onClick={onBulkCollection}>
              <FolderPlus className="h-3.5 w-3.5" /> Coleção
            </Button>
          </div>

          <div className="flex items-center gap-1 pl-2 border-l border-border">
            {selectedCount < totalCount && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-8 text-muted-foreground" onClick={onSelectAll}>
                <CheckSquare className="h-3.5 w-3.5" /> Todos
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onClearSelection}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
