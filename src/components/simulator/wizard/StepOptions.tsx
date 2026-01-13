/**
 * StepOptions - Passo 4: Configuração de Opções (Cores, Tamanho, Posições)
 * 
 * Design: Formulário limpo com sliders e feedback visual
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepOptionsProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepOptions({ wizard }: StepOptionsProps) {
  const { selectedTechnique, selectedLocation, engravingOptions } = wizard;

  if (!selectedTechnique || !selectedLocation) {
    return null;
  }

  const maxWidth = selectedTechnique.maxWidth || selectedLocation.maxWidthCm || 50;
  const maxHeight = selectedTechnique.maxHeight || selectedLocation.maxHeightCm || 50;
  const maxColors = selectedTechnique.maxColors || 10;
  const currentArea = engravingOptions.width * engravingOptions.height;
  const maxArea = selectedLocation.maxAreaCm2 || maxWidth * maxHeight;
  const areaExceeded = currentArea > maxArea;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Context Summary */}
      <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-muted/50 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Produto</p>
          <p className="font-medium text-sm truncate">{wizard.selectedProduct?.name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Local</p>
          <p className="font-medium text-sm">{selectedLocation.locationName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Técnica</p>
          <p className="font-medium text-sm">{selectedTechnique.name}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Configurar opções</h3>
          <p className="text-sm text-muted-foreground">Ajuste as especificações da gravação</p>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors */}
        {selectedTechnique.requiresColorSelection && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-muted/30"
          >
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Cores</h4>
              <Badge variant="outline" className="ml-auto text-xs">
                Máx {maxColors}
              </Badge>
            </div>
            
            {/* Quick Select */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from({ length: Math.min(6, maxColors) }, (_, i) => i + 1).map(num => (
                <Button
                  key={num}
                  variant={engravingOptions.colors === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => wizard.updateOptions({ colors: num })}
                  className="w-10 h-10"
                >
                  {num}
                </Button>
              ))}
            </div>
            
            {/* Slider */}
            <div className="space-y-2">
              <Slider
                value={[engravingOptions.colors]}
                min={1}
                max={maxColors}
                step={1}
                onValueChange={([value]) => wizard.updateOptions({ colors: value })}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span className="font-medium text-foreground text-sm">
                  {engravingOptions.colors} {engravingOptions.colors === 1 ? 'cor' : 'cores'}
                </span>
                <span>{maxColors}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Size */}
        {selectedTechnique.requiresSizeSelection && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              'p-6 rounded-2xl',
              areaExceeded ? 'bg-warning/10' : 'bg-muted/30'
            )}
          >
            <div className="flex items-center gap-2 mb-4">
              <Ruler className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Tamanho</h4>
              <Badge variant="outline" className="ml-auto text-xs">
                Máx {maxWidth}×{maxHeight}cm
              </Badge>
            </div>

            {/* Width */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <Label>Largura</Label>
                <span className="font-medium">{engravingOptions.width}cm</span>
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
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <Label>Altura</Label>
                <span className="font-medium">{engravingOptions.height}cm</span>
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
              'p-3 rounded-lg border',
              areaExceeded ? 'bg-warning/10 border-warning' : 'bg-background/50'
            )}>
              <div className="flex items-center justify-between text-sm">
                <span>Área total</span>
                <div className="flex items-center gap-2">
                  {areaExceeded && <AlertTriangle className="h-4 w-4 text-warning" />}
                  <span className={cn('font-semibold', areaExceeded && 'text-warning')}>
                    {currentArea.toFixed(1)}cm²
                  </span>
                </div>
              </div>
              {areaExceeded && (
                <p className="text-xs text-warning mt-1">
                  Excede o máximo de {maxArea}cm²
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Positions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-muted/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Posições</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Quantidade de locais com gravação
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
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
              className="text-center text-xl font-bold w-20 h-12"
            />
            <Button
              variant="outline"
              size="icon"
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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-primary/5 border border-primary/20"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-4 w-4 text-primary" />
            <h4 className="font-medium">Resumo</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Técnica</span>
              <span className="font-medium">{selectedTechnique.name}</span>
            </div>
            {selectedTechnique.requiresColorSelection && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cores</span>
                <span className="font-medium">{engravingOptions.colors}</span>
              </div>
            )}
            {selectedTechnique.requiresSizeSelection && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensões</span>
                <span className="font-medium">{engravingOptions.width}×{engravingOptions.height}cm</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Posições</span>
              <span className="font-medium">{engravingOptions.positions}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Quantidade</span>
              <span className="font-medium">{wizard.quantity} unidades</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={wizard.previousStep}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={wizard.calculateResult}
          disabled={wizard.isCalculating || areaExceeded}
          className="gap-2 min-w-[180px]"
          size="lg"
        >
          {wizard.isCalculating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Ver Resultado
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
