import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Layers, ChevronDown, ChevronUp, Copy, Shirt, Coffee, Backpack, PenTool, Package, Gift, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AreaCard } from "./AreaCard";
import { TemplateSelector, type ProductTemplate } from "./TemplateSelector";
import { SaveTemplateDialog } from "./SaveTemplateDialog";

export interface PersonalizationArea {
  id: string;
  name: string;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoRotation?: number;
  logoScale?: number;
  logoPreview: string | null;
}

interface MultiAreaManagerProps {
  areas: PersonalizationArea[];
  activeAreaId: string | null;
  onAreasChange: (areas: PersonalizationArea[]) => void;
  onActiveAreaChange: (areaId: string | null) => void;
  onLogoUpload: (areaId: string, file: File) => void;
  onLogoRemove?: (areaId: string) => void;
  productLocations?: { code: string; name: string; order: number }[] | null;
}

const CUSTOM_TEMPLATES_KEY = "mockup-custom-templates";

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "camiseta", name: "Camiseta", icon: Shirt,
    areas: [
      { name: "Peito Esquerdo", positionX: 25, positionY: 25, logoWidth: 4, logoHeight: 4 },
      { name: "Costas Superior", positionX: 50, positionY: 20, logoWidth: 8, logoHeight: 6 },
      { name: "Costas Central", positionX: 50, positionY: 50, logoWidth: 20, logoHeight: 15 },
      { name: "Manga Esquerda", positionX: 10, positionY: 35, logoWidth: 3, logoHeight: 3 },
    ],
  },
  {
    id: "caneca", name: "Caneca", icon: Coffee,
    areas: [
      { name: "Frente", positionX: 50, positionY: 50, logoWidth: 6, logoHeight: 5 },
      { name: "Verso", positionX: 50, positionY: 50, logoWidth: 6, logoHeight: 5 },
    ],
  },
  {
    id: "mochila", name: "Mochila", icon: Backpack,
    areas: [
      { name: "Bolso Frontal", positionX: 50, positionY: 40, logoWidth: 8, logoHeight: 6 },
      { name: "Corpo Principal", positionX: 50, positionY: 50, logoWidth: 12, logoHeight: 10 },
      { name: "Alça", positionX: 50, positionY: 20, logoWidth: 3, logoHeight: 2 },
    ],
  },
  {
    id: "caneta", name: "Caneta", icon: PenTool,
    areas: [
      { name: "Corpo", positionX: 50, positionY: 50, logoWidth: 4, logoHeight: 1 },
      { name: "Clip", positionX: 50, positionY: 15, logoWidth: 2, logoHeight: 1 },
    ],
  },
  {
    id: "squeeze", name: "Squeeze/Garrafa", icon: Package,
    areas: [
      { name: "Frente", positionX: 50, positionY: 45, logoWidth: 5, logoHeight: 6 },
      { name: "Verso", positionX: 50, positionY: 45, logoWidth: 5, logoHeight: 6 },
      { name: "Tampa", positionX: 50, positionY: 10, logoWidth: 2, logoHeight: 2 },
    ],
  },
  {
    id: "kit", name: "Kit Presente", icon: Gift,
    areas: [
      { name: "Caixa", positionX: 50, positionY: 50, logoWidth: 10, logoHeight: 8 },
      { name: "Item 1", positionX: 30, positionY: 50, logoWidth: 4, logoHeight: 3 },
      { name: "Item 2", positionX: 70, positionY: 50, logoWidth: 4, logoHeight: 3 },
    ],
  },
];

const DEFAULT_AREA_NAMES = [
  "Frente", "Verso", "Lateral Esquerda", "Lateral Direita",
  "Tampa", "Base", "Bolso", "Alça",
];

