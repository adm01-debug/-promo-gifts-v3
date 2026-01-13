/**
 * StepResult - Passo 5: Visualização do Resultado Final
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
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
      <div className="flex flex-col items-center justify-center py-12">
        <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏷️ Produto: ${result.product.name}
   SKU: ${result.product.sku}
   Qtd: ${result.product.quantity} unidades
   Preço/un: ${formatCurrency(result.product.unitPrice)}

📍 Local: ${result.location.componentName} - ${result.location.locationName}
   Dimensões máx: ${result.location.maxDimensions}

🎨 Técnica: ${result.technique.name} (${result.technique.code})
   Prazo: ~${result.technique.estimatedDays} dias úteis

⚙️ Configuração:
   Cores: ${result.options.colors}
   Tamanho: ${result.options.width}×${result.options.height}cm (${result.options.area}cm²)
   Posições: ${result.options.positions}

💰 CUSTOS:
   Produtos: ${formatCurrency(result.totals.productTotal)}
   Personalização: ${formatCurrency(result.totals.customizationTotal)}
   (Setup: ${formatCurrency(result.customization.setupCost)})
   
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TOTAL: ${formatCurrency(result.totals.grandTotal)}
   POR UNIDADE: ${formatCurrency(result.totals.grandTotalPerUnit)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    await navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-xl font-bold">Simulação Calculada!</h2>
        <p className="text-muted-foreground">
          Confira os detalhes abaixo
        </p>
      </motion.div>

      {/* Result Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Result Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2"
        >
          <Card className="border-2 border-primary/20 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Resultado da Simulação
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Product Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{result.product.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{result.product.sku}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.product.quantity} un. × {formatCurrency(result.product.unitPrice)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Subtotal produtos</p>
                  <p className="font-semibold">{formatCurrency(result.totals.productTotal)}</p>
                </div>
              </div>

              <Separator />

              {/* Technique Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{result.technique.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {result.location.componentName} - {result.location.locationName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      ~{result.technique.estimatedDays} dias
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
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
                  <p className="text-sm text-muted-foreground">Personalização</p>
                  <p className="font-semibold">{formatCurrency(result.totals.customizationTotal)}</p>
                  <p className="text-xs text-muted-foreground">
                    Setup: {formatCurrency(result.customization.setupCost)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Totals */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Total Geral
                  </div>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {formatCurrency(result.totals.grandTotal)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingDown className="h-4 w-4" />
                    Por Unidade
                  </div>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    {formatCurrency(result.totals.grandTotalPerUnit)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full gap-2" variant="default" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Copiar Resultado
              </Button>
              
              {onSave && (
                <Button className="w-full gap-2" variant="outline" onClick={onSave}>
                  <Save className="h-4 w-4" />
                  Salvar Simulação
                </Button>
              )}
              
              <Separator />
              
              <Button 
                className="w-full gap-2" 
                variant="ghost"
                onClick={() => wizard.setStep('options')}
              >
                <RefreshCw className="h-4 w-4" />
                Ajustar Configuração
              </Button>
              
              <Button 
                className="w-full gap-2" 
                variant="ghost"
                onClick={wizard.resetWizard}
              >
                Nova Simulação
              </Button>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Detalhamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo unitário produto</span>
                <span>{formatCurrency(result.product.unitPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo unit. personalização</span>
                <span>{formatCurrency(result.customization.costPerUnit)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Custo unitário total</span>
                <span>{formatCurrency(result.totals.grandTotalPerUnit)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => wizard.setStep('options')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar para Opções
        </Button>
      </div>
    </div>
  );
}
