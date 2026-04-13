/**
 * ExternalCollectionTableView — Table view for catalog (external) collections.
 */
import { motion } from "framer-motion";
import { FolderOpen, Package, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExternalCollection } from "@/hooks/useExternalCollections";

interface ExternalCollectionTableViewProps {
  collections: ExternalCollection[];
  productCounts?: Map<string, number>;
  onNavigate: (id: string) => void;
  onDuplicate: (collection: ExternalCollection) => void;
}

export function ExternalCollectionTableView({
  collections, productCounts, onNavigate, onDuplicate,
}: ExternalCollectionTableViewProps) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-muted/30 border-b border-border/50">
            <th className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Coleção</th>
            <th className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Produtos</th>
            <th className="px-3 py-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {collections.map((collection, idx) => {
            const count = productCounts?.get(collection.id);
            return (
              <motion.tr
                key={collection.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="group border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => onNavigate(collection.id)}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-sm shrink-0 overflow-hidden"
                      style={{ backgroundColor: collection.color ? `${collection.color}20` : "hsl(var(--muted))" }}
                    >
                      {collection.image_url ? (
                        <img src={collection.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{collection.name}</p>
                      {collection.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{collection.description}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Package className="h-3 w-3" />
                    {count ?? "—"}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                    onClick={() => onDuplicate(collection)}
                  >
                    <Copy className="h-3 w-3" />
                    Duplicar
                  </Button>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
