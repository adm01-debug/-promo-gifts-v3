import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MoreVertical, Pencil, Trash2, FolderOpen, Package, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { useExternalCollectionsManager } from "@/hooks/useExternalCollections";
import { toast } from "sonner";

export default function CollectionsPage() {
  const navigate = useNavigate();
  
  // Coleções locais (localStorage)
  const {
    collections: localCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollectionProducts,
    defaultColors,
    defaultIcons,
  } = useCollectionsContext();

  // Coleções do BD externo (Promobrind)
  const {
    collections: externalCollections,
    isLoading: isLoadingExternal,
    refetch: refetchExternal,
  } = useExternalCollectionsManager();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: defaultColors[0],
    icon: defaultIcons[0],
  });

  const handleCreate = () => {
    if (!formData.name.trim()) return;
    createCollection(formData.name, formData.description, formData.color, formData.icon);
    toast.success(`Coleção "${formData.name}" criada`);
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = () => {
    if (!editingCollection || !formData.name.trim()) return;
    updateCollection(editingCollection, {
      name: formData.name,
      description: formData.description,
      color: formData.color,
      icon: formData.icon,
    });
    toast.success("Coleção atualizada");
    setEditingCollection(null);
    resetForm();
  };

  const handleDelete = () => {
    if (!deleteConfirm) return;
    const collection = collections.find((c) => c.id === deleteConfirm);
    deleteCollection(deleteConfirm);
    toast.success(`Coleção "${collection?.name}" excluída`);
    setDeleteConfirm(null);
  };

  const openEdit = (collection: typeof collections[0]) => {
    setFormData({
      name: collection.name,
      description: collection.description || "",
      color: collection.color,
      icon: collection.icon,
    });
    setEditingCollection(collection.id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: defaultColors[0],
      icon: defaultIcons[0],
    });
  };

  return (
    <MainLayout>
      <PageSEO title="Coleções" description="Organize seus produtos favoritos em coleções personalizadas." path="/colecoes" />
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
              Minhas Coleções
            </h1>
            <p className="text-muted-foreground mt-1">
              Organize produtos em pastas personalizadas
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetchExternal()}
              disabled={isLoadingExternal}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoadingExternal && "animate-spin")} />
              Sincronizar
            </Button>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Coleção
            </Button>
          </div>
        </div>

        {/* External Collections (BD Promobrind) */}
        {(externalCollections.length > 0 || isLoadingExternal) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Coleções Sincronizadas</h2>
              <Badge variant="secondary" className="text-xs">
                BD Externo
              </Badge>
            </div>
            
            {isLoadingExternal ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1,2,3,4].map((i) => (
                  <Skeleton key={i} className="h-64 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {externalCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="group relative card-interactive p-4 cursor-pointer border-primary/20"
                    onClick={() => navigate(`/colecao-externa/${collection.id}`)}
                  >
                    {/* Badge sync */}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge variant="outline" className="text-xs bg-background/80">
                        <Cloud className="h-3 w-3 mr-1" />
                        Sync
                      </Badge>
                    </div>

                    {/* Preview */}
                    <div
                      className="aspect-square rounded-xl overflow-hidden mb-4 flex items-center justify-center"
                      style={{ backgroundColor: collection.color ? `${collection.color}15` : 'hsl(var(--muted))' }}
                    >
                      {collection.image_url ? (
                        <img
                          src={collection.image_url}
                          alt={collection.name}
                          className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <FolderOpen
                          className="h-16 w-16"
                          style={{ color: collection.color || 'hsl(var(--primary))' }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: collection.color ? `${collection.color}20` : 'hsl(var(--muted))' }}
                      >
                        {collection.icon || "📁"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {collection.name}
                        </h3>
                        {collection.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {collection.description}
                          </p>
                        )}
                        {collection.is_featured && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local Collections (localStorage) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Coleções Locais</h2>
            <Badge variant="outline" className="text-xs">
              Apenas neste dispositivo
            </Badge>
          </div>

          {localCollections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {localCollections.map((collection) => {
                const products = getCollectionProducts(collection.id);
                const previewImages = products.slice(0, 4).map((p) => p.images[0]);

                return (
                  <div
                    key={collection.id}
                    className="group relative card-interactive p-4 cursor-pointer"
                    onClick={() => navigate(`/colecao/${collection.id}`)}
                  >
                    {/* Menu */}
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon" aria-label="Mais opções"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(collection);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(collection.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Preview images grid */}
                    <div
                      className="aspect-square rounded-xl overflow-hidden mb-4"
                      style={{ backgroundColor: `${collection.color}15` }}
                    >
                      {previewImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-1 p-2 h-full">
                          {previewImages.map((img, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg overflow-hidden bg-background/50"
                            >
                              <img
                                src={img}
                                alt=""
                                className="w-full h-full object-cover" loading="lazy" />
                            </div>
                          ))}
                          {previewImages.length < 4 &&
                            Array(4 - previewImages.length)
                              .fill(0)
                              .map((_, idx) => (
                                <div
                                  key={`empty-${idx}`}
                                  className="rounded-lg bg-background/30"
                                />
                              ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <FolderOpen
                            className="h-16 w-16"
                            style={{ color: collection.color }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${collection.color}20` }}
                      >
                        {collection.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {collection.name}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {collection.productIds.length} produtos
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma coleção local criada
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Crie coleções para organizar seus produtos favoritos em pastas personalizadas
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira coleção
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Dialog
        open={isCreateOpen || !!editingCollection}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCollection(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCollection ? "Editar Coleção" : "Nova Coleção"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                placeholder="Ex: Clientes Premium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descreva esta coleção..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform",
                      formData.color === color && "ring-2 ring-offset-2 ring-primary scale-110"
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
                    onClick={() => setFormData({ ...formData, icon })}
                    className={cn(
                      "w-10 h-10 rounded-lg text-lg flex items-center justify-center border transition-all",
                      formData.icon === icon
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingCollection(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={editingCollection ? handleUpdate : handleCreate}
                disabled={!formData.name.trim()}
              >
                {editingCollection ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir coleção?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os produtos não serão excluídos, apenas removidos desta coleção.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
