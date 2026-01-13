// src/components/simulator/TechniqueSelectionCard.tsx
// Seleção de técnicas com cards visuais, modo compacto/expandido, filtros por categoria

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Palette, Clock, DollarSign, X, Info, ChevronDown, ChevronUp, 
  Sparkles, Ruler, LayoutGrid, LayoutList, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import { useState, useMemo, forwardRef } from "react";
import type { Technique, TechniqueSettings } from "@/types/simulation";
import type { ColorOption, SizeOption } from "@/hooks/useTechniquePricingOptions";

interface TechniquePricingInfo {
  hasPriceByColor: boolean;
  hasPriceByArea: boolean;
  colorOptions: ColorOption[];
  sizeOptions: SizeOption[];
}

interface TechniqueSelectionCardProps {
  techniques: Technique[] | undefined;
  techniquesLoading: boolean;
  selectedTechniques: string[];
  techniqueSettings: Record<string, TechniqueSettings>;
  onToggle: (id: string) => void;
  onUpdateSetting: (id: string, field: keyof TechniqueSettings, value: number) => void;
  needsColorInput: (code: string) => boolean;
  needsSizeInput: (code: string) => boolean;
  quantity: number;
  getPricingInfo?: (code: string) => TechniquePricingInfo;
}

// Categorias de técnicas
const TECHNIQUE_CATEGORIES = [
  { id: 'all', label: 'Todas', icon: '🎯', codes: [] },
  { id: 'silk', label: 'Serigrafia', icon: '🎨', codes: ['SILK', 'SERIGRAFIA'] },
  { id: 'dtf', label: 'DTF/Transfer', icon: '🖨️', codes: ['DTF', 'SUB', 'TRANSFER'] },
  { id: 'embroidery', label: 'Bordado', icon: '🧵', codes: ['BORD', 'EMBROID'] },
  { id: 'laser', label: 'Laser', icon: '⚡', codes: ['LASER'] },
  { id: 'other', label: 'Outras', icon: '✨', codes: [] },
] as const;

// Ícone e cor baseado no código da técnica
const getTechniqueStyle = (code: string) => {
  const c = code?.toUpperCase() || "";
  if (c.includes("SILK") || c.includes("SERIGRAFIA")) {
    return { color: "bg-violet-500", icon: "🎨", category: 'silk' };
  }
  if (c.includes("DTF")) {
    return { color: "bg-cyan-500", icon: "🖨️", category: 'dtf' };
  }
  if (c.includes("SUB") || c.includes("TRANSFER")) {
    return { color: "bg-pink-500", icon: "🌈", category: 'dtf' };
  }
  if (c.includes("BORD") || c.includes("EMBROID")) {
    return { color: "bg-amber-500", icon: "🧵", category: 'embroidery' };
  }
  if (c.includes("LASER")) {
    return { color: "bg-red-500", icon: "⚡", category: 'laser' };
  }
  return { color: "bg-slate-500", icon: "✨", category: 'other' };
};

// Determinar categoria de uma técnica
const getTechniqueCategory = (code: string): string => {
  const c = code?.toUpperCase() || "";
  for (const cat of TECHNIQUE_CATEGORIES) {
    if (cat.id === 'all' || cat.id === 'other') continue;
    if (cat.codes.some(catCode => c.includes(catCode))) {
      return cat.id;
    }
  }
  return 'other';
};

