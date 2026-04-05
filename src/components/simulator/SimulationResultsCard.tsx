// src/components/simulator/SimulationResultsCard.tsx
// Resultados da simulação com destaque visual e micro-interações

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DollarSign, 
  Clock, 
  Trophy, 
  Zap, 
  Copy, 
  Check, 
  Save,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import { MarginCalculatorCard } from "./MarginCalculatorCard";
import { ExportActions } from "./ExportActions";
import { ResultsComparisonCards } from "./ResultsComparisonCards";
import { DecisionMatrixChart } from "./DecisionMatrixChart";
import { MultiTechniqueSelector } from "./MultiTechniqueSelector";
import { MultiProductComparison } from "./MultiProductComparison";
import { MockupPreview } from "./MockupPreview";
import type { SimulationOption, Product } from "@/types/simulation";

type ViewMode = 'cards' | 'table' | 'matrix';

interface SimulationResultsCardProps {
  simulationOptions: SimulationOption[];
  selectedProduct: Product | undefined;
  quantity: number;
  effectiveProductPrice: number;
  bestOption: SimulationOption | null;
  fastestOption: SimulationOption | null;
  copiedId: string | null;
  onCopy: (option: SimulationOption) => void;
  onCopyAll: () => void;
  onSave: () => void;
  isCalculating?: boolean;
  preferredView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  // Novos props para integrações
  products?: Product[];
  onAddToQuote?: (options: SimulationOption[]) => void;
  onCalculateForProduct?: (product: Product) => SimulationOption[];
  clientLogoUrl?: string | null;
  clientRamo?: string | null;
  clientNicho?: string | null;
}

