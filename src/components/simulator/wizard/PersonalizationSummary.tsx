/**
 * PersonalizationSummary - Resumo lateral das personalizações v2
 * 
 * Exibe produto, personalizações confirmadas e totais consolidados
 */

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, 
  Palette, 
  MapPin, 
  X, 
  Plus,
  Sparkles,
  Edit2,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import { RemovePersonalizationDialog } from './RemovePersonalizationDialog';

interface PersonalizationSummaryProps {
  wizard: UseSimulatorWizardReturn;
  onAddNew?: () => void;
  onGenerateQuote?: () => void;
  showAddButton?: boolean;
}

export function PersonalizationSummary({ 
  wizard, 
  onAddNew,
  onGenerateQuote,
  showAddButton = true,
}: PersonalizationSummaryProps) {
  const { 
    selectedProduct, 
    quantity, 
    personalizations, 
    effectivePrice,
    currentPersonalizationIndex,
    isEditingPersonalization,
    totals,
  } = wizard;

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  }, []);

  if (!selectedProduct) return null;

  return (
    <div className="flex flex-col h-full p-4 overflow-hidden">
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
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Produto
              </span>
              <p className="text-sm font-medium leading-tight mb-1 break-words mt-1">
                {selectedProduct.name}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{quantity} un. × {formatCurrency(effectivePrice)}</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(totals.productTotal)}
                </span>
              </div>
            </div>

            {/* Personalizações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Gravações ({personalizations.length})
                </span>
                {personalizations.length > 0 && (
                  <span className="font-semibold text-sm text-primary">
                    {formatCurrency(totals.customizationTotal)}
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
                                {pers.specs.colors} {pers.specs.colors === 1 ? 'cor' : 'cores'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {pers.specs.width}×{pers.specs.height}cm
                              </Badge>
                            </div>
                            {pers.pricing.budgetCode && (
                              <Badge variant="secondary" className="text-[10px] font-mono mt-1 px-1.5 py-0 h-4">
                                {pers.pricing.budgetCode}
                              </Badge>
                            )}
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end">
                            <p className="font-semibold text-sm">
                              {formatCurrency(pers.pricing.totalPrice)}
                            </p>
                            <div className="flex gap-0.5 mt-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => wizard.editPersonalization(idx)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <RemovePersonalizationDialog
                                techniqueName={pers.technique.name}
                                locationName={pers.location.locationName}
                                onConfirm={() => wizard.removePersonalization(pers.id)}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Botão adicionar */}
            {showAddButton && personalizations.length > 0 && wizard.hasAvailableLocations && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={onAddNew}
              >
                <Plus className="h-4 w-4" />
                Outro Local
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Footer fixo */}
      <div className="shrink-0 pt-3 mt-3 border-t border-border/50">
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

        {/* Botão Gerar Orçamento */}
        {onGenerateQuote && personalizations.length > 0 && (
          <Button
            size="default"
            className="w-full mt-3 gap-2"
            onClick={onGenerateQuote}
          >
            <FileText className="h-4 w-4" />
            Gerar Orçamento
          </Button>
        )}

        <p className="text-[10px] text-muted-foreground/70 text-center mt-2 leading-tight">
          * Valor sujeito a alterações após avaliação do layout
        </p>
      </div>
    </div>
  );
}
