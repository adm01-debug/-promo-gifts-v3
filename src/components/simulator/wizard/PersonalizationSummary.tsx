/**
 * PersonalizationSummary - Resumo lateral das personalizações v3
 * 
 * UX otimizado: hierarquia visual clara, sem truncamentos, ações legíveis
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, 
  MapPin, 
  Plus,
  Sparkles,
  Pencil,
  FileText,
  Copy,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import { formatCurrency } from '@/lib/format';
import { RemovePersonalizationDialog } from './RemovePersonalizationDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PersonalizationSummaryProps {
  wizard: UseSimulatorWizardReturn;
  onAddNew?: () => void;
  onGenerateQuote?: () => void;
  showAddButton?: boolean;
}

/** Deduplica "Lado A • Lado A" → "Lado A" */
function formatLocation(componentName: string, locationName: string): string {
  if (componentName === locationName) return componentName;
  return `${componentName} • ${locationName}`;
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
    availableLocations,
  } = wizard;

  const usedLocationIds = new Set(personalizations.map(p => p.location.id));
  const unusedLocations = availableLocations.filter(loc => !usedLocationIds.has(loc.id));

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
              <p className="text-sm font-medium leading-tight mb-1.5 mt-1">
                {selectedProduct.name}
              </p>
              <div className="flex items-baseline justify-between text-xs text-muted-foreground gap-2">
                <span className="shrink-0">{quantity} un. × {formatCurrency(effectivePrice)}</span>
                <span className="font-semibold text-foreground whitespace-nowrap">
                  {formatCurrency(totals.productTotal)}
                </span>
              </div>
            </div>

            {/* Gravações */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Gravações ({personalizations.length})
                </span>
                {personalizations.length > 0 && (
                  <span className="font-semibold text-sm text-primary whitespace-nowrap">
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
                    {personalizations.map((pers, idx) => {
                      const isActive = isEditingPersonalization && currentPersonalizationIndex === idx;
                      return (
                        <motion.div
                          key={pers.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={`
                            p-3 rounded-xl border transition-all
                            ${isActive
                              ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10' 
                              : 'bg-card hover:bg-muted/30 border-border/60'
                            }
                          `}
                        >
                          {/* Row 1: Técnica + Preço */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0 font-bold">
                                {idx + 1}
                              </Badge>
                              <span className="text-xs font-semibold text-primary truncate">
                                {pers.technique.name}
                              </span>
                            </div>
                            <span className="font-bold text-sm whitespace-nowrap">
                              {formatCurrency(pers.pricing.totalPrice)}
                            </span>
                          </div>

                          {/* Row 2: Local */}
                          <p className="text-[11px] text-muted-foreground leading-tight mb-1.5">
                            {formatLocation(pers.location.componentName, pers.location.locationName)}
                          </p>

                          {/* Row 3: Specs */}
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {pers.specs.colors} {pers.specs.colors === 1 ? 'cor' : 'cores'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                              {pers.specs.width}×{pers.specs.height}cm
                            </Badge>
                            {pers.pricing.budgetCode && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4 cursor-help">
                                    {pers.pricing.budgetCode}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  Código de referência para orçamento
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Row 4: Actions — labeled buttons */}
                          <div className="flex items-center gap-1.5 border-t border-border/30 pt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                              onClick={() => wizard.editPersonalization(idx)}
                            >
                              <Pencil className="h-3 w-3" />
                              Editar
                            </Button>

                            {unusedLocations.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Duplicar
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[160px]">
                                  {unusedLocations.map(loc => (
                                    <DropdownMenuItem
                                      key={loc.id}
                                      onClick={() => wizard.duplicatePersonalization(pers.id, loc.id)}
                                    >
                                      <MapPin className="h-3 w-3 mr-2" />
                                      {loc.locationName}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            <div className="ml-auto">
                              <RemovePersonalizationDialog
                                techniqueName={pers.technique.name}
                                locationName={pers.location.locationName}
                                onConfirm={() => wizard.removePersonalization(pers.id)}
                              />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
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
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <span className="font-bold text-base">Total</span>
            <p className="text-[11px] text-muted-foreground">
              ≈{formatCurrency(totals.grandTotalPerUnit)}/un.
            </p>
          </div>
          <span className="font-bold text-xl text-primary whitespace-nowrap">
            {formatCurrency(totals.grandTotal)}
          </span>
        </div>

        {/* CTA */}
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
      </div>
    </div>
  );
}
