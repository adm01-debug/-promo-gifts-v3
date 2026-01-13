/**
 * StepTechnique - Passo 3: Seleção da Técnica de Gravação
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Palette, 
  Clock, 
  DollarSign,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Sparkles,
  Zap,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepTechniqueProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepTechnique({ wizard }: StepTechniqueProps) {
  const { availableTechniques, selectedTechnique, techniquesLoading, selectedLocation } = wizard;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Determinar melhor opção (menor custo)
  const bestOption = availableTechniques.length > 0
    ? availableTechniques.reduce((best, curr) => 
        curr.unitCost < best.unitCost ? curr : best
      )
    : null;

  // Determinar mais rápido
  const fastestOption = availableTechniques.length > 0
    ? availableTechniques.reduce((fastest, curr) => 
        curr.estimatedDays < fastest.estimatedDays ? curr : fastest
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{wizard.selectedProduct?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedLocation?.componentName} • {selectedLocation?.locationName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {selectedLocation?.maxWidthCm}×{selectedLocation?.maxHeightCm}cm
              </Badge>
              <Badge variant="secondary">{wizard.quantity} un.</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Techniques List */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Selecionar Técnica de Gravação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {techniquesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : availableTechniques.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Palette className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">Nenhuma técnica disponível</p>
              <p className="text-sm mt-1">
                Este local não possui técnicas de gravação configuradas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {availableTechniques.map((technique, idx) => {
                  const isSelected = selectedTechnique?.id === technique.id;
                  const isBest = technique.id === bestOption?.id;
                  const isFastest = technique.id === fastestOption?.id && !isBest;
                  
                  return (
                    <motion.button
                      key={technique.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => wizard.selectTechnique(technique)}
                      className={cn(
                        'w-full p-4 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 bg-card'
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{technique.name}</h4>
                            <Badge variant="outline" className="text-xs font-mono">
                              {technique.code}
                            </Badge>
                            {isBest && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
                                <Sparkles className="h-3 w-3" />
                                Melhor Preço
                              </Badge>
                            )}
                            {isFastest && (
                              <Badge variant="secondary" className="gap-1">
                                <Zap className="h-3 w-3" />
                                Mais Rápido
                              </Badge>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>

                          {technique.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {technique.description}
                            </p>
                          )}

                          {/* Stats */}
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span className="font-medium text-foreground">
                                {formatCurrency(technique.unitCost)}/un
                              </span>
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="font-medium text-foreground">
                                {technique.estimatedDays}d
                              </span>
                            </span>
                            {technique.minQuantity > 1 && (
                              <Badge variant="outline" className="text-xs">
                                Mín: {technique.minQuantity} un.
                              </Badge>
                            )}
                          </div>

                          {/* Requirements */}
                          <div className="flex gap-2 mt-2">
                            {technique.requiresColorSelection && (
                              <Badge variant="secondary" className="text-[10px]">
                                Cores configuráveis
                              </Badge>
                            )}
                            {technique.requiresSizeSelection && (
                              <Badge variant="secondary" className="text-[10px]">
                                Tamanho configurável
                              </Badge>
                            )}
                            {technique.maxColors && (
                              <Badge variant="outline" className="text-[10px]">
                                Máx {technique.maxColors} cores
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Price preview */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">Estimativa</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(technique.unitCost * wizard.quantity + technique.setupCost)}
                          </p>
                          {technique.setupCost > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              + setup {formatCurrency(technique.setupCost)}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={wizard.previousStep}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          disabled={!wizard.canProceed}
          onClick={wizard.nextStep}
        >
          Próximo: Configurar Opções
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
