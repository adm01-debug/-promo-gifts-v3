/**
 * StepResult - Passo 5: Resultado Final com MÚLTIPLAS PERSONALIZAÇÕES
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
  Plus,
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
        <Button className="mt-6" onClick={() => wizard.setStep('configuration')}>
          Voltar para configuração
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleCopy = async () => {
    const personalizationsText = result.personalizations.map((p, idx) => `
   ${idx + 1}. ${p.technique.name}
      Local: ${p.location.componentName} | ${p.location.locationName}
      Cores: ${p.options.colors} | Tamanho: ${p.options.width}×${p.options.height}cm
      Custo: ${formatCurrency(p.customization.totalCost)} (${formatCurrency(p.customization.costPerUnit)}/un)
      Prazo: ~${p.technique.estimatedDays} dias úteis`
    ).join('\n');

    const text = `
📦 SIMULAÇÃO DE PERSONALIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏷️ Produto: ${result.product.name}
   SKU: ${result.product.sku}
   Qtd: ${result.product.quantity} unidades
   Preço/un: ${formatCurrency(result.product.unitPrice)}

🎨 PERSONALIZAÇÕES (${result.personalizations.length}):
${personalizationsText}

💰 CUSTOS:
   Produtos: ${formatCurrency(result.totals.productTotal)}
   Personalizações: ${formatCurrency(result.totals.customizationTotal)}
   
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOTAL: ${formatCurrency(result.totals.grandTotal)}
   POR UNIDADE: ${formatCurrency(result.totals.grandTotalPerUnit)}
   PRAZO MÁXIMO: ~${result.maxEstimatedDays} dias úteis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    await navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  const handleAddAnother = () => {
    wizard.startNewPersonalization();
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
          {result.personalizations.length} {result.personalizations.length === 1 ? 'gravação configurada' : 'gravações configuradas'}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Total Geral</span>
              </div>
              <p className="text-4xl font-bold tracking-tight">
                {formatCurrency(result.totals.grandTotal)}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Por Unidade</span>
              </div>
              <p className="text-4xl font-bold tracking-tight">
                {formatCurrency(result.totals.grandTotalPerUnit)}
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium opacity-80 uppercase tracking-wider">Prazo Máx.</span>
              </div>
              <p className="text-4xl font-bold tracking-tight">
                ~{result.maxEstimatedDays} dias
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
              <p className="text-xs text-muted-foreground uppercase">Subtotal Produto</p>
              <p className="font-bold text-xl">{formatCurrency(result.totals.productTotal)}</p>
            </div>
          </div>

          {/* Personalizações */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-lg flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Personalizações
              </h4>
              <Badge variant="secondary">
                {result.personalizations.length} {result.personalizations.length === 1 ? 'gravação' : 'gravações'}
              </Badge>
            </div>

            <div className="space-y-4">
              {result.personalizations.map((pers, idx) => (
                <motion.div
                  key={pers.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="flex items-center gap-5 p-4 rounded-xl bg-muted/30 border"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{pers.technique.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {pers.location.componentName} | {pers.location.locationName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        ~{pers.technique.estimatedDays} dias
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {pers.options.colors} {pers.options.colors === 1 ? 'cor' : 'cores'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {pers.options.width}×{pers.options.height}cm
                      </Badge>
                      {pers.options.positions > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {pers.options.positions} posições
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-primary">
                      {formatCurrency(pers.customization.totalCost)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(pers.customization.costPerUnit)}/un
                    </p>
                    {pers.customization.setupCost > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        (setup: {formatCurrency(pers.customization.setupCost)})
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Subtotal Personalizações */}
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Subtotal Personalizações</p>
                <p className="font-bold text-xl text-primary">
                  {formatCurrency(result.totals.customizationTotal)}
                </p>
              </div>
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
        
        <Button 
          size="lg"
          variant="outline" 
          className="gap-2 h-12 px-6 rounded-xl"
          onClick={handleAddAnother}
        >
          <Plus className="h-4 w-4" />
          Nova Gravação
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
            <p className="font-bold text-xl">
              {formatCurrency(result.totals.customizationTotal / result.product.quantity)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border">
            <p className="text-sm text-muted-foreground mb-1">Setups (total)</p>
            <p className="font-bold text-xl">
              {formatCurrency(result.personalizations.reduce((sum, p) => sum + p.customization.setupCost, 0))}
            </p>
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
        <Button variant="ghost" size="lg" className="gap-2" onClick={() => wizard.setStep('configuration')}>
          <ChevronLeft className="h-5 w-5" />
          Voltar
        </Button>
      </motion.div>
    </div>
  );
}
