/**
 * StepTechnique - Passo 3: Seleção da Técnica de Gravação
 * 
 * Design: Cards destacados com indicadores de melhor opção
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  MapPin,
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

  // Find best price and fastest
  const bestOption = availableTechniques.length > 0
    ? availableTechniques.reduce((best, curr) => 
        curr.unitCost < best.unitCost ? curr : best
      )
    : null;

  const fastestOption = availableTechniques.length > 0
    ? availableTechniques.reduce((fastest, curr) => 
        curr.estimatedDays < fastest.estimatedDays ? curr : fastest
      )
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Context Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="text-sm">
            <p className="font-medium">{wizard.selectedProduct?.name}</p>
            <p className="text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {selectedLocation?.componentName} • {selectedLocation?.locationName}
            </p>
          </div>
        </div>
        <Badge variant="secondary">{wizard.quantity} un.</Badge>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Qual técnica?</h3>
          <p className="text-sm text-muted-foreground">Escolha como será feita a gravação</p>
        </div>
      </div>

      {/* Techniques List */}
      {techniquesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : availableTechniques.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Palette className="h-12 w-12 mb-4 opacity-30" />
          <p className="font-medium text-lg">Nenhuma técnica disponível</p>
          <p className="text-sm mt-1">Este local não possui técnicas configuradas.</p>
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
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => wizard.selectTechnique(technique)}
                  className={cn(
                    'w-full p-5 rounded-2xl text-left transition-all duration-200',
                    'border-2',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-transparent bg-muted/40 hover:bg-muted/70'
                  )}
                >
                  <div className="flex items-start justify-between gap-6">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-lg">{technique.name}</h4>
                        <Badge variant="outline" className="text-xs font-mono">
                          {technique.code}
                        </Badge>
                        {isBest && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1">
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
                          <CheckCircle2 className="h-5 w-5 text-primary ml-auto shrink-0" />
                        )}
                      </div>

                      {technique.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {technique.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-5 mt-4">
                        <span className="flex items-center gap-1.5 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{formatCurrency(technique.unitCost)}</span>
                          <span className="text-muted-foreground">/un</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{technique.estimatedDays}</span>
                          <span className="text-muted-foreground">dias</span>
                        </span>
                        {technique.minQuantity > 1 && (
                          <Badge variant="outline" className="text-xs">
                            Mín: {technique.minQuantity}
                          </Badge>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex gap-2 mt-3">
                        {technique.requiresColorSelection && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            Cores configuráveis
                          </Badge>
                        )}
                        {technique.requiresSizeSelection && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            Tamanho ajustável
                          </Badge>
                        )}
                        {technique.maxColors && (
                          <Badge variant="outline" className="text-xs font-normal">
                            Máx {technique.maxColors} cores
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price Estimate */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground mb-1">Estimativa</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(technique.unitCost * wizard.quantity + technique.setupCost)}
                      </p>
                      {technique.setupCost > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          inclui setup {formatCurrency(technique.setupCost)}
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

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={wizard.previousStep}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          disabled={!wizard.canProceed}
          onClick={wizard.nextStep}
          className="gap-2"
        >
          Configurar Opções
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
