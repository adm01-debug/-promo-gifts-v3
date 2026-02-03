/**
 * StepOptions - Passo 4: Configuração de Opções
 * 
 * Design: Formulário elegante com sliders e feedback visual premium
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Palette, 
  Ruler,
  Layers,
  ChevronLeft,
  AlertTriangle,
  Calculator,
  Loader2,
  Package,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepOptionsProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepOptions({ wizard }: StepOptionsProps) {
  const { selectedTechnique, selectedLocation, engravingOptions } = wizard;

  // Se não tem técnica/location, redirecionar para o passo correto
  if (!selectedTechnique || !selectedLocation) {
    // Retornar mensagem amigável em vez de null
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">
          Selecione um local e técnica de gravação primeiro.
        </p>
      </div>
    );
  }

  const maxWidth = selectedTechnique.maxWidth || selectedLocation.maxWidthCm || 50;
  const maxHeight = selectedTechnique.maxHeight || selectedLocation.maxHeightCm || 50;
  const maxColors = selectedTechnique.maxColors || 10;
  const currentArea = engravingOptions.width * engravingOptions.height;
  const maxArea = selectedLocation.maxAreaCm2 || maxWidth * maxHeight;
  const areaExceeded = currentArea > maxArea;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Context Summary */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-muted/60 to-muted/30 border"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Produto</p>
              <p className="font-semibold truncate max-w-[150px]">{wizard.selectedProduct?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Local</p>
              <p className="font-semibold">{selectedLocation.locationName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Técnica</p>
              <p className="font-semibold">{selectedTechnique.name}</p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {wizard.quantity} un.
        </Badge>
      </motion.div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Configurações</h3>
          <p className="text-muted-foreground">Ajuste as especificações da gravação</p>
        </div>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colors */}
        {selectedTechnique.requiresColorSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-card border shadow-sm"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-bold text-lg">Cores</h4>
              </div>
              <Badge variant="outline">Máx {maxColors}</Badge>
            </div>
            
            {/* Quick Select */}
            <div className="flex flex-wrap gap-2 mb-5">
              {Array.from({ length: Math.min(6, maxColors) }, (_, i) => i + 1).map(num => (
                <Button
                  key={num}
                  variant={engravingOptions.colors === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => wizard.updateOptions({ colors: num })}
                  className={cn(
                    'w-11 h-11 rounded-xl text-base',
                    engravingOptions.colors === num && 'shadow-lg shadow-primary/20'
                  )}
                >
                  {num}
                </Button>
              ))}
            </div>
            
            {/* Slider */}
            <div className="space-y-3">
              <Slider
                value={[engravingOptions.colors]}
                min={1}
                max={maxColors}
                step={1}
                onValueChange={([value]) => wizard.updateOptions({ colors: value })}
                className="py-2"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">1</span>
                <span className="font-bold text-lg text-primary">
                  {engravingOptions.colors} {engravingOptions.colors === 1 ? 'cor' : 'cores'}
                </span>
                <span className="text-xs text-muted-foreground">{maxColors}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Size */}
        {selectedTechnique.requiresSizeSelection && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              'p-6 rounded-3xl border shadow-sm',
              areaExceeded ? 'bg-warning/5 border-warning/30' : 'bg-card'
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Ruler className="h-5 w-5 text-primary" />
                </div>
                <h4 className="font-bold text-lg">Tamanho</h4>
              </div>
              <Badge variant="outline">Máx {maxWidth}×{maxHeight}cm</Badge>
            </div>

            {/* Width */}
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <Label className="font-medium">Largura</Label>
                <span className="font-bold text-primary">{engravingOptions.width}cm</span>
              </div>
              <Slider
                value={[engravingOptions.width]}
                min={1}
                max={maxWidth}
                step={0.5}
                onValueChange={([value]) => wizard.updateOptions({ width: value })}
              />
            </div>

            {/* Height */}
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <Label className="font-medium">Altura</Label>
                <span className="font-bold text-primary">{engravingOptions.height}cm</span>
              </div>
              <Slider
                value={[engravingOptions.height]}
                min={1}
                max={maxHeight}
                step={0.5}
                onValueChange={([value]) => wizard.updateOptions({ height: value })}
              />
            </div>

            {/* Area */}
            <div className={cn(
              'p-4 rounded-2xl border transition-colors',
              areaExceeded ? 'bg-warning/10 border-warning' : 'bg-muted/50'
            )}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Área total</span>
                <div className="flex items-center gap-2">
                  {areaExceeded && <AlertTriangle className="h-4 w-4 text-warning" />}
                  <span className={cn('font-bold text-lg', areaExceeded && 'text-warning')}>
                    {currentArea.toFixed(1)}cm²
                  </span>
                </div>
              </div>
              {areaExceeded && (
                <p className="text-xs text-warning mt-2">
                  ⚠️ Excede o máximo permitido de {maxArea}cm²
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Positions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-3xl bg-card border shadow-sm"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-lg">Posições</h4>
              <p className="text-sm text-muted-foreground">Locais com gravação</p>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl"
              onClick={() => wizard.updateOptions({ 
                positions: Math.max(1, engravingOptions.positions - 1) 
              })}
              disabled={engravingOptions.positions <= 1}
            >
              -
            </Button>
            <Input
              type="number"
              value={engravingOptions.positions}
              onChange={e => wizard.updateOptions({ 
                positions: Math.max(1, parseInt(e.target.value) || 1) 
              })}
              min={1}
              max={10}
              className="text-center text-3xl font-bold w-24 h-16 rounded-xl"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl"
              onClick={() => wizard.updateOptions({ 
                positions: Math.min(10, engravingOptions.positions + 1) 
              })}
              disabled={engravingOptions.positions >= 10}
            >
              +
            </Button>
          </div>
        </motion.div>

        {/* Summary Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-lg">Resumo</h4>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-primary/10">
              <span className="text-muted-foreground">Técnica</span>
              <span className="font-semibold">{selectedTechnique.name}</span>
            </div>
            {selectedTechnique.requiresColorSelection && (
              <div className="flex justify-between py-2 border-b border-primary/10">
                <span className="text-muted-foreground">Cores</span>
                <span className="font-semibold">{engravingOptions.colors}</span>
              </div>
            )}
            {selectedTechnique.requiresSizeSelection && (
              <div className="flex justify-between py-2 border-b border-primary/10">
                <span className="text-muted-foreground">Dimensões</span>
                <span className="font-semibold">{engravingOptions.width}×{engravingOptions.height}cm</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-primary/10">
              <span className="text-muted-foreground">Posições</span>
              <span className="font-semibold">{engravingOptions.positions}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Quantidade</span>
              <span className="font-bold text-primary">{wizard.quantity} unidades</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row justify-between gap-4 pt-6"
      >
        <Button variant="ghost" size="lg" onClick={wizard.previousStep} className="gap-2">
          <ChevronLeft className="h-5 w-5" />
          Voltar
        </Button>
        
        <div className="flex gap-3">
          {/* Botão Adicionar/Atualizar Gravação */}
          <Button
            onClick={async () => {
              await wizard.confirmPersonalization();
            }}
            disabled={wizard.isCalculating || areaExceeded}
            size="lg"
            variant="outline"
            className="gap-2 min-w-[180px] h-14 rounded-xl text-base"
          >
            {wizard.isEditingPersonalization ? (
              <>
                <Settings className="h-5 w-5" />
                Atualizar Gravação
              </>
            ) : (
              <>
                <Layers className="h-5 w-5" />
                Adicionar Gravação
              </>
            )}
          </Button>

          {/* Botão Ver Resultado (só aparece se já tem pelo menos uma personalização) */}
          {wizard.personalizations.length > 0 && (
            <Button
              onClick={async () => {
                // Se tem config pendente, confirma primeiro
                if (wizard.selectedLocation && wizard.selectedTechnique) {
                  await wizard.confirmPersonalization();
                }
                await wizard.calculateResult();
              }}
              disabled={wizard.isCalculating || areaExceeded}
              size="lg"
              className="gap-3 min-w-[180px] h-14 rounded-xl shadow-lg shadow-primary/25 text-base"
            >
              {wizard.isCalculating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Calculando...
                </>
              ) : (
                <>
                  <Calculator className="h-5 w-5" />
                  Ver Resultado
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
