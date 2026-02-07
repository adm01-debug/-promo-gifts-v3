/**
 * StepComparison - Passo 4: Comparativo de Técnicas
 * 
 * Mostra TODAS as técnicas disponíveis com preços reais do RPC,
 * ordenadas por custo-benefício. O vendedor escolhe a melhor opção.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  ChevronLeft,
  Trophy,
  Zap,
  Clock,
  DollarSign,
  AlertTriangle,
  Check,
  Plus,
  FileText,
  Copy,
  Package,
  MapPin,
  Palette,
  Ruler,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import type { TechniqueComparisonResult } from '@/types/domain/simulator-wizard';

interface StepComparisonProps {
  wizard: UseSimulatorWizardReturn;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export function StepComparison({ wizard }: StepComparisonProps) {
  const navigate = useNavigate();
  const { comparisonResults, selectedComparison, selectedLocation, engravingSpecs } = wizard;
  
  const availableResults = comparisonResults.filter(r => r.isAvailable);
  const unavailableResults = comparisonResults.filter(r => !r.isAvailable);

  const handleSelectTechnique = (result: TechniqueComparisonResult) => {
    if (!result.isAvailable) return;
    wizard.confirmTechnique(result);
  };

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
      `${idx + 1}. ${p.technique.name} | ${p.location.locationName} | ${p.specs.colors} cores | ${p.specs.width}×${p.specs.height}cm | ${formatCurrency(p.pricing.totalPrice)} (${formatCurrency(p.pricing.costPerUnit)}/un) | Cód: ${p.pricing.budgetCode}`
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
⏱️ Prazo: ~${wizard.totals.maxDays} dias úteis
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
      {/* Context Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-muted/80 to-muted/40 border"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Produto</p>
              <p className="font-semibold truncate max-w-[120px]">{wizard.selectedProduct?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Local</p>
              <p className="font-semibold flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {selectedLocation?.locationName}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Cores</p>
              <p className="font-semibold flex items-center gap-1">
                <Palette className="h-3 w-3" />
                {engravingSpecs.colors}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Tamanho</p>
              <p className="font-semibold flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {engravingSpecs.width}×{engravingSpecs.height}cm
              </p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {wizard.quantity} un.
        </Badge>
      </motion.div>

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
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => wizard.setStep('specs')}>
          <RefreshCw className="h-4 w-4" />
          Alterar Specs
        </Button>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {availableResults.map((result, idx) => (
            <motion.div
              key={result.techniqueId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <ComparisonCard 
                result={result} 
                onSelect={handleSelectTechnique}
                quantity={wizard.quantity}
                isFirst={idx === 0}
              />
            </motion.div>
          ))}
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
}: { 
  result: TechniqueComparisonResult; 
  onSelect: (r: TechniqueComparisonResult) => void;
  quantity: number;
  isFirst: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(result)}
      className={cn(
        'w-full p-6 rounded-2xl text-left transition-all duration-300 group',
        'bg-card border hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10',
        isFirst && 'ring-2 ring-primary/30 shadow-lg'
      )}
    >
      <div className="flex items-start justify-between gap-6">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h4 className="font-bold text-xl">{result.techniqueName}</h4>
            <Badge variant="outline" className="text-xs font-mono">
              {result.techniqueCode}
            </Badge>
            {result.isCheapest && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 gap-1.5 shadow-lg shadow-amber-500/25">
                <Trophy className="h-3.5 w-3.5" />
                Mais Barato
              </Badge>
            )}
            {result.isFastest && (
              <Badge variant="secondary" className="gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Mais Rápido
              </Badge>
            )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-bold text-lg">{formatCurrency(result.unitPrice)}</span>
                <span className="text-muted-foreground text-sm">/un</span>
              </div>
            </div>
            {result.productionDays && (
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <span className="font-bold">{result.productionDays}</span>
                  <span className="text-muted-foreground text-sm"> dias</span>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-4">
            {result.budgetCode && (
              <Badge variant="secondary" className="text-xs font-mono gap-1">
                📋 {result.budgetCode}
              </Badge>
            )}
            {result.minimumApplied && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
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
          </div>
        </div>

        {/* Right: Total Price + CTA */}
        <div className="text-right shrink-0 flex flex-col items-end gap-3">
          <div className="p-4 rounded-2xl bg-muted/50 group-hover:bg-primary/5 transition-colors">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Total</p>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(result.totalPrice)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatCurrency(result.costPerUnit)}/un
            </p>
            {result.setupPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Setup: {formatCurrency(result.setupPrice)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Check className="h-4 w-4" />
            Selecionar
          </div>
        </div>
      </div>
    </button>
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
  return (
    <div className="space-y-8">
      {/* Success */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <motion.div 
          className="relative w-16 h-16 mx-auto mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1, stiffness: 200 }}
        >
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
            <Check className="h-8 w-8 text-white" />
          </div>
        </motion.div>
        <h2 className="text-2xl font-bold mb-1">
          {wizard.personalizations.length} {wizard.personalizations.length === 1 ? 'gravação configurada' : 'gravações configuradas'}
        </h2>
        <p className="text-muted-foreground">O que deseja fazer agora?</p>
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
                  {pers.location.componentName} • {pers.location.locationName}
                </span>
                <span>{pers.specs.colors} cores</span>
                <span>{pers.specs.width}×{pers.specs.height}cm</span>
              </div>
              {pers.pricing.budgetCode && (
                <Badge variant="secondary" className="text-xs font-mono mt-2">
                  {pers.pricing.budgetCode}
                </Badge>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-lg text-primary">
                {formatCurrency(pers.pricing.totalPrice)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(pers.pricing.costPerUnit)}/un
              </p>
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
        <div className="bg-gradient-to-br from-primary via-primary to-primary/90 p-6 text-primary-foreground">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <p className="text-sm opacity-80 mb-1">Total Geral</p>
              <p className="text-2xl font-bold">{formatCurrency(wizard.totals.grandTotal)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/20 backdrop-blur-sm border border-white/20">
              <p className="text-sm opacity-80 mb-1">Por Unidade</p>
              <p className="text-2xl font-bold">{formatCurrency(wizard.totals.grandTotalPerUnit)}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <p className="text-sm opacity-80 mb-1">Prazo Máx.</p>
              <p className="text-2xl font-bold">~{wizard.totals.maxDays} dias</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-wrap gap-4 justify-center pt-4"
      >
        {wizard.hasAvailableLocations && (
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2 h-14 px-6 rounded-xl"
            onClick={onAddAnother}
          >
            <Plus className="h-5 w-5" />
            Outro Local
          </Button>
        )}
        
        <Button 
          size="lg" 
          className="gap-2 h-14 px-8 rounded-xl shadow-lg shadow-primary/25"
          onClick={onGenerateQuote}
        >
          <FileText className="h-5 w-5" />
          Gerar Orçamento
        </Button>
        
        <Button 
          size="lg" 
          variant="ghost" 
          className="gap-2 h-14 px-6"
          onClick={onCopy}
        >
          <Copy className="h-5 w-5" />
          Copiar
        </Button>
      </motion.div>

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