export const TechniqueSelectionCard = forwardRef<HTMLDivElement, TechniqueSelectionCardProps>(function TechniqueSelectionCard(
  {
    techniques,
    techniquesLoading,
    selectedTechniques,
    techniqueSettings,
    onToggle,
    onUpdateSetting,
    needsColorInput,
    needsSizeInput,
    quantity,
    getPricingInfo,
  },
  ref
) {
  const [expandedTechnique, setExpandedTechnique] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Filtrar técnicas por categoria
  const filteredTechniques = useMemo(() => {
    if (!techniques) return [];
    
    let filtered = [...techniques];
    
    // Filtrar por categoria
    if (activeCategory !== 'all') {
      filtered = filtered.filter(t => getTechniqueCategory(t.code || "") === activeCategory);
    }
    
    // Ordenar: selecionadas primeiro, depois por prazo
    return filtered.sort((a, b) => {
      const aSelected = selectedTechniques.includes(a.id);
      const bSelected = selectedTechniques.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.estimated_days - b.estimated_days;
    });
  }, [techniques, activeCategory, selectedTechniques]);

  // Contar técnicas por categoria
  const categoryCounts = useMemo(() => {
    if (!techniques) return {};
    const counts: Record<string, number> = { all: techniques.length };
    techniques.forEach(t => {
      const cat = getTechniqueCategory(t.code || "");
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [techniques]);

  const getSlaInfo = (days: number) => {
    if (days <= 3) return { label: "Express", color: "bg-emerald-500", textColor: "text-emerald-600" };
    if (days <= 7) return { label: "Padrão", color: "bg-amber-500", textColor: "text-amber-600" };
    return { label: "Estendido", color: "bg-rose-500", textColor: "text-rose-600" };
  };

  return (
    <Card ref={ref} className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              Técnicas de Personalização
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              Selecione as técnicas que deseja comparar
              {selectedTechniques.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {selectedTechniques.length} selecionada(s)
                </Badge>
              )}
            </CardDescription>
          </div>
          
          {/* Toggle Compacto/Expandido */}
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={viewMode === 'expanded'}
                    onPressedChange={() => setViewMode('expanded')}
                    size="sm"
                    className={cn(
                      "data-[state=on]:bg-background data-[state=on]:shadow-sm",
                      "h-8 px-3"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1.5 text-xs">Expandido</span>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Visualização expandida com detalhes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={viewMode === 'compact'}
                    onPressedChange={() => setViewMode('compact')}
                    size="sm"
                    className={cn(
                      "data-[state=on]:bg-background data-[state=on]:shadow-sm",
                      "h-8 px-3"
                    )}
                  >
                    <LayoutList className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1.5 text-xs">Compacto</span>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Visualização compacta em lista</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Filtros por categoria */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {TECHNIQUE_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            if (cat.id !== 'all' && count === 0) return null;
            
            return (
              <motion.button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  "border",
                  activeCategory === cat.id 
                    ? "bg-primary text-primary-foreground border-primary shadow-md" 
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:bg-muted"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <Badge 
                  variant={activeCategory === cat.id ? "secondary" : "outline"} 
                  className={cn(
                    "h-5 px-1.5 text-[10px]",
                    activeCategory === cat.id && "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {count}
                </Badge>
              </motion.button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {techniquesLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className={cn(
            "space-y-2 max-h-[500px] overflow-y-auto pr-2",
            viewMode === 'compact' && "space-y-1"
          )}>
            <AnimatePresence mode="popLayout">
              {filteredTechniques.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-muted-foreground"
                >
                  <Filter className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhuma técnica nesta categoria</p>
                  <Button 
                    variant="link" 
                    size="sm"
                    onClick={() => setActiveCategory('all')}
                  >
                    Ver todas as técnicas
                  </Button>
                </motion.div>
              ) : (
                filteredTechniques.map((technique, idx) => {
                  const isSelected = selectedTechniques.includes(technique.id);
                  const style = getTechniqueStyle(technique.code || "");
                  const sla = getSlaInfo(technique.estimated_days);
                  const settings = techniqueSettings[technique.id] || { colors: 1, width: 10, height: 10, positions: 1 };
                  const isExpanded = expandedTechnique === technique.id;
                  
                  // Get dynamic pricing info if available
                  const pricingInfo = getPricingInfo?.(technique.code || "");
                  const showColors = pricingInfo?.hasPriceByColor ?? needsColorInput(technique.code || "");
                  const showSize = pricingInfo?.hasPriceByArea ?? needsSizeInput(technique.code || "");
                  const colorOptions = pricingInfo?.colorOptions || [];
                  const sizeOptions = pricingInfo?.sizeOptions || [];

                  // Estimate total cost preview
                  let estimatedCost = technique.unit_cost * quantity + technique.setup_cost;

                  // COMPACT VIEW
                  if (viewMode === 'compact') {
                    return (
                      <motion.div
                        key={technique.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div
                          onClick={() => onToggle(technique.id)}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                            isSelected 
                              ? "border-primary bg-primary/5 shadow-sm" 
                              : "border-border hover:border-primary/50 bg-card"
                          )}
                        >
                          {/* Icon mini */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0",
                            style.color, "text-white"
                          )}>
                            {style.icon}
                            {isSelected && (
                              <motion.div
                                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                              >
                                <span className="text-[8px] text-primary-foreground">✓</span>
                              </motion.div>
                            )}
                          </div>

                          {/* Nome e código */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{technique.name}</span>
                              <Badge variant="outline" className="text-[10px] font-mono px-1 h-4 hidden sm:inline-flex">
                                {technique.code}
                              </Badge>
                            </div>
                          </div>

                          {/* Stats compactos */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className={cn("flex items-center gap-1", sla.textColor)}>
                              <Clock className="h-3 w-3" />
                              {technique.estimated_days}d
                            </span>
                            <span className="font-mono hidden sm:inline">
                              {formatCurrency(estimatedCost)}
                            </span>
                          </div>

                          {/* Configurar button */}
                          {isSelected && (showColors || showSize) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTechnique(isExpanded ? null : technique.id);
                              }}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>

                        {/* Expanded settings inline */}
                        <AnimatePresence>
                          {isSelected && isExpanded && (showColors || showSize) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-3 ml-11 border-l-2 border-primary/30">
                                <TechniqueSettingsForm
                                  technique={technique}
                                  settings={settings}
                                  showColors={showColors}
                                  showSize={showSize}
                                  colorOptions={colorOptions}
                                  sizeOptions={sizeOptions}
                                  onUpdateSetting={onUpdateSetting}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  }

                  // EXPANDED VIEW (default)
                  return (
                    <motion.div
                      key={technique.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div
                        className={cn(
                          "relative rounded-xl border-2 transition-all duration-200 overflow-hidden",
                          isSelected 
                            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 ring-2 ring-primary/20" 
                            : "border-border hover:border-primary/50 hover:shadow-md bg-card"
                        )}
                      >
                        {/* Main row */}
                        <div 
                          className="p-4 cursor-pointer"
                          onClick={() => onToggle(technique.id)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon with pulse animation when selected */}
                            <motion.div 
                              className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative flex-shrink-0",
                                style.color, "text-white"
                              )}
                              animate={isSelected ? { 
                                boxShadow: ["0 0 0 0 rgba(99, 102, 241, 0)", "0 0 0 8px rgba(99, 102, 241, 0.1)", "0 0 0 0 rgba(99, 102, 241, 0)"] 
                              } : {}}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              {style.icon}
                              {isSelected && (
                                <motion.div
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                >
                                  <span className="text-[10px] text-primary-foreground">✓</span>
                                </motion.div>
                              )}
                            </motion.div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-semibold text-base">{technique.name}</h4>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {technique.code}
                                </Badge>
                                {isSelected && (
                                  <Badge className="bg-primary/20 text-primary text-xs">
                                    ✓ Selecionada
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                                {technique.description || "Técnica de personalização"}
                              </p>

                              {/* Quick stats */}
                              <div className="flex items-center gap-3 mt-2 text-sm">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="flex items-center gap-1">
                                      <Clock className={cn("h-3.5 w-3.5", sla.textColor)} />
                                      <span className={cn("font-medium", sla.textColor)}>
                                        {technique.estimated_days}d
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Prazo estimado: {technique.estimated_days} dias úteis</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="flex items-center gap-1 text-muted-foreground">
                                      <DollarSign className="h-3.5 w-3.5" />
                                      <span className="font-mono">
                                        {formatCurrency(technique.unit_cost)}/un
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Setup: {formatCurrency(technique.setup_cost)}</p>
                                      <p>Min: {technique.min_quantity} un</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {technique.min_quantity > 1 && (
                                  <span className="text-xs text-muted-foreground">
                                    mín: {technique.min_quantity}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right side - Cost preview & expand */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Estimativa</p>
                                <p className="font-bold text-lg">
                                  {formatCurrency(estimatedCost)}
                                </p>
                              </div>
                              
                              {isSelected && (showColors || showSize) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedTechnique(isExpanded ? null : technique.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" />
                                      Ocultar
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      Configurar
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded settings */}
                        <AnimatePresence>
                          {isSelected && isExpanded && (showColors || showSize) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 pt-0 border-t border-border/50">
                                <TechniqueSettingsForm
                                  technique={technique}
                                  settings={settings}
                                  showColors={showColors}
                                  showSize={showSize}
                                  colorOptions={colorOptions}
                                  sizeOptions={sizeOptions}
                                  onUpdateSetting={onUpdateSetting}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Empty state */}
        {!techniquesLoading && (!techniques || techniques.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma técnica cadastrada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Componente extraído para configurações da técnica
interface TechniqueSettingsFormProps {
  technique: Technique;
  settings: TechniqueSettings;
  showColors: boolean;
  showSize: boolean;
  colorOptions: ColorOption[];
  sizeOptions: SizeOption[];
  onUpdateSetting: (id: string, field: keyof TechniqueSettings, value: number) => void;
}

function TechniqueSettingsForm({
  technique,
  settings,
  showColors,
  showSize,
  colorOptions,
  sizeOptions,
  onUpdateSetting,
}: TechniqueSettingsFormProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
      {showColors && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Cores
          </Label>
          {colorOptions.length > 0 ? (
            <Select
              value={settings.colors.toString()}
              onValueChange={(val) => onUpdateSetting(technique.id, 'colors', parseInt(val))}
            >
              <SelectTrigger 
                className="h-10"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type="number"
              min={1}
              max={12}
              value={settings.colors}
              onChange={(e) => onUpdateSetting(technique.id, 'colors', parseInt(e.target.value) || 1)}
              className="h-10"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      {showSize && (
        <>
          {sizeOptions.length > 0 ? (
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Tamanho
              </Label>
              <Select
                value={`${settings.width}x${settings.height}`}
                onValueChange={(val) => {
                  const [w, h] = val.split('x').map(Number);
                  onUpdateSetting(technique.id, 'width', w);
                  onUpdateSetting(technique.id, 'height', h);
                }}
              >
                <SelectTrigger 
                  className="h-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sizeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label} ({opt.areaCm2} cm²)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Largura (cm)</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.width}
                  onChange={(e) => onUpdateSetting(technique.id, 'width', parseInt(e.target.value) || 1)}
                  className="h-10"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Altura (cm)</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.height}
                  onChange={(e) => onUpdateSetting(technique.id, 'height', parseInt(e.target.value) || 1)}
                  className="h-10"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </>
          )}
        </>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          Posições
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Locais de gravação no produto</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={settings.positions}
          onChange={(e) => onUpdateSetting(technique.id, 'positions', parseInt(e.target.value) || 1)}
          className="h-10"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {showSize && sizeOptions.length === 0 && (
        <div className="col-span-full">
          <p className="text-xs text-muted-foreground">
            Área: <span className="font-mono font-medium">{settings.width * settings.height} cm²</span>
          </p>
        </div>
      )}
    </div>
  );
}
