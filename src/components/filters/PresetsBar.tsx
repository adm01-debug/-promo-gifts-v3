import { useState } from "react";
import { FilterPreset, useFilterPresets } from "./FilterPresets";
import { FilterState, defaultFilters } from "./FilterPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PresetsBarProps {
  currentFilters: FilterState;
  onApplyPreset: (filters: FilterState) => void;
  activePresetId?: string;
}

export function PresetsBar({ currentFilters, onApplyPreset, activePresetId }: PresetsBarProps) {
  const { getStoredPresets, savePreset, updatePreset, deletePreset } = useFilterPresets();
  const [presets, setPresets] = useState<FilterPreset[]>(getStoredPresets());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");

  const refreshPresets = () => {
    setPresets(getStoredPresets());
  };

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Digite um nome para o preset");
      return;
    }

    savePreset({
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      filters: currentFilters,
    });

    toast.success("Preset criado com sucesso!");
    setNewPresetName("");
    setNewPresetDescription("");
    setIsCreateOpen(false);
    refreshPresets();
  };

  const handleUpdatePreset = () => {
    if (!selectedPreset || !newPresetName.trim()) return;

    updatePreset(selectedPreset.id, {
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
    });

    toast.success("Preset atualizado!");
    setNewPresetName("");
    setNewPresetDescription("");
    setIsEditOpen(false);
    setSelectedPreset(null);
    refreshPresets();
  };

  const handleDeletePreset = () => {
    if (!selectedPreset) return;

    deletePreset(selectedPreset.id);
    toast.success("Preset removido");
    setIsDeleteOpen(false);
    setSelectedPreset(null);
    refreshPresets();
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
    <div className="flex items-center gap-3 py-3 px-4 bg-card/50 border border-border rounded-xl backdrop-blur-sm">
      {/* Label e botão salvar */}
      <div className="flex items-center gap-2 shrink-0">
        <Bookmark className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground hidden sm:inline">Meus Presets</span>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2"
              onClick={(e) => {
                if (!hasActiveFilters) {
                  e.preventDefault();
                  toast.info("Selecione pelo menos um filtro para salvar um preset");
                }
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="ml-1 hidden sm:inline">Salvar</span>
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
              <Button onClick={handleCreatePreset}>Salvar Preset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border shrink-0" />

      {/* Presets list */}
      {presets.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm">Nenhum preset salvo</span>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex items-center gap-2 pb-1">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap",
                  "hover:bg-accent hover:border-primary/50",
                  activePresetId === preset.id
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-background border-border text-foreground"
                )}
              >
                <button
                  onClick={() => handleApplyPreset(preset)}
                  className="flex items-center gap-2"
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: preset.color || 'hsl(var(--primary))' }}
                  >
                    <Bookmark className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium">{preset.name}</span>
                  {activePresetId === preset.id && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded">
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => openEditDialog(preset)}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => openDeleteDialog(preset)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
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
            <Button onClick={handleUpdatePreset}>Salvar</Button>
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
