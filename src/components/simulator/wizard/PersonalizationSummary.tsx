/**
 * PersonalizationSummary - Resumo lateral das personalizações
 * 
 * Exibe um resumo em tempo real de todas as gravações adicionadas
 * Similar ao modelo da Spot
 */

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  Palette, 
  MapPin, 
  X, 
  Plus,
  ShoppingCart,
  Sparkles,
  Edit2,
  Settings,
  Ruler,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface PersonalizationSummaryProps {
  wizard: UseSimulatorWizardReturn;
  onAddNew?: () => void;
  onFinalize?: () => void;
  showAddButton?: boolean;
  compact?: boolean;
}

export function PersonalizationSummary({ 
  wizard, 
  onAddNew,
  onFinalize,
  showAddButton = true,
  compact = false,
}: PersonalizationSummaryProps) {
  const { 
    selectedProduct, 
    quantity, 
    personalizations, 
    effectivePrice,
    currentPersonalizationIndex,
    isEditingPersonalization,
    selectedLocation,
    selectedTechnique,
    engravingOptions,
    currentStep,
  } = wizard;

  // Verifica se está no passo de configuração (opções)
  const isConfiguringOptions = currentStep === 'options' && selectedLocation && selectedTechnique;

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  }, []);

  // Calcular totais
  const totals = useMemo(() => {
    const productTotal = (effectivePrice || 0) * quantity;
    const personalizationTotal = personalizations.reduce((sum, p) => sum + p.totalCost, 0);
    const grandTotal = productTotal + personalizationTotal;
    const grandTotalPerUnit = quantity > 0 ? grandTotal / quantity : 0;
    
    return {
      productTotal,
      personalizationTotal,
      grandTotal,
      grandTotalPerUnit,
    };
  }, [effectivePrice, quantity, personalizations]);

  const handleRemovePersonalization = useCallback((id: string) => {
    wizard.removePersonalization(id);
  }, [wizard]);

  const handleEditPersonalization = useCallback((index: number) => {
    wizard.editPersonalization(index);
  }, [wizard]);

  if (!selectedProduct) {
    return null;
  }

  return (
    <div className={`flex flex-col h-full ${compact ? 'p-3' : 'p-4'} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="p-2 rounded-lg bg-primary/10">
          <ShoppingCart className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-base">Resumo</h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-3 pr-2">
            {/* Produto */}
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Produto
                </span>
              </div>
              <p className="text-sm font-medium leading-tight mb-1 break-words">
                {selectedProduct.name}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{quantity} un. × {formatCurrency(effectivePrice)}</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(totals.productTotal)}
                </span>
              </div>
            </div>

            {/* Configuração em andamento */}
            {isConfiguringOptions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-primary/5 border border-primary/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span className="text-[11px] font-semibold text-primary uppercase tracking-wide">
                    Configurando
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Local</span>
                    <span className="font-medium truncate max-w-[100px]">{selectedLocation?.locationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Técnica</span>
                    <span className="font-medium text-primary truncate max-w-[100px]">{selectedTechnique?.name}</span>
                  </div>
                  {selectedTechnique?.requiresColorSelection && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Palette className="h-3 w-3" /> Cores
                      </span>
                      <span className="font-semibold">{engravingOptions.colors}</span>
                    </div>
                  )}
                  {selectedTechnique?.requiresSizeSelection && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Ruler className="h-3 w-3" /> Tamanho
                      </span>
                      <span className="font-semibold">{engravingOptions.width}×{engravingOptions.height}cm</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Personalizações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Personalizações ({personalizations.length})
                </span>
                {personalizations.length > 0 && (
                  <span className="font-semibold text-sm text-primary">
                    {formatCurrency(totals.personalizationTotal)}
                  </span>
                )}
              </div>

              <AnimatePresence mode="popLayout">
                {personalizations.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 rounded-lg border border-dashed border-muted-foreground/30 text-center"
                  >
                    <Sparkles className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      Nenhuma gravação adicionada
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-2">
                    {personalizations.map((pers, idx) => (
                      <motion.div
                        key={pers.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`
                          p-2.5 rounded-lg border transition-all
                          ${isEditingPersonalization && currentPersonalizationIndex === idx 
                            ? 'border-primary bg-primary/5' 
                            : 'bg-card/50 hover:bg-muted/30 border-border/50'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                                {idx + 1}
                              </Badge>
                              <span className="text-xs font-medium text-primary truncate">
                                {pers.technique.name}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">
                              {pers.location.componentName} • {pers.location.locationName}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {pers.options.colors} {pers.options.colors === 1 ? 'cor' : 'cores'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {pers.options.width}×{pers.options.height}cm
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end">
                            <p className="font-semibold text-sm">
                              {formatCurrency(pers.totalCost)}
                            </p>
                            <div className="flex gap-0.5 mt-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleEditPersonalization(idx)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => handleRemovePersonalization(pers.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Botão adicionar nova gravação */}
            {showAddButton && personalizations.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={onAddNew}
              >
                <Plus className="h-4 w-4" />
                Nova Personalização
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer fixo */}
      <div className="shrink-0 pt-3 mt-3 border-t border-border/50">
        {/* Extras */}
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Extras</span>
          <span>R$ 0,00</span>
        </div>
        
        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-base">Total</span>
            <p className="text-[11px] text-muted-foreground">
              ≈{formatCurrency(totals.grandTotalPerUnit)}/Un.
            </p>
          </div>
          <span className="font-bold text-xl text-primary">
            {formatCurrency(totals.grandTotal)}
          </span>
        </div>

        {/* Botão Finalizar */}
        {onFinalize && personalizations.length > 0 && (
          <Button
            size="default"
            className="w-full mt-3 gap-2"
            onClick={onFinalize}
          >
            Calcular Total
          </Button>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground/70 text-center mt-2 leading-tight">
          * Valor sujeito a alterações após avaliação do layout
        </p>
      </div>
    </div>
  );
}
