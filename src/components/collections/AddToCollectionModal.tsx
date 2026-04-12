import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, FolderPlus, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { CollectionVariantInfo } from "@/hooks/useCollections";
import { toast } from "sonner";

interface AddToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  variant?: CollectionVariantInfo;
}

export const AddToCollectionModal = ({
  open,
  onOpenChange,
  productId,
  productName,
  variant,
}: AddToCollectionModalProps) => {
  const {
    collections,
    createCollection,
    addProductToCollection,
    removeProductFromCollection,
    isProductInCollection,
    defaultColors,
    defaultIcons,
  } = useCollectionsContext();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
  const [selectedIcon, setSelectedIcon] = useState(defaultIcons[0]);

  const handleToggleCollection = (collectionId: string, collectionName: string) => {
    if (isProductInCollection(productId, collectionId)) {
      removeProductFromCollection(collectionId, productId);
      toast.success(`Removido de "${collectionName}"`);
    } else {
      addProductToCollection(collectionId, productId, variant);
      toast.success(`Adicionado a "${collectionName}"`, {
        icon: "📁",
      });
    }
  };

  const handleCreateCollection = () => {
    if (!newName.trim()) return;

    const newCollection = createCollection(newName, undefined, selectedColor, selectedIcon);
    addProductToCollection(newCollection.id, productId, variant);
    toast.success(`Coleção "${newName}" criada`, {
      icon: "✨",
      description: "Produto adicionado automaticamente",
    });
    
    setNewName("");
    setIsCreating(false);
  };

  const collectionsInProduct = collections.filter(c => isProductInCollection(productId, c.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Adicionar à Coleção
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5 leading-snug">
            {variant?.color_hex && (
              <span
                className="inline-block w-3 h-3 rounded-full border border-border shrink-0"
                style={{ backgroundColor: variant.color_hex }}
              />
            )}
            <span className="break-words">{productName}</span>
            {variant?.color_name && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">({variant.color_name})</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing collections */}
          {collections.length > 0 && (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {collections.map((collection, idx) => {
                  const isInCollection = isProductInCollection(productId, collection.id);
                  return (
                    <motion.button
                      key={collection.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => handleToggleCollection(collection.id, collection.name)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
                        isInCollection
                          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${collection.color}20` }}
                      >
                        {collection.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{collection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {collection.productIds.length} produto{collection.productIds.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <AnimatePresence mode="wait">
                        {isInCollection && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Create new collection */}
          <AnimatePresence mode="wait">
            {isCreating ? (
              <motion.div
                key="creating"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-4 p-4 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                  <div className="space-y-2">
                    <Label>Nome da coleção</Label>
                    <Input
                      placeholder="Ex: Clientes Premium"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleCreateCollection()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex flex-wrap gap-2">
                      {defaultColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "w-8 h-8 rounded-full transition-transform",
                            selectedColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <div className="flex flex-wrap gap-2">
                      {defaultIcons.map((icon) => (
                        <button
                          key={icon}
                          onClick={() => setSelectedIcon(icon)}
                          className={cn(
                            "w-10 h-10 rounded-lg text-lg flex items-center justify-center border transition-all",
                            selectedIcon === icon
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleCreateCollection}
                      disabled={!newName.trim()}
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Criar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed hover:border-primary/50"
                  onClick={() => setIsCreating(true)}
                >
                  <FolderPlus className="h-4 w-4" />
                  Nova Coleção
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary + Confirm */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {collectionsInProduct > 0 && (
              <p className="text-xs text-muted-foreground">
                Em {collectionsInProduct} coleção{collectionsInProduct > 1 ? "ões" : ""}
              </p>
            )}
            <Button
              className="gap-2 ml-auto"
              onClick={() => onOpenChange(false)}
            >
              <Check className="h-4 w-4" />
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
