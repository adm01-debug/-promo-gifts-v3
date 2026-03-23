import { useState } from "react";
import { Plus, Check, FolderPlus } from "lucide-react";
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
import { toast } from "sonner";

interface AddToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

export const AddToCollectionModal = ({
  open,
  onOpenChange,
  productId,
  productName,
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
      addProductToCollection(collectionId, productId);
      toast.success(`Adicionado a "${collectionName}"`);
    }
  };

  const handleCreateCollection = () => {
    if (!newName.trim()) return;

    const newCollection = createCollection(newName, undefined, selectedColor, selectedIcon);
    addProductToCollection(newCollection.id, productId);
    toast.success(`Coleção "${newName}" criada`);
    
    setNewName("");
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar à Coleção</DialogTitle>
          <DialogDescription className="truncate">
            {productName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing collections */}
          {collections.length > 0 && (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {collections.map((collection) => {
                  const isInCollection = isProductInCollection(productId, collection.id);
                  return (
                    <button
                      key={collection.id}
                      onClick={() => handleToggleCollection(collection.id, collection.name)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all",
                        isInCollection
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${collection.color}20` }}
                      >
                        {collection.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm">{collection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {collection.productIds.length} produtos
                        </p>
                      </div>
                      {isInCollection && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Create new collection */}
          {isCreating ? (
            <div className="space-y-4 p-4 border border-dashed border-border rounded-lg">
              <div className="space-y-2">
                <Label>Nome da coleção</Label>
                <Input
                  placeholder="Ex: Clientes Premium"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
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
                  Criar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsCreating(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Nova Coleção
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
