/**
 * StepResult - Passo 5: Resultado Final Premium
 * 
 * Design: Destaque hero para resultados com visual impactante
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Copy,
  Save,
  RefreshCw,
  ChevronLeft,
  Package,
  MapPin,
  Palette,
  Clock,
  DollarSign,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Receipt,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepResultProps {
  wizard: UseSimulatorWizardReturn;
  onSave?: () => void;
}

export function StepResult({ wizard, onSave }: StepResultProps) {
  const { result } = wizard;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Calculator className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <p className="text-muted-foreground text-lg">Nenhum resultado calculado</p>
        <Button className="mt-6" onClick={() => wizard.setStep('options')}>
          Voltar para configuração
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCopy = async () => {
    const text = `
📦 SIMULAÇÃO DE PERSONALIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏷️ Produto: ${result.product.name}
   SKU: ${result.product.sku}
   Qtd: ${result.product.quantity} unidades
   Preço/un: ${formatCurrency(result.product.unitPrice)}

📍 Local: ${result.location.componentName} - ${result.location.locationName}

🎨 Técnica: ${result.technique.name} (${result.technique.code})
   Prazo: ~${result.technique.estimatedDays} dias úteis

⚙️ Configuração:
   Cores: ${result.options.colors}
   Tamanho: ${result.options.width}×${result.options.height}cm
   Posições: ${result.options.positions}

💰 CUSTOS:
   Produtos: ${formatCurrency(result.totals.productTotal)}
   Personalização: ${formatCurrency(result.totals.customizationTotal)}
   
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOTAL: ${formatCurrency(result.totals.grandTotal)}
   POR UNIDADE: ${formatCurrency(result.totals.grandTotalPerUnit)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    await navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Success Hero */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <motion.div 
          className="relative w-20 h-20 mx-auto mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2, stiffness: 200 }}
        >
          <div className="absolute inset-0 bg-success/20 rounded-full blur-xl" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center shadow-lg shadow-success/30">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
        </motion.div>
        <h2 className="text-3xl font-bold mb-2">Simulação Concluída!</h2>
        <p className="text-muted-foreground text-lg">
          Confira os detalhes abaixo
        </p>
      </motion.div>

      {/* Main Result Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-3xl overflow-hidden shadow-2xl shadow-primary/10"
      >
        {/* Hero Totals */}
        <div className="bg-gradient-to-br from-primary via-primary to-primary/90 p-8 text-primary-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Total Geral</span>
              </div>
              <p className="text-5xl font-bold tracking-tight">
                {formatCurrency(result.totals.grandTotal)}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Por Unidade</span>
              </div>
              <p className="text-5xl font-bold tracking-tight">
                {formatCurrency(result.totals.grandTotalPerUnit)}
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-card">
          {/* Product */}
          <div className="p-6 border-b flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg">{result.product.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline">{result.product.sku}</Badge>
                <span className="text-sm text-muted-foreground">
                  {result.product.quantity} un. × {formatCurrency(result.product.unitPrice)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase">Subtotal</p>
              <p className="font-bold text-xl">{formatCurrency(result.totals.productTotal)}</p>
            </div>
          </div>

          {/* Personalization */}
          <div className="p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg">{result.technique.name}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {result.location.componentName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  ~{result.technique.estimatedDays} dias
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Badge variant="secondary">
                  {result.options.colors} {result.options.colors === 1 ? 'cor' : 'cores'}
                </Badge>
                <Badge variant="secondary">
                  {result.options.width}×{result.options.height}cm
                </Badge>
                <Badge variant="secondary">
                  {result.options.positions} {result.options.positions === 1 ? 'posição' : 'posições'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase">Personalização</p>
              <p className="font-bold text-xl text-primary">{formatCurrency(result.totals.customizationTotal)}</p>
              {result.customization.setupCost > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  (setup: {formatCurrency(result.customization.setupCost)})
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <Button size="lg" className="gap-2 h-12 px-6 rounded-xl shadow-lg" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
          Copiar
        </Button>
        
        {onSave && (
          <Button size="lg" variant="outline" className="gap-2 h-12 px-6 rounded-xl" onClick={onSave}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        )}
        
        <Button 
          size="lg"
          variant="ghost" 
          className="gap-2 h-12 px-6"
          onClick={() => wizard.setStep('options')}
        >
          <RefreshCw className="h-4 w-4" />
          Ajustar
        </Button>
        
        <Button 
          size="lg"
          variant="ghost" 
          className="gap-2 h-12 px-6"
          onClick={wizard.resetWizard}
        >
          Nova Simulação
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Cost Breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="p-6 rounded-2xl bg-muted/30 border"
      >
        <h4 className="font-bold mb-5 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Detalhamento de Custos
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-card border">
            <p className="text-sm text-muted-foreground mb-1">Produto/un</p>
            <p className="font-bold text-xl">{formatCurrency(result.product.unitPrice)}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <p className="text-sm text-muted-foreground mb-1">Pers./un</p>
            <p className="font-bold text-xl">{formatCurrency(result.customization.costPerUnit)}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <p className="text-sm text-muted-foreground mb-1">Setup</p>
            <p className="font-bold text-xl">{formatCurrency(result.customization.setupCost)}</p>
          </div>
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Custo/un total</p>
            <p className="font-bold text-xl text-primary">{formatCurrency(result.totals.grandTotalPerUnit)}</p>
          </div>
        </div>
      </motion.div>

      {/* Back Navigation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-start pt-4"
      >
        <Button variant="ghost" size="lg" className="gap-2" onClick={() => wizard.setStep('options')}>
          <ChevronLeft className="h-5 w-5" />
          Voltar
        </Button>
      </motion.div>
    </div>
  );
}
