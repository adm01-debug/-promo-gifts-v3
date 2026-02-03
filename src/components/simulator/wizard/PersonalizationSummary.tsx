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
  } = wizard;

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
    <div className={`flex flex-col h-full ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <ShoppingCart className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold">Resumo</h3>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4">
        {/* Produto */}
        <div className="p-3 rounded-xl bg-muted/50 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">Produto</span>
            <span className="font-semibold">{formatCurrency(totals.productTotal)}</span>
          </div>
          <p className="text-sm font-medium truncate">{selectedProduct.name}</p>
          <p className="text-xs text-muted-foreground">
            {quantity} un. × {formatCurrency(effectivePrice)}
          </p>
        </div>

        {/* Personalizações */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Personalizações ({personalizations.length})
            </span>
            {personalizations.length > 0 && (
              <span className="font-semibold text-sm">
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
                className="p-4 rounded-xl border border-dashed text-center"
              >
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
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
                      p-3 rounded-xl border transition-all
                      ${isEditingPersonalization && currentPersonalizationIndex === idx 
                        ? 'border-primary bg-primary/5' 
                        : 'bg-card hover:bg-muted/30'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs px-1.5">
                            {idx + 1}
                          </Badge>
                          <span className="text-xs font-medium text-primary truncate">
                            {pers.technique.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {pers.location.componentName} | {pers.location.locationName}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1">
                            {pers.options.colors} {pers.options.colors === 1 ? 'cor' : 'cores'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1">
                            {pers.options.width}×{pers.options.height}cm
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">
                          {formatCurrency(pers.totalCost)}
                        </p>
                        <div className="flex gap-1 mt-1">
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
            className="w-full gap-2 mb-3"
            onClick={onAddNew}
          >
            <Plus className="h-4 w-4" />
            Nova Personalização
          </Button>
        )}
      </ScrollArea>

      <Separator className="my-3" />

      {/* Totais */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Extras</span>
          <span>R$ 0,00</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-lg">Total</span>
            <p className="text-xs text-muted-foreground">
              ≈{formatCurrency(totals.grandTotalPerUnit)}/Un.
            </p>
          </div>
          <span className="font-bold text-2xl text-primary">
            {formatCurrency(totals.grandTotal)}
          </span>
        </div>
      </div>

      {/* Botão Finalizar */}
      {onFinalize && personalizations.length > 0 && (
        <Button
          size="lg"
          className="w-full mt-4 gap-2"
          onClick={onFinalize}
        >
          Calcular Total
        </Button>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        * O valor da personalização está sujeito a alterações após avaliação do layout
      </p>
    </div>
  );
}
