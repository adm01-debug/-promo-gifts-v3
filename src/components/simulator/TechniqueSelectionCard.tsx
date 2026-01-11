// src/components/simulator/TechniqueSelectionCard.tsx
// Seleção de técnicas com cards visuais

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Palette, Clock, DollarSign, Zap, X, Info, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import { useState } from "react";
import type { Technique, TechniqueSettings } from "@/types/simulation";

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
}

// Ícone e cor baseado no código da técnica
const getTechniqueStyle = (code: string) => {
  const c = code?.toUpperCase() || "";
  if (c.includes("SILK") || c.includes("SERIGRAFIA")) {
    return { color: "bg-violet-500", icon: "🎨" };
  }
  if (c.includes("DTF")) {
    return { color: "bg-cyan-500", icon: "🖨️" };
  }
  if (c.includes("SUB") || c.includes("TRANSFER")) {
    return { color: "bg-pink-500", icon: "🌈" };
  }
  if (c.includes("BORD") || c.includes("EMBROID")) {
    return { color: "bg-amber-500", icon: "🧵" };
  }
  if (c.includes("LASER")) {
    return { color: "bg-red-500", icon: "⚡" };
  }
  return { color: "bg-slate-500", icon: "✨" };
};

export function TechniqueSelectionCard({
  techniques,
  techniquesLoading,
  selectedTechniques,
  techniqueSettings,
  onToggle,
  onUpdateSetting,
  needsColorInput,
  needsSizeInput,
  quantity,
}: TechniqueSelectionCardProps) {
  const [expandedTechnique, setExpandedTechnique] = useState<string | null>(null);

  const getSlaInfo = (days: number) => {
    if (days <= 3) return { label: "Express", color: "bg-emerald-500", textColor: "text-emerald-600" };
    if (days <= 7) return { label: "Padrão", color: "bg-amber-500", textColor: "text-amber-600" };
    return { label: "Estendido", color: "bg-rose-500", textColor: "text-rose-600" };
  };

  // Sort: selected first, then by estimated_days
  const sortedTechniques = techniques?.slice().sort((a, b) => {
    const aSelected = selectedTechniques.includes(a.id);
    const bSelected = selectedTechniques.includes(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.estimated_days - b.estimated_days;
  });

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          Técnicas de Personalização
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          Selecione as técnicas que deseja comparar
          {selectedTechniques.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {selectedTechniques.length} selecionada(s)
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {techniquesLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            <AnimatePresence mode="popLayout">
              {sortedTechniques?.map((technique, idx) => {
                const isSelected = selectedTechniques.includes(technique.id);
                const style = getTechniqueStyle(technique.code || "");
                const sla = getSlaInfo(technique.estimated_days);
                const settings = techniqueSettings[technique.id] || { colors: 1, width: 10, height: 10, positions: 1 };
                const isExpanded = expandedTechnique === technique.id;
                const showColors = needsColorInput(technique.code || "");
                const showSize = needsSizeInput(technique.code || "");

                // Estimate total cost preview
                let estimatedCost = technique.unit_cost * quantity + technique.setup_cost;

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
                              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative",
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
                          <div className="flex flex-col items-end gap-2">
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
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                {showColors && (
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Cores</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={12}
                                      value={settings.colors}
                                      onChange={(e) => onUpdateSetting(technique.id, 'colors', parseInt(e.target.value) || 1)}
                                      className="h-10"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}

                                {showSize && (
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
                              </div>

                              {showSize && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Área: <span className="font-mono font-medium">{settings.width * settings.height} cm²</span>
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
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
}
