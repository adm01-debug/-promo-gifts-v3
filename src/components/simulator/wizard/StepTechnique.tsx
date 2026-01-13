/**
 * StepTechnique - Passo 3: Seleção da Técnica de Gravação
 * 
 * Design: Cards premium com Smart Suggestions e Comparador lado-a-lado
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
  TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import { SmartSuggestion } from './SmartSuggestion';
import { TechniqueComparator } from './TechniqueComparator';

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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Context Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{wizard.selectedProduct?.name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {selectedLocation?.componentName} • {selectedLocation?.locationName}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {wizard.quantity} un.
        </Badge>
      </motion.div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
          <Palette className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Escolha a Técnica</h3>
          <p className="text-muted-foreground">Selecione o método de gravação</p>
        </div>
      </div>

      {/* Techniques List */}
      {techniquesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : availableTechniques.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="p-5 rounded-full bg-muted mb-5">
            <Palette className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <p className="font-bold text-xl mb-2">Nenhuma técnica disponível</p>
          <p className="text-muted-foreground">Este local não possui técnicas configuradas.</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Smart Suggestion - IA Recommendation */}
          <SmartSuggestion
            techniques={availableTechniques}
            quantity={wizard.quantity}
            onSelect={wizard.selectTechnique}
          />

          {/* Technique Comparator */}
          <TechniqueComparator
            techniques={availableTechniques}
            quantity={wizard.quantity}
            onSelect={wizard.selectTechnique}
          />

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">Todas as técnicas</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <AnimatePresence mode="popLayout">
            {availableTechniques.map((technique, idx) => {
              const isSelected = selectedTechnique?.id === technique.id;
              const isBest = technique.id === bestOption?.id;
              const isFastest = technique.id === fastestOption?.id && technique.id !== bestOption?.id;
              const estimatedTotal = technique.unitCost * wizard.quantity + technique.setupCost;
              
              return (
                <motion.button
                  key={technique.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => wizard.selectTechnique(technique)}
                  className={cn(
                    'w-full p-6 rounded-2xl text-left transition-all duration-300 group',
                    isSelected
                      ? 'bg-primary/5 ring-2 ring-primary shadow-xl shadow-primary/10'
                      : 'bg-card border hover:border-primary/30 hover:shadow-lg'
                  )}
                >
                  <div className="flex items-start justify-between gap-8">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h4 className="font-bold text-xl">{technique.name}</h4>
                        <Badge variant="outline" className="text-xs font-mono">
                          {technique.code}
                        </Badge>
                        {isBest && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1.5 shadow-lg shadow-amber-500/25">
                            <TrendingDown className="h-3.5 w-3.5" />
                            Melhor Preço
                          </Badge>
                        )}
                        {isFastest && (
                          <Badge variant="secondary" className="gap-1.5">
                            <Zap className="h-3.5 w-3.5" />
                            Mais Rápido
                          </Badge>
                        )}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto"
                          >
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          </motion.div>
                        )}
                      </div>

                      {technique.description && (
                        <p className="text-muted-foreground mt-2 line-clamp-2 max-w-2xl">
                          {technique.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <DollarSign className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-bold text-lg">{formatCurrency(technique.unitCost)}</span>
                            <span className="text-muted-foreground text-sm">/un</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-muted">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <span className="font-bold">{technique.estimatedDays}</span>
                            <span className="text-muted-foreground text-sm"> dias</span>
                          </div>
                        </div>
                        {technique.minQuantity > 1 && (
                          <Badge variant="outline" className="text-xs">
                            Mín: {technique.minQuantity} un.
                          </Badge>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mt-4">
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
                    <div className="text-right shrink-0 p-4 rounded-2xl bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Estimativa</p>
                      <p className="text-3xl font-bold text-primary">
                        {formatCurrency(estimatedTotal)}
                      </p>
                      {technique.setupCost > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
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

      {/* Navigation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-between pt-6"
      >
        <Button variant="ghost" size="lg" onClick={wizard.previousStep} className="gap-2">
          <ChevronLeft className="h-5 w-5" />
          Voltar
        </Button>
        <Button
          disabled={!wizard.canProceed}
          onClick={wizard.nextStep}
          size="lg"
          className="gap-2 min-w-[180px] rounded-xl shadow-lg shadow-primary/20"
        >
          Configurar
          <ChevronRight className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}
