/**
 * StepComparison - Passo 4: Comparativo de Técnicas
 * 
 * Mostra TODAS as técnicas disponíveis com preços reais do RPC,
 * ordenadas por custo-benefício. O vendedor escolhe a melhor opção.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BarChart3,
  ChevronLeft,
  Trophy,
  Zap,
  Clock,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Check,
  Plus,
  FileText,
  Copy,
  Package,
  MapPin,
  Palette,
  Ruler,
  RefreshCw,
  MessageCircle,
  Repeat,
  Undo2,
  Redo2,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import type { TechniqueComparisonResult } from '@/types/domain/simulator-wizard';
import { QuantityRangeComparison } from './QuantityRangeComparison';
import { WizardMockupPreview } from './WizardMockupPreview';

interface StepComparisonProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepComparison({ wizard }: StepComparisonProps) {
  const navigate = useNavigate();
  const { comparisonResults, selectedComparison, selectedLocation, engravingSpecs } = wizard;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const availableResults = comparisonResults.filter(r => r.isAvailable);
  const unavailableResults = comparisonResults.filter(r => !r.isAvailable);

  const toggleTechnique = useCallback((result: TechniqueComparisonResult) => {
    if (!result.isAvailable) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(result.techniqueId)) {
        next.delete(result.techniqueId);
      } else {
        next.add(result.techniqueId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === availableResults.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableResults.map(r => r.techniqueId)));
    }
  }, [selectedIds.size, availableResults]);

  const handleConfirmSelected = useCallback(() => {
    const selected = availableResults.filter(r => selectedIds.has(r.techniqueId));
    if (selected.length === 0) return;
    selected.forEach(result => wizard.confirmTechnique(result));
    setSelectedIds(new Set());
  }, [availableResults, selectedIds, wizard]);

  const handleAddAnother = () => {
    wizard.startNewPersonalization();
  };

  const handleGenerateQuote = () => {
    // Navegar para criação de orçamento com dados pré-preenchidos
    const quoteData = {
      product: wizard.selectedProduct,
      quantity: wizard.quantity,
      personalizations: wizard.personalizations,
      totals: wizard.totals,
    };
    
    navigate('/orcamentos/novo', { state: { fromSimulator: true, simulationData: quoteData } });
    toast.success('Redirecionando para o orçamento...');
  };

  const handleCopyResult = async () => {
    const persText = wizard.personalizations.map((p, idx) => 
      `${idx + 1}. ${p.technique.name} | ${p.location.locationName} | ${p.specs.colors} ${p.specs.colors === 1 ? 'cor' : 'cores'} | ${p.specs.width}×${p.specs.height}cm | ${formatCurrency(p.pricing.totalPrice)} (${formatCurrency(p.pricing.costPerUnit)}/un) | Cód: ${p.pricing.budgetCode}`
    ).join('\n');

    const text = `
📦 SIMULAÇÃO DE PERSONALIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━
🏷️ ${wizard.selectedProduct?.name} (${wizard.selectedProduct?.sku})
📊 ${wizard.quantity} unidades × ${formatCurrency(wizard.effectivePrice)}

🎨 PERSONALIZAÇÕES:
${persText}

💰 Produto: ${formatCurrency(wizard.totals.productTotal)}
🎨 Gravações: ${formatCurrency(wizard.totals.customizationTotal)}
━━━━━━━━━━━━━━━━━━━━━━
✅ TOTAL: ${formatCurrency(wizard.totals.grandTotal)} (${formatCurrency(wizard.totals.grandTotalPerUnit)}/un)
⏱️ Prazo: ${wizard.totals.maxDays > 0 ? `~${wizard.totals.maxDays} dias úteis` : 'A consultar'}
    `.trim();

    await navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  // Se já confirmou uma técnica (personalização adicionada), mostrar resumo
  const hasPersonalizations = wizard.personalizations.length > 0;
  
  // Quando já adicionou pelo menos uma personalização e não tem comparison results ativos
  if (hasPersonalizations && comparisonResults.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <ConfirmedSummary 
          wizard={wizard}
          onAddAnother={handleAddAnother}
          onGenerateQuote={handleGenerateQuote}
          onCopy={handleCopyResult}
        />
      </div>
    );
  }
  
  // Se voltou para comparison sem ter resultados nem personalizações
  if (comparisonResults.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground text-lg mb-4">Nenhum comparativo disponível</p>
        <Button onClick={() => wizard.setStep('specs')} variant="outline">
          Voltar para Especificações
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">Comparativo de Técnicas</h3>
            <p className="text-muted-foreground">
              {availableResults.length} {availableResults.length === 1 ? 'opção disponível' : 'opções disponíveis'}
              {unavailableResults.length > 0 && ` • ${unavailableResults.length} indisponível`}
              {selectedIds.size > 0 && ` • ${selectedIds.size} selecionada${selectedIds.size > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availableResults.length > 1 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSelectAll}>
              {selectedIds.size === availableResults.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => wizard.setStep('specs')}>
            <RefreshCw className="h-4 w-4" />
            Alterar Specs
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {availableResults.map((result, idx) => {
            const maxPrice = availableResults.length > 1 
              ? Math.max(...availableResults.map(r => r.totalPrice)) 
              : 0;
            return (
            <motion.div
              key={result.techniqueId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <ComparisonCard 
                result={result} 
                onSelect={toggleTechnique}
                quantity={wizard.quantity}
                isFirst={idx === 0}
                maxPrice={maxPrice}
                isSelected={selectedIds.has(result.techniqueId)}
              />
            </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Unavailable */}
        {unavailableResults.length > 0 && (
          <>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Indisponíveis
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {unavailableResults.map((result) => (
              <motion.div
                key={result.techniqueId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                className="p-5 rounded-2xl bg-muted/30 border border-dashed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-muted-foreground">{result.techniqueName}</p>
                    <Badge variant="outline" className="text-xs font-mono mt-1">{result.techniqueCode}</Badge>
                  </div>
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {result.unavailableReason}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* Confirm Selection Bar — #3: accumulated summary + #5: distinct color */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky bottom-4 z-10"
          >
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-2xl shadow-primary/40 border border-primary/30">
              <div>
                <p className="font-bold text-base">
                  {selectedIds.size} técnica{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-primary-foreground/80">
                  Total combinado: {formatCurrency(
                    availableResults
                      .filter(r => selectedIds.has(r.techniqueId))
                      .reduce((sum, r) => sum + r.totalPrice, 0)
                  )}
                </p>
              </div>
              <Button 
                size="lg" 
                className="gap-2 font-bold bg-white text-primary hover:bg-primary/5 shadow-lg"
                onClick={handleConfirmSelected}
              >
                <Check className="h-5 w-5" />
                Confirmar Seleção
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-between pt-6"
      >
        <Button variant="ghost" size="lg" onClick={wizard.previousStep} className="gap-2">
          <ChevronLeft className="h-5 w-5" />
          Alterar Especificações
        </Button>
      </motion.div>
    </div>
  );
}

// ============================================
// ComparisonCard - Card individual de técnica
// ============================================

function ComparisonCard({ 
  result, 
  onSelect, 
  quantity,
  isFirst,
  maxPrice,
  isSelected,
}: { 
  result: TechniqueComparisonResult; 
  onSelect: (r: TechniqueComparisonResult) => void;
  quantity: number;
  isFirst: boolean;
  maxPrice: number;
  isSelected: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const isBestValue = result.isCheapest;
  const savingsPercent = maxPrice > 0 && result.totalPrice < maxPrice 
    ? Math.round(((maxPrice - result.totalPrice) / maxPrice) * 100)
    : 0;

  return (
    <div className="relative">
      {/* #1: Premium highlight for best value */}
      {isBestValue && !isSelected && (
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-warning/40 via-primary/30 to-warning/40 blur-sm pointer-events-none" />
      )}
      <button
        onClick={() => onSelect(result)}
        className={cn(
          'relative w-full p-6 rounded-2xl text-left transition-all duration-300 group',
          'bg-card border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10',
          isSelected && 'ring-2 ring-primary border-primary/50 shadow-lg shadow-primary/10',
          !isSelected && isBestValue && 'ring-2 ring-warning/50 border-warning/30 shadow-lg shadow-warning/10',
          !isSelected && !isBestValue && isFirst && 'ring-1 ring-primary/20'
        )}
      >
        <div className="flex items-start justify-between gap-5">
          {/* #2: Bigger checkbox (32px) with animation */}
          <motion.div 
            className={cn(
              'mt-0.5 w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all',
              isSelected 
                ? 'bg-primary border-primary' 
                : 'border-muted-foreground/30 group-hover:border-primary/50'
            )}
            animate={isSelected ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.25 }}
          >
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <Check className="h-5 w-5 text-primary-foreground" />
              </motion.div>
            )}
          </motion.div>

          {/* Left: Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h4 className="font-bold text-xl">{result.techniqueName}</h4>
              <Badge variant="outline" className="text-xs font-mono">
                {result.techniqueCode}
              </Badge>
              {/* #1: Larger trophy for best value */}
              {isBestValue && (
                <Badge className="bg-gradient-to-r from-warning to-orange text-primary-foreground border-0 gap-1.5 px-3 py-1 shadow-lg shadow-amber-500/25 text-sm">
                  <Trophy className="h-4 w-4" />
                  Melhor Custo-Benefício
                </Badge>
              )}
              {result.isFastest && (
                <Badge variant="secondary" className="gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Mais Rápido
                </Badge>
              )}
              {savingsPercent > 0 && (
                <Badge variant="outline" className="gap-1 text-primary border-primary dark:text-primary dark:border-primary">
                  ↓ {savingsPercent}% vs mais caro
                </Badge>
              )}
            </div>

            {/* #6: Unit price PROMINENT */}
            <div className="flex items-center gap-6 mt-3">
              <div className="flex items-baseline gap-1.5">
                <DollarSign className="h-5 w-5 text-primary self-center" />
                <span className="font-extrabold text-2xl text-primary">{formatCurrency(result.unitPrice)}</span>
                <span className="text-muted-foreground text-sm font-medium">/un</span>
              </div>
              {result.productionDays && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-semibold">{result.productionDays}</span>
                  <span className="text-sm">dias</span>
                </div>
              )}
            </div>

            {/* #4: Collapsible technical badges */}
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showDetails && "rotate-180")} />
                Detalhes técnicos
              </button>
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.budgetCode && (
                        <Badge variant="secondary" className="text-xs font-mono gap-1">
                          📋 {result.budgetCode}
                        </Badge>
                      )}
                      {result.minimumApplied && (
                        <Badge variant="outline" className="text-xs text-warning border-warning/30 dark:text-warning dark:border-warning/40">
                          Faturamento mínimo aplicado
                        </Badge>
                      )}
                      {result.maxColors !== null && (
                        <Badge variant="outline" className="text-xs">
                          Máx {result.maxColors} cores
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        Faixa {result.tierUsed} ({result.tierMinQty}-{result.tierMaxQty || '∞'} un.)
                      </Badge>
                      {result.setupPrice > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Setup: {formatCurrency(result.setupPrice)}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Total Price — #6: secondary to unit price */}
          <div className="text-right shrink-0">
            <div className="p-4 rounded-2xl bg-muted/50 group-hover:bg-primary/5 transition-colors min-w-[140px]">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(result.totalPrice)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(result.costPerUnit)}/un
              </p>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ============================================
// ConfirmedSummary - Resumo pós-confirmação
// ============================================

function ConfirmedSummary({ 
  wizard, 
  onAddAnother, 
  onGenerateQuote,
  onCopy,
}: { 
  wizard: UseSimulatorWizardReturn; 
  onAddAnother: () => void;
  onGenerateQuote: () => void;
  onCopy: () => void;
}) {
  const [showDuplicateQty, setShowDuplicateQty] = useState(false);
  const [duplicateQty, setDuplicateQty] = useState(wizard.quantity);

  const handleShareWhatsApp = () => {
    const persText = wizard.personalizations.map((p, idx) => 
      `${idx + 1}. ${p.technique.name} | ${p.location.locationName} | ${formatCurrency(p.pricing.totalPrice)}`
    ).join('\n');

    const text = `📦 *SIMULAÇÃO DE PERSONALIZAÇÃO*\n\n🏷️ ${wizard.selectedProduct?.name} (${wizard.selectedProduct?.sku})\n📊 ${wizard.quantity}un × ${formatCurrency(wizard.effectivePrice)}\n\n🎨 *Gravações:*\n${persText}\n\n💰 *TOTAL: ${formatCurrency(wizard.totals.grandTotal)}* (${formatCurrency(wizard.totals.grandTotalPerUnit)}/un)\n⏱️ Prazo: ${wizard.totals.maxDays > 0 ? `~${wizard.totals.maxDays} dias úteis` : 'A consultar'}`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDuplicate = () => {
    if (duplicateQty > 0 && duplicateQty !== wizard.quantity) {
      wizard.setQuantity(duplicateQty);
      toast.success(`Quantidade alterada para ${duplicateQty}un. Recalcule os preços.`);
      setShowDuplicateQty(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* #4: Assertive message instead of vague question */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <motion.div 
            className="relative w-10 h-10 shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
          >
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary to-primary/90 flex items-center justify-center shadow-md">
              <Check className="h-5 w-5 text-primary-foreground" />
            </div>
          </motion.div>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">
              {wizard.personalizations.length} {wizard.personalizations.length === 1 ? 'gravação pronta' : 'gravações prontas'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Revise abaixo e gere o orçamento
            </p>
          </div>
        </div>
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" disabled={!wizard.canUndo} onClick={wizard.undo}>
            <Undo2 className="h-3 w-3" /> Desfazer
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7" disabled={!wizard.canRedo} onClick={wizard.redo}>
            <Redo2 className="h-3 w-3" /> Refazer
          </Button>
        </div>
      </motion.div>

      {/* #1: Compact table-like rows instead of sparse cards */}
      <div className="rounded-xl border overflow-hidden divide-y divide-border">
        {wizard.personalizations.map((pers, idx) => (
          <motion.div
            key={pers.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * idx }}
            className="flex items-center gap-4 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
          >
            {/* Index */}
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-sm text-primary shrink-0">
              {idx + 1}
            </div>

            {/* #5: Thumbnail mockup inline */}
            {wizard.selectedProduct && (
              <WizardMockupPreview
                personalization={pers}
                product={wizard.selectedProduct}
              />
            )}

            {/* Info — compact */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{pers.technique.name}</span>
                {pers.pricing.budgetCode && (
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4 shrink-0">
                    {pers.pricing.budgetCode}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {pers.location.componentName === pers.location.locationName 
                    ? pers.location.locationName 
                    : `${pers.location.componentName} • ${pers.location.locationName}`}
                </span>
                <span>{pers.specs.colors} {pers.specs.colors === 1 ? 'cor' : 'cores'}</span>
                <span>{pers.specs.width}×{pers.specs.height}cm</span>
              </div>
            </div>

            {/* Price — compact */}
            <div className="text-right shrink-0">
              <p className="font-bold text-base text-primary">{formatCurrency(pers.pricing.totalPrice)}</p>
              <p className="text-[11px] text-muted-foreground">{formatCurrency(pers.pricing.costPerUnit)}/un</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Totals — with #6 tooltip on "A consultar" */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="bg-gradient-to-br from-primary via-primary to-primary/90 p-5 text-primary-foreground">
          <div className="grid grid-cols-[2fr_1.5fr_1fr] gap-3 items-stretch">
            <div className="p-4 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold tracking-wider text-primary-foreground/70 mb-1.5">Total geral</p>
              <p className="text-4xl font-extrabold tracking-tight text-primary-foreground">{formatCurrency(wizard.totals.grandTotal)}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/15 backdrop-blur-sm border border-white/10">
              <p className="text-xs font-semibold tracking-wider text-primary-foreground/70 mb-0.5">Por unidade</p>
              <p className="text-[11px] text-primary-foreground/50 mb-1.5">(produto + gravação)</p>
              <p className="text-2xl font-bold text-primary-foreground">{formatCurrency(wizard.totals.grandTotalPerUnit)}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/15 backdrop-blur-sm border border-white/10 flex flex-col justify-between">
              <p className="text-xs font-semibold tracking-wider text-primary-foreground/70 mb-1.5">Prazo máx.</p>
              {wizard.totals.maxDays > 0 ? (
                <p className="text-2xl font-bold text-primary-foreground">~{wizard.totals.maxDays}d</p>
              ) : (
                <div className="group relative flex items-center gap-2 cursor-help">
                  <AlertCircle className="h-4 w-4 text-primary-foreground/70 shrink-0" />
                  <p className="text-lg font-bold text-primary-foreground">A consultar</p>
                  {/* #6: Tooltip explaining "A consultar" */}
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 rounded-lg bg-black/90 text-primary-foreground text-xs w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10">
                    Prazo depende da confirmação do fornecedor para esta técnica e quantidade.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* #3: CTA "Gerar Orçamento" PREMIUM — biggest, fixed visual weight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 pt-2"
      >
        <Button 
          size="lg" 
          className="w-full gap-3 h-14 text-base font-bold rounded-xl shadow-xl shadow-primary/30 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={onGenerateQuote}
        >
          <FileText className="h-5 w-5" />
          Gerar Orçamento
        </Button>
        
        {/* Secondary row */}
        <div className="flex gap-2 justify-center">
          {wizard.hasAvailableLocations && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-9 rounded-lg" onClick={onAddAnother}>
              <Plus className="h-3.5 w-3.5" /> Outro Local
            </Button>
          )}
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground h-9" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" /> Copiar
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground h-9" onClick={handleShareWhatsApp}>
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </Button>
          <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground h-9" onClick={() => setShowDuplicateQty(!showDuplicateQty)}>
            <Repeat className="h-3.5 w-3.5" /> Outra Qtd.
          </Button>
        </div>
      </motion.div>

      {/* Duplicate with different quantity */}
      {showDuplicateQty && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex items-center justify-center gap-3 p-4 rounded-xl bg-muted/50 border"
        >
          <span className="text-sm text-muted-foreground">Nova quantidade:</span>
          <Input
            type="number"
            value={duplicateQty}
            onChange={(e) => setDuplicateQty(parseInt(e.target.value) || 1)}
            min={1}
            className="w-28 h-9 text-center font-bold rounded-lg"
          />
          <Button size="sm" onClick={handleDuplicate} disabled={duplicateQty === wizard.quantity || duplicateQty <= 0}>
            Recalcular
          </Button>
        </motion.div>
      )}

      {/* Quantity Range Comparison */}
      {wizard.personalizations.length > 0 && wizard.selectedProduct && (
        <QuantityRangeComparison
          personalizations={wizard.personalizations}
          currentQuantity={wizard.quantity}
          productPrice={wizard.effectivePrice}
        />
      )}

      {/* New Simulation */}
      <div className="text-center pt-2">
        <Button variant="link" className="text-muted-foreground" onClick={wizard.resetWizard}>
          Iniciar nova simulação
        </Button>
      </div>
    </div>
  );
}