export function MultiAreaManager({
  areas,
  activeAreaId,
  onAreasChange,
  onActiveAreaChange,
  onLogoUpload,
  onLogoRemove,
  productLocations,
}: MultiAreaManagerProps) {
  const hasDbLocations = !!productLocations && productLocations.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);
  const [customTemplates, setCustomTemplates] = useState<ProductTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState<ProductTemplate | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Load custom templates
  useEffect(() => {
    const saved = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (saved) {
      try { setCustomTemplates(JSON.parse(saved)); } catch (e) { console.error("Failed to parse custom templates:", e); }
    }
  }, []);

  const saveCustomTemplates = (templates: ProductTemplate[]) => {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
    setCustomTemplates(templates);
  };

  const saveAsCustomTemplate = () => {
    if (!newTemplateName.trim()) { toast.error("Digite um nome para o template"); return; }
    if (areas.length === 0) { toast.error("Adicione pelo menos uma área"); return; }

    const newTemplate: ProductTemplate = {
      id: `custom-${Date.now()}`, name: newTemplateName.trim(), icon: User, isCustom: true,
      areas: areas.map(({ name, positionX, positionY, logoWidth, logoHeight }) => ({ name, positionX, positionY, logoWidth, logoHeight })),
    };
    saveCustomTemplates([...customTemplates, newTemplate]);
    toast.success(`Template "${newTemplateName}" salvo com sucesso`);
    setNewTemplateName("");
    setShowSaveDialog(false);
  };

  const deleteCustomTemplate = (templateId: string) => {
    saveCustomTemplates(customTemplates.filter((t) => t.id !== templateId));
    toast.success("Template excluído");
  };

  const applyTemplate = (template: ProductTemplate) => {
    if (areas.some(a => a.logoPreview)) { setPendingTemplate(template); return; }
    doApplyTemplate(template);
  };

  const doApplyTemplate = (template: ProductTemplate) => {
    const newAreas: PersonalizationArea[] = template.areas.map((area) => ({
      ...area, id: crypto.randomUUID(), logoPreview: null,
    }));
    onAreasChange(newAreas);
    onActiveAreaChange(newAreas[0]?.id || null);
    setPendingTemplate(null);
    toast.success(`Template "${template.name}" aplicado com ${template.areas.length} áreas`);
  };

  const addArea = () => {
    const usedNames = areas.map((a) => a.name);
    const availableName = DEFAULT_AREA_NAMES.find((n) => !usedNames.includes(n)) || `Área ${areas.length + 1}`;
    const newArea: PersonalizationArea = {
      id: crypto.randomUUID(), name: availableName,
      positionX: 50, positionY: 50, logoWidth: 5, logoHeight: 3, logoPreview: null,
    };
    onAreasChange([...areas, newArea]);
    onActiveAreaChange(newArea.id);
  };

  const removeArea = (areaId: string) => {
    if (areas.length <= 1) return;
    const updatedAreas = areas.filter((a) => a.id !== areaId);
    onAreasChange(updatedAreas);
    if (activeAreaId === areaId) onActiveAreaChange(updatedAreas[0]?.id || null);
  };

  const updateAreaName = (areaId: string, name: string) => {
    onAreasChange(areas.map((a) => a.id === areaId ? { ...a, name } : a));
  };

  const applyLogoToAllAreas = () => {
    const activeArea = areas.find((a) => a.id === activeAreaId);
    if (!activeArea?.logoPreview) { toast.error("Selecione uma área com logo primeiro"); return; }
    onAreasChange(areas.map((a) => ({ ...a, logoPreview: activeArea.logoPreview })));
    toast.success(`Logo aplicado em ${areas.length} áreas`);
  };

  const activeAreaHasLogo = areas.find((a) => a.id === activeAreaId)?.logoPreview;

  return (
    <Card
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
          const targetAreaId = activeAreaId || areas[0]?.id;
          if (targetAreaId) {
            onLogoUpload(targetAreaId, file);
            toast.success(`Logo aplicado na área "${areas.find(a => a.id === targetAreaId)?.name || "ativa"}"`);
          }
        }
      }}
      className={cn(
        "transition-all duration-200",
        isDraggingOver && "ring-2 ring-primary border-primary bg-primary/5"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:opacity-80">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Áreas de Personalização</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {areas.length} {areas.length === 1 ? "área" : "áreas"}
                </Badge>
              </div>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          <CardDescription className="text-xs">
            {isDraggingOver
              ? "🎯 Solte a imagem para aplicar como logo"
              : hasDbLocations
                ? `${areas.length} ${areas.length === 1 ? 'local configurado' : 'locais configurados'} para este produto`
                : "Adicione múltiplas áreas para personalizar (ex: frente, verso). Arraste um logo aqui!"}
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Areas list */}
            <div className="space-y-2">
              {areas.map((area, index) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  index={index}
                  isActive={activeAreaId === area.id}
                  isReadOnly={hasDbLocations}
                  canRemove={areas.length > 1}
                  onSelect={() => onActiveAreaChange(area.id)}
                  onNameChange={(name) => updateAreaName(area.id, name)}
                  onLogoUpload={(file) => onLogoUpload(area.id, file)}
                  onLogoRemove={() => {
                    const updated = areas.map(a =>
                      a.id === area.id
                        ? { ...a, logoData: null, logoPreview: null }
                        : a
                    );
                    onAreasChange(updated);
                    onLogoRemove?.(area.id);
                  }}
                  onRemove={() => removeArea(area.id)}
                />
              ))}
            </div>

            {/* Template selector + add */}
            {!hasDbLocations && (
              <div className="flex gap-2">
                <TemplateSelector
                  builtInTemplates={PRODUCT_TEMPLATES}
                  customTemplates={customTemplates}
                  onApply={applyTemplate}
                  onDeleteCustom={deleteCustomTemplate}
                  onSaveClick={() => setShowSaveDialog(true)}
                  hasAreas={areas.length > 0}
                />
                <Button variant="outline" size="sm" onClick={addArea} className="flex-1">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            )}
            
            {areas.length > 1 && activeAreaHasLogo && (
              <Button variant="secondary" size="sm" onClick={applyLogoToAllAreas} className="w-full">
                <Copy className="h-4 w-4 mr-1" /> Aplicar Logo em Todas as Áreas
              </Button>
            )}

            {/* Quick add buttons */}
            {!hasDbLocations && (
              <div className="flex flex-wrap gap-1">
                {DEFAULT_AREA_NAMES.filter((name) => !areas.some((a) => a.name === name)).slice(0, 4).map((name) => (
                  <Button
                    key={name}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const newArea: PersonalizationArea = {
                        id: crypto.randomUUID(), name,
                        positionX: 50, positionY: 50, logoWidth: 5, logoHeight: 3, logoPreview: null,
                      };
                      onAreasChange([...areas, newArea]);
                      onActiveAreaChange(newArea.id);
                    }}
                  >
                    + {name}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Save Template Dialog */}
      <SaveTemplateDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        templateName={newTemplateName}
        onTemplateNameChange={setNewTemplateName}
        onSave={saveAsCustomTemplate}
        areas={areas}
      />

      {/* Template Apply Confirmation */}
      <Dialog open={!!pendingTemplate} onOpenChange={(open) => !open && setPendingTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Substituir áreas atuais?</DialogTitle>
            <DialogDescription>
              Você tem logos carregados nas áreas atuais. Aplicar o template "{pendingTemplate?.name}" irá substituir todas as áreas e remover os logos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingTemplate(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => pendingTemplate && doApplyTemplate(pendingTemplate)}>
              Substituir Áreas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
