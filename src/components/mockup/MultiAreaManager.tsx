import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Layers, MapPin, ChevronDown, ChevronUp, Copy, LayoutTemplate, Shirt, Coffee, Backpack, PenTool, Package, Gift, Save, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TemplatePreview } from "./TemplatePreview";

export interface PersonalizationArea {
  id: string;
  name: string;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoPreview: string | null;
}

interface MultiAreaManagerProps {
  areas: PersonalizationArea[];
  activeAreaId: string | null;
  onAreasChange: (areas: PersonalizationArea[]) => void;
  onActiveAreaChange: (areaId: string | null) => void;
  onLogoUpload: (areaId: string, file: File) => void;
}

interface ProductTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  areas: Omit<PersonalizationArea, "id" | "logoPreview">[];
  isCustom?: boolean;
}

const CUSTOM_TEMPLATES_KEY = "mockup-custom-templates";

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: "camiseta",
    name: "Camiseta",
    icon: Shirt,
    areas: [
      { name: "Peito Esquerdo", positionX: 25, positionY: 25, logoWidth: 4, logoHeight: 4 },
      { name: "Costas Superior", positionX: 50, positionY: 20, logoWidth: 8, logoHeight: 6 },
      { name: "Costas Central", positionX: 50, positionY: 50, logoWidth: 20, logoHeight: 15 },
      { name: "Manga Esquerda", positionX: 10, positionY: 35, logoWidth: 3, logoHeight: 3 },
    ],
  },
  {
    id: "caneca",
    name: "Caneca",
    icon: Coffee,
    areas: [
      { name: "Frente", positionX: 50, positionY: 50, logoWidth: 6, logoHeight: 5 },
      { name: "Verso", positionX: 50, positionY: 50, logoWidth: 6, logoHeight: 5 },
    ],
  },
  {
    id: "mochila",
    name: "Mochila",
    icon: Backpack,
    areas: [
      { name: "Bolso Frontal", positionX: 50, positionY: 40, logoWidth: 8, logoHeight: 6 },
      { name: "Corpo Principal", positionX: 50, positionY: 50, logoWidth: 12, logoHeight: 10 },
      { name: "Alça", positionX: 50, positionY: 20, logoWidth: 3, logoHeight: 2 },
    ],
  },
  {
    id: "caneta",
    name: "Caneta",
    icon: PenTool,
    areas: [
      { name: "Corpo", positionX: 50, positionY: 50, logoWidth: 4, logoHeight: 1 },
      { name: "Clip", positionX: 50, positionY: 15, logoWidth: 2, logoHeight: 1 },
    ],
  },
  {
    id: "squeeze",
    name: "Squeeze/Garrafa",
    icon: Package,
    areas: [
      { name: "Frente", positionX: 50, positionY: 45, logoWidth: 5, logoHeight: 6 },
      { name: "Verso", positionX: 50, positionY: 45, logoWidth: 5, logoHeight: 6 },
      { name: "Tampa", positionX: 50, positionY: 10, logoWidth: 2, logoHeight: 2 },
    ],
  },
  {
    id: "kit",
    name: "Kit Presente",
    icon: Gift,
    areas: [
      { name: "Caixa", positionX: 50, positionY: 50, logoWidth: 10, logoHeight: 8 },
      { name: "Item 1", positionX: 30, positionY: 50, logoWidth: 4, logoHeight: 3 },
      { name: "Item 2", positionX: 70, positionY: 50, logoWidth: 4, logoHeight: 3 },
    ],
  },
];

const DEFAULT_AREA_NAMES = [
  "Frente",
  "Verso",
  "Lateral Esquerda",
  "Lateral Direita",
  "Tampa",
  "Base",
  "Bolso",
  "Alça",
];

