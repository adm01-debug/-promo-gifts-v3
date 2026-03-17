import { useState } from "react";
import { FilterPreset, useFilterPresets } from "./FilterPresets";
import { FilterState, defaultFilters } from "./FilterPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { 
  Bookmark, 
  Plus, 
  MoreVertical, 
  Pencil, 
  Trash2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PresetManagerProps {
  currentFilters: FilterState;
  onApplyPreset: (filters: FilterState) => void;
  activePresetId?: string;
}

export function PresetManager({ currentFilters, onApplyPreset, activePresetId }: PresetManagerProps) {
  const { presets, isLoading, savePreset, updatePreset, deletePreset } = useFilterPresets();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleCreatePreset = async () => {
    if (!newPresetName.trim()) {
      toast.error("Digite um nome para o preset");
      return;
    }

    setIsSaving(true);
    const result = await savePreset({
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      filters: currentFilters,
    });
    setIsSaving(false);

    if (result) {
      toast.success("Preset criado com sucesso!");
      setNewPresetName("");
      setNewPresetDescription("");
      setIsCreateOpen(false);
    }
  };

  const handleUpdatePreset = async () => {
    if (!selectedPreset || !newPresetName.trim()) return;

    setIsSaving(true);
    const result = await updatePreset(selectedPreset.id, {
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
    });
    setIsSaving(false);

    if (result) {
      toast.success("Preset atualizado!");
      setNewPresetName("");
      setNewPresetDescription("");
      setIsEditOpen(false);
      setSelectedPreset(null);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset) return;

    const success = await deletePreset(selectedPreset.id);
    if (success) {
      toast.success("Preset removido");
    }
    setIsDeleteOpen(false);
    setSelectedPreset(null);
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onApplyPreset(preset.filters);
    toast.success(`Preset "${preset.name}" aplicado`);
  };

  const openEditDialog = (preset: FilterPreset) => {
    setSelectedPreset(preset);
    setNewPresetName(preset.name);
    setNewPresetDescription(preset.description || "");
    setIsEditOpen(true);
  };

  const openDeleteDialog = (preset: FilterPreset) => {
    setSelectedPreset(preset);
    setIsDeleteOpen(true);
  };

  const hasActiveFilters = JSON.stringify(currentFilters) !== JSON.stringify(defaultFilters);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Presets de Filtros</h3>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={!hasActiveFilters}>
              <Plus className="h-4 w-4 mr-1" />
              Salvar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar Preset de Filtros</DialogTitle>
              <DialogDescription>
                Salve os filtros atuais como um preset para uso futuro.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Preset</label>
                <Input
                  placeholder="Ex: Campanha de Verão"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Input
                  placeholder="Descreva o preset..."
                  value={newPresetDescription}
                  onChange={(e) => setNewPresetDescription(e.target.value)}
                  maxLength={100}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreatePreset} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Preset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Presets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed border-border">
          <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum preset salvo
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Aplique filtros e clique em "Salvar" para criar um preset
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                "hover:bg-accent/50",
                activePresetId === preset.id
                  ? "bg-primary/10 border-primary"
                  : "bg-card border-border"
              )}
            >
              <button
                className="flex-1 flex items-center gap-3 text-left"
                onClick={() => handleApplyPreset(preset)}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: preset.color || 'hsl(var(--primary))' }}
                >
                  <Bookmark className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{preset.name}</p>
                  {preset.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {preset.description}
                    </p>
                  )}
                </div>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(preset)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(preset)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePreset} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Preset</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o preset "{selectedPreset?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePreset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
