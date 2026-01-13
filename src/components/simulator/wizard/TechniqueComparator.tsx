/**
 * TechniqueComparator - Comparador lado-a-lado de técnicas
 * 
 * Permite selecionar 2-3 técnicas e comparar visualmente
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Scale, 
  X, 
  DollarSign, 
  Clock, 
  Palette,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { SelectedTechnique } from '@/types/domain/simulator-wizard';

interface TechniqueComparatorProps {
  techniques: SelectedTechnique[];
  quantity: number;
  onSelect: (technique: SelectedTechnique) => void;
}

export function TechniqueComparator({ techniques, quantity, onSelect }: TechniqueComparatorProps) {
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), id]; // Replace oldest
      }
      return [...prev, id];
    });
  };

  const selectedTechniques = techniques.filter(t => selectedForCompare.includes(t.id));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Find best values for highlighting
  const getBestValues = () => {
    if (selectedTechniques.length < 2) return null;
    
    const totals = selectedTechniques.map(t => t.unitCost * quantity + t.setupCost);
    const bestPrice = Math.min(...totals);
    const fastestDays = Math.min(...selectedTechniques.map(t => t.estimatedDays));
    
    return {
      bestPriceId: selectedTechniques.find(t => (t.unitCost * quantity + t.setupCost) === bestPrice)?.id,
      fastestId: selectedTechniques.find(t => t.estimatedDays === fastestDays)?.id,
    };
  };

  const bestValues = getBestValues();

  return (
    <div className="space-y-4">
      {/* Toggle Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Comparar técnicas</span>
          {selectedForCompare.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedForCompare.length} selecionada{selectedForCompare.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {selectedForCompare.length >= 2 && (
          <Button
            size="sm"
            variant={showComparison ? "secondary" : "default"}
            className="gap-1.5"
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? (
              <>
                <X className="h-3.5 w-3.5" />
                Fechar
              </>
            ) : (
              <>
                <Scale className="h-3.5 w-3.5" />
                Comparar
              </>
            )}
          </Button>
        )}
      </div>

      {/* Selection Checkboxes */}
      <div className="flex flex-wrap gap-2">
        {techniques.map(tech => (
          <button
            key={tech.id}
            onClick={() => toggleSelection(tech.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all',
              selectedForCompare.includes(tech.id)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all',
              selectedForCompare.includes(tech.id)
                ? 'border-primary-foreground bg-primary-foreground'
                : 'border-muted-foreground'
            )}>
              {selectedForCompare.includes(tech.id) && (
                <CheckCircle2 className="h-3 w-3 text-primary" />
              )}
            </div>
            {tech.name}
          </button>
        ))}
      </div>

      {/* Comparison View */}
      <AnimatePresence>
        {showComparison && selectedTechniques.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
              <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Comparativo
              </h4>

              {/* Comparison Grid */}
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedTechniques.length}, 1fr)` }}>
                {selectedTechniques.map(tech => {
                  const total = tech.unitCost * quantity + tech.setupCost;
                  const isBestPrice = tech.id === bestValues?.bestPriceId;
                  const isFastest = tech.id === bestValues?.fastestId;

                  return (
                    <motion.div
                      key={tech.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'p-5 rounded-2xl border-2 transition-all',
                        (isBestPrice || isFastest)
                          ? 'bg-card border-primary/30 shadow-lg'
                          : 'bg-card/50 border-muted'
                      )}
                    >
                      {/* Header */}
                      <div className="mb-4">
                        <h5 className="font-bold text-lg">{tech.name}</h5>
                        <Badge variant="outline" className="text-xs mt-1">{tech.code}</Badge>
                      </div>

                      {/* Stats */}
                      <div className="space-y-4">
                        {/* Price */}
                        <div className={cn(
                          'p-3 rounded-xl',
                          isBestPrice ? 'bg-success/10' : 'bg-muted/50'
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            <DollarSign className={cn(
                              'h-4 w-4',
                              isBestPrice ? 'text-success' : 'text-muted-foreground'
                            )} />
                            <span className="text-xs text-muted-foreground">Total</span>
                            {isBestPrice && (
                              <Badge className="ml-auto bg-success text-white text-xs">Melhor</Badge>
                            )}
                          </div>
                          <p className={cn(
                            'text-2xl font-bold',
                            isBestPrice && 'text-success'
                          )}>
                            {formatCurrency(total)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(tech.unitCost)}/un
                          </p>
                        </div>

                        {/* Speed */}
                        <div className={cn(
                          'p-3 rounded-xl',
                          isFastest ? 'bg-blue-500/10' : 'bg-muted/50'
                        )}>
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className={cn(
                              'h-4 w-4',
                              isFastest ? 'text-blue-500' : 'text-muted-foreground'
                            )} />
                            <span className="text-xs text-muted-foreground">Prazo</span>
                            {isFastest && (
                              <Badge className="ml-auto bg-blue-500 text-white text-xs">Mais rápido</Badge>
                            )}
                          </div>
                          <p className={cn(
                            'text-2xl font-bold',
                            isFastest && 'text-blue-500'
                          )}>
                            {tech.estimatedDays} dias
                          </p>
                        </div>

                        {/* Features */}
                        <div className="p-3 rounded-xl bg-muted/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Recursos</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {tech.maxColors && (
                              <Badge variant="outline" className="text-xs">
                                Máx {tech.maxColors} cores
                              </Badge>
                            )}
                            {tech.setupCost > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Setup {formatCurrency(tech.setupCost)}
                              </Badge>
                            )}
                            {tech.minQuantity > 1 && (
                              <Badge variant="outline" className="text-xs">
                                Mín {tech.minQuantity} un
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Select Button */}
                        <Button
                          className="w-full gap-2"
                          onClick={() => onSelect(tech)}
                        >
                          Escolher esta
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
