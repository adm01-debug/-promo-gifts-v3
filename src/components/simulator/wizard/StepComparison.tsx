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
            <h3 className="text-xl font-bold">Comparativo de Técnicas</h3>
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
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-2xl shadow-emerald-900/40 border border-emerald-500/30">
              <div>
                <p className="font-bold text-base">
                  {selectedIds.size} técnica{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-emerald-100/80">
                  Total combinado: {formatCurrency(
                    availableResults
                      .filter(r => selectedIds.has(r.techniqueId))
                      .reduce((sum, r) => sum + r.totalPrice, 0)
                  )}
                </p>
              </div>
              <Button 
                size="lg" 
                className="gap-2 font-bold bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg"
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
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-amber-500/40 via-primary/30 to-amber-500/40 blur-sm pointer-events-none" />
      )}
      <button
        onClick={() => onSelect(result)}
        className={cn(
          'relative w-full p-6 rounded-2xl text-left transition-all duration-300 group',
          'bg-card border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10',
          isSelected && 'ring-2 ring-primary border-primary/50 shadow-lg shadow-primary/10',
          !isSelected && isBestValue && 'ring-2 ring-amber-500/50 border-amber-500/30 shadow-lg shadow-amber-500/10',
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
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1.5 px-3 py-1 shadow-lg shadow-amber-500/25 text-sm">
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
                <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-400 dark:text-emerald-400 dark:border-emerald-700">
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
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
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
    <div className="space-y-8">
      {/* Success */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-3"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.div 
              className="relative w-10 h-10 shrink-0"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
            >
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-lg" />
              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-md">
                <Check className="h-5 w-5 text-white" />
              </div>
            </motion.div>
            <div className="text-left">
              <h2 className="text-lg font-bold leading-tight">
                Pronto! O que deseja fazer?
              </h2>
              <p className="text-xs text-muted-foreground">
                {wizard.personalizations.length} {wizard.personalizations.length === 1 ? 'gravação' : 'gravações'} configurada{wizard.personalizations.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {/* Undo/Redo */}
          <div className="flex items-center gap-2 justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-7"
              disabled={!wizard.canUndo}
              onClick={wizard.undo}
            >
              <Undo2 className="h-3 w-3" />
              Desfazer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs h-7"
              disabled={!wizard.canRedo}
              onClick={wizard.redo}
            >
              <Redo2 className="h-3 w-3" />
              Refazer
            </Button>
          </div>
        </motion.div>

      {/* Personalizations List */}
      <div className="space-y-3">
        {wizard.personalizations.map((pers, idx) => (
          <motion.div
            key={pers.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * idx }}
            className="flex items-center gap-5 p-5 rounded-xl bg-card border"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{pers.technique.name}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {pers.location.componentName === pers.location.locationName 
                    ? pers.location.locationName 
                    : `${pers.location.componentName} • ${pers.location.locationName}`}
                </span>
                <span>{pers.specs.colors} {pers.specs.colors === 1 ? 'cor' : 'cores'}</span>
                <span>{pers.specs.width}×{pers.specs.height}cm</span>
              </div>
              {pers.pricing.budgetCode && (
                <Badge variant="secondary" className="text-xs font-mono mt-2 gap-1">
                  <span className="opacity-60">Cód:</span> {pers.pricing.budgetCode}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {wizard.selectedProduct && (
                <WizardMockupPreview
                  personalization={pers}
                  product={wizard.selectedProduct}
                />
              )}
              <div className="text-right">
                <p className="font-bold text-lg text-primary">
                  {formatCurrency(pers.pricing.totalPrice)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(pers.pricing.costPerUnit)}/un
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Totals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl overflow-hidden shadow-xl"
      >
        <div className="bg-gradient-to-br from-primary via-primary to-primary/90 p-5 text-primary-foreground">
          <div className="grid grid-cols-[2fr_1.5fr_1fr] gap-3 items-stretch">
            {/* Total Geral — destaque principal */}
            <div className="p-4 rounded-xl bg-black/25 backdrop-blur-sm border border-white/10 shadow-lg shadow-black/20">
              <p className="text-xs font-semibold tracking-wider text-white/70 mb-1.5">Total geral</p>
              <p className="text-4xl font-extrabold tracking-tight text-white">{formatCurrency(wizard.totals.grandTotal)}</p>
            </div>
            {/* Por Unidade */}
            <div className="p-4 rounded-xl bg-black/15 backdrop-blur-sm border border-white/10">
              <p className="text-xs font-semibold tracking-wider text-white/70 mb-0.5">Por unidade</p>
              <p className="text-[11px] text-white/50 mb-1.5">(produto + gravação)</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(wizard.totals.grandTotalPerUnit)}</p>
            </div>
            {/* Prazo */}
            <div className="p-4 rounded-xl bg-black/15 backdrop-blur-sm border border-white/10 flex flex-col justify-between">
              <p className="text-xs font-semibold tracking-wider text-white/70 mb-1.5">Prazo máx.</p>
              {wizard.totals.maxDays > 0 ? (
                <p className="text-2xl font-bold text-white">~{wizard.totals.maxDays}d</p>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-white/70 shrink-0" />
                  <p className="text-lg font-bold text-white">A consultar</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions — Primary + Secondary hierarchy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3 pt-4"
      >
        {/* Primary actions */}
        <div className="flex gap-3 justify-center">
          {wizard.hasAvailableLocations && (
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 h-12 px-6 rounded-xl"
              onClick={onAddAnother}
            >
              <Plus className="h-4 w-4" />
              Outro Local
            </Button>
          )}
          
          <Button 
            size="lg" 
            className="gap-2 h-12 px-8 rounded-xl shadow-lg shadow-primary/25"
            onClick={onGenerateQuote}
          >
            <FileText className="h-4 w-4" />
            Gerar Orçamento
          </Button>
        </div>
        
        {/* Secondary actions — smaller, muted */}
        <div className="flex gap-2 justify-center">
          <Button 
            size="sm" 
            variant="ghost" 
            className="gap-1.5 text-xs text-muted-foreground h-9"
            onClick={onCopy}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>

          <Button 
            size="sm" 
            variant="ghost" 
            className="gap-1.5 text-xs text-muted-foreground h-9"
            onClick={handleShareWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </Button>

          <Button 
            size="sm" 
            variant="ghost" 
            className="gap-1.5 text-xs text-muted-foreground h-9"
            onClick={() => setShowDuplicateQty(!showDuplicateQty)}
          >
            <Repeat className="h-3.5 w-3.5" />
            Outra Qtd.
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
      <div className="text-center pt-4">
        <Button 
          variant="link" 
          className="text-muted-foreground"
          onClick={wizard.resetWizard}
        >
          Iniciar nova simulação
        </Button>
      </div>
    </div>
  );
}