export function SimulationResultsCard({
  simulationOptions,
  selectedProduct,
  quantity,
  effectiveProductPrice,
  bestOption,
  fastestOption,
  copiedId,
  onCopy,
  onCopyAll,
  onSave,
  isCalculating = false,
  preferredView = 'cards',
  onViewChange,
  products,
  onAddToQuote,
  onCalculateForProduct,
  clientLogoUrl,
  clientRamo,
  clientNicho,
}: SimulationResultsCardProps) {
  const [showMarginCalculator, setShowMarginCalculator] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(preferredView);

  // Sync with external preference
  const handleViewChange = (view: ViewMode) => {
    setViewMode(view);
    onViewChange?.(view);
  };

  if (simulationOptions.length === 0) return null;

  const sortedOptions = [...simulationOptions].sort((a, b) => a.grandTotal - b.grandTotal);

  // Calculate savings between worst and best
  const savings = sortedOptions.length > 1 
    ? sortedOptions[sortedOptions.length - 1].grandTotal - sortedOptions[0].grandTotal
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-success/30 bg-gradient-to-br from-success/5 to-transparent">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Resultado da Simulação
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {simulationOptions.length} opções
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  {quantity} unidades de {selectedProduct?.name}
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {/* View Toggle */}
              <div className="flex rounded-lg border p-1 gap-1">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('cards')}
                  className="h-7 px-2 text-xs"
                >
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'matrix' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('matrix')}
                  className="h-7 px-2 text-xs"
                >
                  Matriz
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('table')}
                  className="h-7 px-2 text-xs"
                >
                  Tabela
                </Button>
              </div>
              
              {/* Melhoria #2: Seleção múltipla para orçamento */}
              {onAddToQuote && (
                <MultiTechniqueSelector
                  options={simulationOptions}
                  onAddToQuote={onAddToQuote}
                />
              )}
              
              {/* Melhoria #8: Comparação multi-produto */}
              {products && onCalculateForProduct && (
                <MultiProductComparison
                  currentProduct={selectedProduct}
                  currentOptions={simulationOptions}
                  products={products}
                  quantity={quantity}
                  onCalculateForProduct={onCalculateForProduct}
                />
              )}
              
              <ExportActions
                simulationOptions={simulationOptions}
                selectedProduct={selectedProduct}
                quantity={quantity}
                effectiveProductPrice={effectiveProductPrice}
                bestOption={bestOption}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onSave} 
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>
              <Button variant="outline" size="sm" onClick={onCopyAll} className="gap-2">
                <Copy className="h-4 w-4" />
                Copiar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <motion.div 
              className="p-4 rounded-xl bg-success/10 border border-success/20"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-2 text-success mb-1">
                <Trophy className="h-4 w-4" />
                <span className="text-xs font-medium">Menor Custo</span>
              </div>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(bestOption?.grandTotal || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {bestOption?.techniqueName}
              </p>
            </motion.div>

            <motion.div 
              className="p-4 rounded-xl bg-primary/10 border border-primary/20"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-2 text-primary mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-medium">Mais Rápido</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {fastestOption?.estimatedDays}d
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {fastestOption?.techniqueName}
              </p>
            </motion.div>

            {savings > 0 && (
              <motion.div 
                className="p-4 rounded-xl bg-warning/10 border border-warning/20"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-2 text-warning mb-1">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs font-medium">Economia Potencial</span>
                </div>
                <p className="text-2xl font-bold text-warning">
                  {formatCurrency(savings)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  vs opção mais cara
                </p>
              </motion.div>
            )}

            <motion.div 
              className="p-4 rounded-xl bg-muted/50 border border-border"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">Custo/Un Médio</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  sortedOptions.reduce((acc, opt) => acc + opt.grandTotalPerUnit, 0) / sortedOptions.length
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                entre {sortedOptions.length} opções
              </p>
            </motion.div>
          </div>

          {/* Conditional View Rendering */}
          {viewMode === 'cards' && (
            <ResultsComparisonCards
              options={sortedOptions}
              bestOption={bestOption}
              fastestOption={fastestOption}
              quantity={quantity}
              selectedProduct={selectedProduct}
              clientRamo={clientRamo}
              clientNicho={clientNicho}
              clientLogoUrl={clientLogoUrl}
            />
          )}

          {viewMode === 'matrix' && (
            <DecisionMatrixChart
              options={sortedOptions}
              bestOption={bestOption}
              fastestOption={fastestOption}
            />
          )}

          {viewMode === 'table' && (
            <>
              {/* Results Table */}
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Técnica</TableHead>
                      <TableHead className="text-center font-semibold">Config</TableHead>
                      <TableHead className="text-right font-semibold">Produto</TableHead>
                      <TableHead className="text-right font-semibold">Pers./Un</TableHead>
                      <TableHead className="text-right font-semibold">Setup</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                      <TableHead className="text-right font-semibold">Final/Un</TableHead>
                      <TableHead className="text-center font-semibold">Prazo</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {sortedOptions.map((option, idx) => {
                        const isBest = option.id === bestOption?.id;
                        const isFastest = option.id === fastestOption?.id;

                        return (
                          <motion.tr
                            key={option.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: idx * 0.05 }}
                            className={cn(
                              "group",
                              isBest && "bg-success/5 hover:bg-success/10",
                              !isBest && "hover:bg-muted/50"
                            )}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="space-y-0.5">
                                  {isBest && (
                                    <Badge className="bg-success text-success-foreground text-[10px] gap-1">
                                      <Trophy className="h-3 w-3" />
                                      Menor custo
                                    </Badge>
                                  )}
                                  {isFastest && !isBest && (
                                    <Badge className="bg-primary text-primary-foreground text-[10px] gap-1">
                                      <Zap className="h-3 w-3" />
                                      Mais rápido
                                    </Badge>
                                  )}
                                  <p className="font-medium">{option.techniqueName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{option.techniqueCode}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {option.colors > 0 && <p>{option.colors} cor(es)</p>}
                                <p>{option.width}×{option.height}cm</p>
                                <p>{option.positions} pos.</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(option.productUnitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(option.costPerUnit)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                              {formatCurrency(option.setupCost)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "font-bold text-lg",
                                isBest && "text-success"
                              )}>
                                {formatCurrency(option.grandTotal)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                "font-semibold",
                                isBest ? "text-success" : "text-primary"
                              )}>
                                {formatCurrency(option.grandTotalPerUnit)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm",
                                option.estimatedDays <= 3 && "bg-primary/10 text-primary",
                                option.estimatedDays > 3 && option.estimatedDays <= 7 && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                option.estimatedDays > 7 && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              )}>
                                <Clock className="h-3.5 w-3.5" />
                                {option.estimatedDays}d
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onCopy(option)}
                              >
                                {copiedId === option.id ? (
                                  <Check className="h-4 w-4 text-success" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Bottom summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border flex-wrap gap-4">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div>
                <span className="text-muted-foreground">Qtd:</span>
                <span className="font-semibold ml-1">{quantity} un</span>
              </div>
              <div>
                <span className="text-muted-foreground">Preço/Un:</span>
                <span className="font-semibold ml-1">{formatCurrency(effectiveProductPrice)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Produtos:</span>
                <span className="font-semibold ml-1">{formatCurrency(effectiveProductPrice * quantity)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Melhor opção total</p>
              <motion.p 
                className="text-2xl font-bold text-success"
                key={bestOption?.grandTotal}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {formatCurrency(bestOption?.grandTotal || 0)}
              </motion.p>
            </div>
          </div>

          {/* Margin Calculator Toggle */}
          <Button
            variant="ghost"
            className="w-full justify-between h-12 text-left"
            onClick={() => setShowMarginCalculator(!showMarginCalculator)}
          >
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-medium">Calculadora de Margem</span>
              <Badge variant="outline" className="text-xs">Pro</Badge>
            </span>
            {showMarginCalculator ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Margin Calculator */}
      <AnimatePresence>
        {showMarginCalculator && (
          <MarginCalculatorCard 
            bestOption={bestOption} 
            quantity={quantity} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
