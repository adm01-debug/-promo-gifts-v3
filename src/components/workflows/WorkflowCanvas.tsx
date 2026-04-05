import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GripVertical,
  Plus,
  Trash2,
  Play,
  Pause,
  Settings2,
  Bot,
  Brain,
  Zap,
  MessageSquare,
  Search,
  FileText,
  ArrowRight,
  Workflow,
  Sparkles,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Types
export interface WorkflowStep {
  id: string;
  name: string;
  type: "agent" | "tool" | "condition" | "output";
  description: string;
  agentModel?: string;
  prompt?: string;
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: "draft" | "active" | "paused";
}

const STEP_TYPES = [
  { value: "agent", label: "Agente IA", icon: Bot, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  { value: "tool", label: "Ferramenta", icon: Zap, color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  { value: "condition", label: "Condição", icon: Search, color: "text-primary/80", bg: "bg-primary/10", border: "border-primary/25" },
  { value: "output", label: "Saída", icon: FileText, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
];

const AI_MODELS = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

// Sortable step component
function SortableStep({
  step,
  index,
  totalSteps,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  onEdit: (step: WorkflowStep) => void;
  onDelete: (id: string) => void;
  onDuplicate: (step: WorkflowStep) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeConfig = STEP_TYPES.find((t) => t.value === step.type) || STEP_TYPES[0];
  const Icon = typeConfig.icon;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Connector line */}
      {index < totalSteps - 1 && (
        <div className="absolute left-7 top-full w-0.5 h-6 bg-border z-0" />
      )}
      {index < totalSteps - 1 && (
        <div className="absolute left-[22px] top-[calc(100%+20px)] z-10">
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground -rotate-90" />
        </div>
      )}

      <div
        className={cn(
          "group flex items-stretch rounded-xl border transition-all duration-200",
          typeConfig.border,
          isDragging ? "shadow-lg opacity-80 scale-[1.02]" : "hover:shadow-md",
          "bg-card"
        )}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center px-2 cursor-grab active:cursor-grabbing border-r border-border/50 hover:bg-muted/50 rounded-l-xl"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Content */}
        <div className="flex-1 p-3 flex items-center gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", typeConfig.bg)}>
            <Icon className={cn("h-5 w-5", typeConfig.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{step.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
                {typeConfig.label}
              </Badge>
              {step.agentModel && (
                <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                  {AI_MODELS.find((m) => m.value === step.agentModel)?.label || step.agentModel}
                </Badge>
              )}
            </div>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" aria-label="Copiar" className="h-7 w-7" onClick={() => onDuplicate(step)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings2" className="h-7 w-7" onClick={() => onEdit(step)}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon" aria-label="Excluir"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(step.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main component
export function WorkflowCanvas() {
  const [workflow, setWorkflow] = useState<WorkflowDefinition>({
    id: crypto.randomUUID(),
    name: "Novo Workflow",
    description: "Orquestração multiagente",
    steps: [],
    status: "draft",
  });

  const [editDialog, setEditDialog] = useState<WorkflowStep | null>(null);
  const [editForm, setEditForm] = useState<Partial<WorkflowStep>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setWorkflow((prev) => {
        const oldIndex = prev.steps.findIndex((s) => s.id === active.id);
        const newIndex = prev.steps.findIndex((s) => s.id === over.id);
        return { ...prev, steps: arrayMove(prev.steps, oldIndex, newIndex) };
      });
    },
    []
  );

  const addStep = (type: WorkflowStep["type"]) => {
    const typeLabel = STEP_TYPES.find((t) => t.value === type)?.label || type;
    const newStep: WorkflowStep = {
      id: crypto.randomUUID(),
      name: `${typeLabel} ${workflow.steps.length + 1}`,
      type,
      description: "",
      agentModel: type === "agent" ? "google/gemini-2.5-flash" : undefined,
      prompt: type === "agent" ? "" : undefined,
      config: {},
    };
    setWorkflow((prev) => ({ ...prev, steps: [...prev.steps, newStep] }));
    toast.success(`Etapa "${typeLabel}" adicionada`);
  };

  const deleteStep = (id: string) => {
    setWorkflow((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== id),
    }));
  };

  const duplicateStep = (step: WorkflowStep) => {
    const newStep = { ...step, id: crypto.randomUUID(), name: `${step.name} (cópia)` };
    setWorkflow((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
    toast.success("Etapa duplicada");
  };

  const openEdit = (step: WorkflowStep) => {
    setEditForm({ ...step });
    setEditDialog(step);
  };

  const saveEdit = () => {
    if (!editDialog || !editForm) return;
    setWorkflow((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === editDialog.id ? { ...s, ...editForm } as WorkflowStep : s
      ),
    }));
    setEditDialog(null);
    toast.success("Etapa atualizada");
  };

  const statusColor = {
    draft: "bg-muted text-muted-foreground",
    active: "bg-primary/10 text-primary",
    paused: "bg-warning/10 text-warning",
  };

  return (
    <div className="space-y-6">
      {/* Workflow Header */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Workflow className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  value={workflow.name}
                  onChange={(e) => setWorkflow((p) => ({ ...p, name: e.target.value }))}
                  className="text-lg font-bold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                />
                <Input
                  value={workflow.description}
                  onChange={(e) => setWorkflow((p) => ({ ...p, description: e.target.value }))}
                  className="text-sm text-muted-foreground border-none p-0 h-auto focus-visible:ring-0 bg-transparent mt-0.5"
                  placeholder="Descrição do workflow..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", statusColor[workflow.status])}>
                {workflow.status === "draft" ? "Rascunho" : workflow.status === "active" ? "Ativo" : "Pausado"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setWorkflow((p) => ({
                    ...p,
                    status: p.status === "active" ? "paused" : "active",
                  }))
                }
              >
                {workflow.status === "active" ? (
                  <><Pause className="h-4 w-4 mr-1" />Pausar</>
                ) : (
                  <><Play className="h-4 w-4 mr-1" />Ativar</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Add Step Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-1">Adicionar:</span>
        {STEP_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Button
              key={type.value}
              variant="outline"
              size="sm"
              onClick={() => addStep(type.value as WorkflowStep["type"])}
              className={cn("gap-1.5", type.border, "hover:bg-muted/50")}
            >
              <Icon className={cn("h-4 w-4", type.color)} />
              {type.label}
            </Button>
          );
        })}
      </div>

      {/* Canvas */}
      <Card className="border-border/50 min-h-[300px]">
        <CardContent className="p-6">
          {workflow.steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Sparkles className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-muted-foreground">Canvas vazio</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Adicione etapas para criar seu fluxo de orquestração multiagente.
                Arraste para reordenar.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => addStep("agent")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar primeira etapa
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={workflow.steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-8">
                  {workflow.steps.map((step, index) => (
                    <SortableStep
                      key={step.id}
                      step={step}
                      index={index}
                      totalSteps={workflow.steps.length}
                      onEdit={openEdit}
                      onDelete={deleteStep}
                      onDuplicate={duplicateStep}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Step summary */}
      {workflow.steps.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{workflow.steps.length} etapa{workflow.steps.length > 1 ? "s" : ""}</span>
          <span>•</span>
          <span>{workflow.steps.filter((s) => s.type === "agent").length} agente(s)</span>
          <span>•</span>
          <span>{workflow.steps.filter((s) => s.type === "tool").length} ferramenta(s)</span>
        </div>
      )}

      {/* Edit Step Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configurar Etapa
            </DialogTitle>
            <DialogDescription>Configure os parâmetros desta etapa do workflow</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input
                value={editForm.name || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <Select
                value={editForm.type || "agent"}
                onValueChange={(v) =>
                  setEditForm((p) => ({
                    ...p,
                    type: v as WorkflowStep["type"],
                    agentModel: v === "agent" ? p.agentModel || "google/gemini-2.5-flash" : undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STEP_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Input
                value={editForm.description || ""}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="O que esta etapa faz..."
              />
            </div>
            {(editForm.type === "agent") && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1 block">Modelo de IA</label>
                  <Select
                    value={editForm.agentModel || "google/gemini-2.5-flash"}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, agentModel: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Prompt do Agente</label>
                  <Textarea
                    value={editForm.prompt || ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, prompt: e.target.value }))}
                    className="min-h-[120px] font-mono text-xs"
                    placeholder="Instruções para o agente..."
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