export function MultiAreaManager({
  areas,
  activeAreaId,
  onAreasChange,
  onActiveAreaChange,
  onLogoUpload,
}: MultiAreaManagerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [customTemplates, setCustomTemplates] = useState<ProductTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  // Load custom templates from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (saved) {
      try {
        setCustomTemplates(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom templates:", e);
      }
    }
  }, []);

  // Save custom templates to localStorage
  const saveCustomTemplates = (templates: ProductTemplate[]) => {
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
    setCustomTemplates(templates);
  };

  const saveAsCustomTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    if (areas.length === 0) {
      toast.error("Adicione pelo menos uma área");
      return;
    }

    const newTemplate: ProductTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName.trim(),
      icon: User,
      isCustom: true,
      areas: areas.map(({ name, positionX, positionY, logoWidth, logoHeight }) => ({
        name,
        positionX,
        positionY,
        logoWidth,
        logoHeight,
      })),
    };

    saveCustomTemplates([...customTemplates, newTemplate]);
    toast.success(`Template "${newTemplateName}" salvo com sucesso`);
    setNewTemplateName("");
    setShowSaveDialog(false);
  };

  const deleteCustomTemplate = (templateId: string) => {
    const updated = customTemplates.filter((t) => t.id !== templateId);
    saveCustomTemplates(updated);
    toast.success("Template excluído");
  };

  const applyTemplate = (template: ProductTemplate) => {
    const newAreas: PersonalizationArea[] = template.areas.map((area) => ({
      ...area,
      id: crypto.randomUUID(),
      logoPreview: null,
    }));
    onAreasChange(newAreas);
    onActiveAreaChange(newAreas[0]?.id || null);
    toast.success(`Template "${template.name}" aplicado com ${template.areas.length} áreas`);
  };

  const addArea = () => {
    const usedNames = areas.map((a) => a.name);
    const availableName = DEFAULT_AREA_NAMES.find((n) => !usedNames.includes(n)) || `Área ${areas.length + 1}`;
    
    const newArea: PersonalizationArea = {
      id: crypto.randomUUID(),
      name: availableName,
      positionX: 50,
      positionY: 50,
      logoWidth: 5,
      logoHeight: 3,
      logoPreview: null,
    };
    
    const updatedAreas = [...areas, newArea];
    onAreasChange(updatedAreas);
    onActiveAreaChange(newArea.id);
  };

  const removeArea = (areaId: string) => {
    if (areas.length <= 1) return;
    
    const updatedAreas = areas.filter((a) => a.id !== areaId);
    onAreasChange(updatedAreas);
    
    if (activeAreaId === areaId) {
      onActiveAreaChange(updatedAreas[0]?.id || null);
    }
  };

  const updateAreaName = (areaId: string, name: string) => {
    const updatedAreas = areas.map((a) =>
      a.id === areaId ? { ...a, name } : a
    );
    onAreasChange(updatedAreas);
  };

  const handleLogoUpload = (areaId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    onLogoUpload(areaId, file);
  };

  const applyLogoToAllAreas = () => {
    const activeArea = areas.find((a) => a.id === activeAreaId);
    if (!activeArea?.logoPreview) {
      toast.error("Selecione uma área com logo primeiro");
      return;
    }

    const updatedAreas = areas.map((a) => ({
      ...a,
      logoPreview: activeArea.logoPreview,
    }));
    onAreasChange(updatedAreas);
    toast.success(`Logo aplicado em ${areas.length} áreas`);
  };

  const activeAreaHasLogo = areas.find((a) => a.id === activeAreaId)?.logoPreview;

  return (
    <Card>
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
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CardDescription className="text-xs">
            Adicione múltiplas áreas para personalizar (ex: frente, verso)
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Areas list with improved styling */}
            <div className="space-y-2">
              {areas.map((area, index) => (
                <div
                  key={area.id}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-200 cursor-pointer group",
                    activeAreaId === area.id
                      ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                  onClick={() => onActiveAreaChange(area.id)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={activeAreaId === area.id}
                  onKeyDown={(e) => e.key === "Enter" && onActiveAreaChange(area.id)}
                >
                  {/* Step number with animation */}
                  <div className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-200",
                    activeAreaId === area.id
                      ? "bg-primary text-primary-foreground scale-110"
                      : "bg-primary/10 text-primary"
                  )}>
                    {index + 1}
                  </div>
                  
                  {/* Area name input */}
                  <div className="flex-1 min-w-0">
                    <Input
                      value={area.name}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateAreaName(area.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0",
                        activeAreaId === area.id && "font-medium"
                      )}
                      placeholder="Nome da área"
                      aria-label={`Nome da área ${index + 1}`}
                    />
                  </div>

                  {/* Logo indicator with hover effect */}
                  {area.logoPreview ? (
                    <div className="relative h-7 w-7 rounded border bg-background overflow-hidden flex-shrink-0 group-hover:ring-2 ring-primary/30 transition-all">
                      <img
                        src={area.logoPreview}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          e.stopPropagation();
                          handleLogoUpload(area.id, e);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        id={`logo-upload-${area.id}`}
                        aria-label={`Upload logo para ${area.name}`}
                      />
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] cursor-pointer transition-colors",
                          "hover:bg-primary hover:text-primary-foreground hover:border-primary"
                        )}
                      >
                        + Logo
                      </Badge>
                    </div>
                  )}

                  {/* Position indicator */}
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{area.positionX}%</span>
                    <span>×</span>
                    <span>{area.positionY}%</span>
                  </div>

                  {/* Remove button with improved visibility */}
                  {areas.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                        "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeArea(area.id);
                      }}
                      aria-label={`Remover área ${area.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Template selector and action buttons */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <LayoutTemplate className="h-4 w-4 mr-1" />
                    Templates
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Tipo de Produto</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {PRODUCT_TEMPLATES.map((template) => (
                      <HoverCard key={template.id} openDelay={200} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <DropdownMenuItem
                            onClick={() => applyTemplate(template)}
                            className="cursor-pointer"
                          >
                            <template.icon className="h-4 w-4 mr-2" />
                            {template.name}
                            <Badge variant="secondary" className="ml-auto text-[10px]">
                              {template.areas.length}
                            </Badge>
                          </DropdownMenuItem>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" align="start" className="w-auto p-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <template.icon className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{template.name}</span>
                            </div>
                            <TemplatePreview areas={template.areas} />
                            <div className="space-y-0.5">
                              {template.areas.map((area, idx) => (
                                <div key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <span className="w-3 h-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px]">
                                    {idx + 1}
                                  </span>
                                  {area.name} ({area.logoWidth}x{area.logoHeight}cm)
                                </div>
                              ))}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </DropdownMenuGroup>

                  {customTemplates.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Meus Templates</DropdownMenuLabel>
                      <DropdownMenuGroup>
                        {customTemplates.map((template) => (
                          <HoverCard key={template.id} openDelay={200} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <DropdownMenuItem className="cursor-pointer group">
                                <div
                                  className="flex items-center flex-1"
                                  onClick={() => applyTemplate(template)}
                                >
                                  <User className="h-4 w-4 mr-2 text-primary" />
                                  {template.name}
                                  <Badge variant="secondary" className="ml-auto text-[10px] mr-2">
                                    {template.areas.length}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCustomTemplate(template.id);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </DropdownMenuItem>
                            </HoverCardTrigger>
                            <HoverCardContent side="right" align="start" className="w-auto p-3">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-primary" />
                                  <span className="font-medium text-sm">{template.name}</span>
                                </div>
                                <TemplatePreview areas={template.areas} />
                                <div className="space-y-0.5">
                                  {template.areas.map((area, idx) => (
                                    <div key={idx} className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <span className="w-3 h-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px]">
                                        {idx + 1}
                                      </span>
                                      {area.name} ({area.logoWidth}x{area.logoHeight}cm)
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ))}
                      </DropdownMenuGroup>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowSaveDialog(true)}
                    className="cursor-pointer text-primary"
                    disabled={areas.length === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Posicionamento Atual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={addArea}
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            {areas.length > 1 && activeAreaHasLogo && (
              <Button
                variant="secondary"
                size="sm"
                onClick={applyLogoToAllAreas}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-1" />
                Aplicar Logo em Todas as Áreas
              </Button>
            )}

            {/* Quick add buttons */}
            <div className="flex flex-wrap gap-1">
              {DEFAULT_AREA_NAMES.filter(
                (name) => !areas.some((a) => a.name === name)
              )
                .slice(0, 4)
                .map((name) => (
                  <Button
                    key={name}
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => {
                      const newArea: PersonalizationArea = {
                        id: crypto.randomUUID(),
                        name,
                        positionX: 50,
                        positionY: 50,
                        logoWidth: 5,
                        logoHeight: 3,
                        logoPreview: null,
                      };
                      onAreasChange([...areas, newArea]);
                      onActiveAreaChange(newArea.id);
                    }}
                  >
                    + {name}
                  </Button>
                ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Save Template Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Template Personalizado</DialogTitle>
            <DialogDescription>
              Salve a configuração atual das áreas como um template reutilizável.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Template</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Ex: Minha Camiseta Personalizada"
                onKeyDown={(e) => e.key === "Enter" && saveAsCustomTemplate()}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Áreas que serão salvas:</p>
              <ul className="list-disc list-inside mt-1">
                {areas.map((area) => (
                  <li key={area.id}>
                    {area.name} ({area.logoWidth}x{area.logoHeight}cm)
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAsCustomTemplate}>
              <Save className="h-4 w-4 mr-1" />
              Salvar Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
