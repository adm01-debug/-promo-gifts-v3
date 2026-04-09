import React, { useState } from "react";
import { FilterPreset, useFilterPresets } from "./FilterPresets";
import { FilterState, defaultFilters } from "./FilterPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Check,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Preset Colors & Emojis ───────────────────────────────
const PRESET_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#a855f7", // purple
];

const PRESET_EMOJIS = [
  "📦", "🎯", "⭐", "🔥", "💎", "🏷️", "🎨", "🛒",
  "📋", "🚀", "💡", "🎁", "🏆", "📌", "✨", "🔖",
];

interface PresetsBarProps {
  currentFilters: FilterState;
  onApplyPreset: (filters: FilterState, presetId?: string) => void;
  activePresetId?: string;
}

export const PresetsBar = React.forwardRef<HTMLDivElement, PresetsBarProps>(
  function PresetsBar({ currentFilters, onApplyPreset, activePresetId }, ref) {
  const { presets, isLoading, savePreset, updatePreset, deletePreset } = useFilterPresets();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDescription, setNewPresetDescription] = useState("");
  const [newPresetColor, setNewPresetColor] = useState(PRESET_COLORS[0]);
  const [newPresetEmoji, setNewPresetEmoji] = useState(PRESET_EMOJIS[0]);
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
      icon: newPresetEmoji,
      color: newPresetColor,
    });
    setIsSaving(false);

    if (result) {
      toast.success("Preset criado com sucesso!");
      setNewPresetName("");
      setNewPresetDescription("");
      setNewPresetColor(PRESET_COLORS[0]);
      setNewPresetEmoji(PRESET_EMOJIS[0]);
      setIsCreateOpen(false);
    }
  };

  const handleUpdatePreset = async () => {
    if (!selectedPreset || !newPresetName.trim()) return;

    setIsSaving(true);
    const result = await updatePreset(selectedPreset.id, {
      name: newPresetName.trim(),
      description: newPresetDescription.trim() || undefined,
      icon: newPresetEmoji,
      color: newPresetColor,
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
    onApplyPreset(preset.filters, preset.id);
    toast.success(`Preset "${preset.name}" aplicado`);
  };

  const openEditDialog = (preset: FilterPreset) => {
    setSelectedPreset(preset);
    setNewPresetName(preset.name);
    setNewPresetDescription(preset.description || "");
    setNewPresetColor(preset.color || PRESET_COLORS[0]);
    setNewPresetEmoji(preset.icon || PRESET_EMOJIS[0]);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (preset: FilterPreset) => {
    setSelectedPreset(preset);
    setIsDeleteOpen(true);
  };

  const hasActiveFilters = JSON.stringify(currentFilters) !== JSON.stringify(defaultFilters);

  // ─── Shared Color & Emoji Picker ─────────────────────────
  const ColorEmojiPicker = () => (
    <div className="space-y-3">
      {/* Emoji Picker */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Emoji</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setNewPresetEmoji(emoji)}
              className={cn(
                "w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all",
                "hover:bg-accent hover:scale-110",
                newPresetEmoji === emoji
                  ? "bg-primary/15 ring-2 ring-primary scale-110"
                  : "bg-muted/50"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cor</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setNewPresetColor(color)}
              className={cn(
                "w-7 h-7 rounded-full transition-all border-2",
                "hover:scale-110",
                newPresetColor === color
                  ? "border-foreground scale-110 shadow-lg"
                  : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            >
              {newPresetColor === color && (
                <Check className="h-3.5 w-3.5 text-white mx-auto" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={ref} className="contents">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon" aria-label="Bookmark"
            className={cn(
              "relative h-10 w-10 rounded-full border-border/50 transition-colors",
              presets.length > 0 ? "hover:border-primary/50" : "opacity-60 hover:opacity-100"
            )}
          >
            <Bookmark className="h-4 w-4" />
            {presets.length > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1.5 -right-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full"
              >
                {presets.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-3" sideOffset={8}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bookmark className="h-4 w-4 text-primary" />
                <span>Meus Presets</span>
                {presets.length > 0 && (
                  <span className="text-muted-foreground text-xs">({presets.length})</span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon" aria-label="Adicionar"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => {
                      if (!hasActiveFilters) {
                        toast.info("Selecione pelo menos um filtro para salvar um preset");
                        return;
                      }
                      setIsCreateOpen(true);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salvar preset</TooltipContent>
              </Tooltip>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : presets.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum preset salvo ainda
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className={cn(
                      "group flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer",
                      "hover:bg-accent",
                      activePresetId === preset.id
                        ? "bg-primary/10 border border-primary/30"
                        : "border border-transparent"
                    )}
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-sm"
                      style={{ backgroundColor: (preset.color || PRESET_COLORS[0]) + '20' }}
                    >
                      {preset.icon || "🔖"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{preset.name}</p>
                      {preset.description && (
                        <p className="text-[10px] text-muted-foreground truncate">{preset.description}</p>
                      )}
                    </div>
                    {activePresetId === preset.id && (
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button aria-label="Mais opções"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
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
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Preset de Filtros</DialogTitle>
            <DialogDescription>
              Salve os filtros atuais como um preset para uso futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: newPresetColor + '25' }}
              >
                {newPresetEmoji}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {newPresetName || "Nome do preset"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {newPresetDescription || "Descrição..."}
                </p>
              </div>
            </div>

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

            <ColorEmojiPicker />
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Preview */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: newPresetColor + '25' }}
              >
                {newPresetEmoji}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {newPresetName || "Nome do preset"}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {newPresetDescription || "Descrição..."}
                </p>
              </div>
            </div>

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

            <ColorEmojiPicker />
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
);
