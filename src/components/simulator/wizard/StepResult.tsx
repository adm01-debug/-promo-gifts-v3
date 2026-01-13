/**
 * StepResult - Passo 5: Resultado Final
 * 
 * Design: Destaque para o resultado, ações claras
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
      <div className="flex flex-col items-center justify-center py-16">
        <Calculator className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground">Nenhum resultado calculado</p>
        <Button className="mt-4" onClick={() => wizard.setStep('options')}>
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Success Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <motion.div 
          className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        >
          <CheckCircle2 className="h-8 w-8 text-success" />
        </motion.div>
        <h2 className="text-2xl font-bold">Simulação pronta!</h2>
        <p className="text-muted-foreground mt-1">
          Confira o detalhamento abaixo
        </p>
      </motion.div>

      {/* Main Result Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border border-primary/20 overflow-hidden"
      >
        {/* Product Info */}
        <div className="p-6 border-b border-primary/10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">{result.product.name}</p>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline">{result.product.sku}</Badge>
                <span className="text-sm text-muted-foreground">
                  {result.product.quantity} un. × {formatCurrency(result.product.unitPrice)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-semibold text-lg">{formatCurrency(result.totals.productTotal)}</p>
            </div>
          </div>
        </div>

        {/* Personalization Info */}
        <div className="p-6 border-b border-primary/10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">{result.technique.name}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {result.location.componentName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  ~{result.technique.estimatedDays} dias
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                <Badge variant="secondary" className="text-xs">
                  {result.options.colors} {result.options.colors === 1 ? 'cor' : 'cores'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {result.options.width}×{result.options.height}cm
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {result.options.positions} {result.options.positions === 1 ? 'posição' : 'posições'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Personalização</p>
              <p className="font-semibold text-lg">{formatCurrency(result.totals.customizationTotal)}</p>
              {result.customization.setupCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  (setup: {formatCurrency(result.customization.setupCost)})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="p-6 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="grid grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-background/80">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                Total Geral
              </div>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(result.totals.grandTotal)}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-background/80 border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Sparkles className="h-4 w-4" />
                Por Unidade
              </div>
              <p className="text-4xl font-bold">
                {formatCurrency(result.totals.grandTotalPerUnit)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-3 justify-center"
      >
        <Button size="lg" className="gap-2" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
          Copiar
        </Button>
        
        {onSave && (
          <Button size="lg" variant="outline" className="gap-2" onClick={onSave}>
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        )}
        
        <Button 
          size="lg"
          variant="ghost" 
          className="gap-2"
          onClick={() => wizard.setStep('options')}
        >
          <RefreshCw className="h-4 w-4" />
          Ajustar
        </Button>
        
        <Button 
          size="lg"
          variant="ghost" 
          className="gap-2"
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
        transition={{ delay: 0.3 }}
        className="p-5 rounded-2xl bg-muted/30"
      >
        <h4 className="font-medium text-sm mb-4 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Detalhamento de Custos
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Produto/un</p>
            <p className="font-semibold">{formatCurrency(result.product.unitPrice)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Pers./un</p>
            <p className="font-semibold">{formatCurrency(result.customization.costPerUnit)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Setup</p>
            <p className="font-semibold">{formatCurrency(result.customization.setupCost)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Custo/un total</p>
            <p className="font-bold text-primary">{formatCurrency(result.totals.grandTotalPerUnit)}</p>
          </div>
        </div>
      </motion.div>

      {/* Back Navigation */}
      <div className="flex justify-start pt-4">
        <Button variant="ghost" onClick={() => wizard.setStep('options')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    </div>
  );
}
