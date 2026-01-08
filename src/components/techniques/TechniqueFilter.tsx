import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Palette, 
  Clock, 
  Ruler, 
  Check, 
  Filter, 
  X,
  ChevronDown,
  Sparkles,
  Zap,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useCustomizationPricing, PriceCalculation } from "@/hooks/useCustomizationPricing";

// Técnicas comuns e seus ícones/cores
const TECHNIQUE_ICONS: Record<string, { icon: React.ElementType; color: string; gradient: string }> = {
  'hot_stamping': { icon: Sparkles, color: 'text-amber-500', gradient: 'from-amber-500 to-yellow-500' },
  'uv_digital': { icon: Zap, color: 'text-purple-500', gradient: 'from-purple-500 to-pink-500' },
  'laser': { icon: Zap, color: 'text-red-500', gradient: 'from-red-500 to-orange-500' },
  'bordado': { icon: Layers, color: 'text-blue-500', gradient: 'from-blue-500 to-cyan-500' },
  'serigrafia': { icon: Palette, color: 'text-green-500', gradient: 'from-green-500 to-emerald-500' },
  'tampografia': { icon: Palette, color: 'text-indigo-500', gradient: 'from-indigo-500 to-blue-500' },
  'sublimacao': { icon: Palette, color: 'text-pink-500', gradient: 'from-pink-500 to-rose-500' },
  'default': { icon: Palette, color: 'text-primary', gradient: 'from-primary to-primary-glow' },
};

function getTechniqueStyle(techniqueCode: string) {
  const lowerCode = techniqueCode.toLowerCase();
  for (const [key, value] of Object.entries(TECHNIQUE_ICONS)) {
    if (lowerCode.includes(key)) {
      return value;
    }
  }
  return TECHNIQUE_ICONS.default;
}

interface TechniqueFilterProps {
  selectedTechniques?: string[];
  onSelectionChange?: (techniques: string[]) => void;
  quantity?: number;
  showPrices?: boolean;
  className?: string;
  compact?: boolean;
}

export function TechniqueFilter({
  selectedTechniques = [],
  onSelectionChange,
  quantity = 100,
  showPrices = true,
  className,
  compact = false,
}: TechniqueFilterProps) {
  const { techniques, calculateAllPrices, isLoading } = useCustomizationPricing();
  const [isExpanded, setIsExpanded] = useState(!compact);

  const calculations = useMemo(() => {
    return calculateAllPrices(quantity);
  }, [calculateAllPrices, quantity]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const toggleTechnique = (code: string) => {
    if (!onSelectionChange) return;
    
    if (selectedTechniques.includes(code)) {
      onSelectionChange(selectedTechniques.filter(t => t !== code));
    } else {
      onSelectionChange([...selectedTechniques, code]);
    }
  };

  const clearSelection = () => {
    onSelectionChange?.([]);
  };

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-3">
          <div className="h-5 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className={className}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Técnicas de Gravação
                  {selectedTechniques.length > 0 && (
                    <Badge variant="secondary">{selectedTechniques.length}</Badge>
                  )}
                </CardTitle>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {calculations.map((calc) => {
                    const style = getTechniqueStyle(calc.techniqueCode);
                    const Icon = style.icon;
                    const isSelected = selectedTechniques.includes(calc.techniqueCode);

                    return (
                      <motion.div
                        key={calc.techniqueCode}
                        whileHover={{ x: 2 }}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                          isSelected ? "bg-primary/10" : "hover:bg-muted"
                        )}
                        onClick={() => toggleTechnique(calc.techniqueCode)}
                      >
                        <Checkbox checked={isSelected} />
                        <Icon className={cn("h-4 w-4", style.color)} />
                        <span className="flex-1 text-sm truncate">{calc.technique}</span>
                        {showPrices && (
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(calc.unitPrice)}/un
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
              {selectedTechniques.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection} className="w-full mt-2">
                  <X className="h-4 w-4 mr-2" />
                  Limpar seleção
                </Button>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            Filtrar por Técnica de Gravação
          </CardTitle>
          {selectedTechniques.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />
              Limpar ({selectedTechniques.length})
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Preços para {quantity.toLocaleString('pt-BR')} unidades
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {calculations.map((calc, index) => {
              const style = getTechniqueStyle(calc.techniqueCode);
              const Icon = style.icon;
              const isSelected = selectedTechniques.includes(calc.techniqueCode);

              return (
                <motion.div
                  key={calc.techniqueCode}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => toggleTechnique(calc.techniqueCode)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                    >
                      <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    </motion.div>
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn("p-2 rounded-lg bg-gradient-to-br", style.gradient, "bg-opacity-10")}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{calc.technique}</h4>
                      <p className="text-xs text-muted-foreground truncate">{calc.techniqueCode}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Palette className="h-3 w-3" />
                      <span>{calc.maxColors} cores</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Ruler className="h-3 w-3" />
                      <span>{calc.maxArea.width}x{calc.maxArea.height}</span>
                    </div>
                    {calc.slaDays && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{calc.slaDays}d</span>
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  {showPrices && (
                    <div className="flex items-end justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">Preço</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(calc.unitPrice)}
                        </span>
                        <span className="text-xs text-muted-foreground">/un</span>
                      </div>
                    </div>
                  )}

                  {/* Savings Badge */}
                  {calc.savings && calc.savings.percentageOff > 0 && (
                    <Badge 
                      className="absolute top-2 left-2 bg-success/20 text-success text-xs"
                    >
                      -{calc.savings.percentageOff}%
                    </Badge>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {calculations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma técnica disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Badge simples para exibir técnica selecionada
interface TechniqueBadgeProps {
  techniqueCode: string;
  techniqueName?: string;
  onRemove?: () => void;
  className?: string;
}

export function TechniqueBadge({ techniqueCode, techniqueName, onRemove, className }: TechniqueBadgeProps) {
  const style = getTechniqueStyle(techniqueCode);
  const Icon = style.icon;

  return (
    <Badge variant="secondary" className={cn("gap-1.5 pr-1", className)}>
      <Icon className={cn("h-3 w-3", style.color)} />
      <span>{techniqueName || techniqueCode}</span>
      {onRemove && (
        <button onClick={onRemove} className="ml-1 p-0.5 hover:bg-muted-foreground/20 rounded">
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
