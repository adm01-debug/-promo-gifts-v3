/**
 * StepOptions - Passo 4: Configuração de Opções (Cores, Tamanho, Posições)
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
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Calculator,
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
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Produto</p>
              <p className="font-semibold text-sm truncate">{wizard.selectedProduct?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Local</p>
              <p className="font-semibold text-sm">{selectedLocation.locationName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Técnica</p>
              <p className="font-semibold text-sm">{selectedTechnique.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Colors */}
        {selectedTechnique.requiresColorSelection && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Quantidade de Cores
                </CardTitle>
                <CardDescription>
                  Máximo permitido: {maxColors} cores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick select */}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: Math.min(6, maxColors) }, (_, i) => i + 1).map(num => (
                    <Button
                      key={num}
                      variant={engravingOptions.colors === num ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => wizard.updateOptions({ colors: num })}
                      className="min-w-[40px]"
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
                    <span>1 cor</span>
                    <span className="font-medium text-foreground">
                      {engravingOptions.colors} {engravingOptions.colors === 1 ? 'cor' : 'cores'}
                    </span>
                    <span>{maxColors} cores</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Size */}
        {selectedTechnique.requiresSizeSelection && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={cn(areaExceeded && 'border-warning')}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-primary" />
                  Tamanho da Gravação
                </CardTitle>
                <CardDescription>
                  Máximo: {maxWidth}×{maxHeight}cm ({maxArea}cm²)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Width */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Largura (cm)</Label>
                    <span className="text-sm font-medium">{engravingOptions.width}cm</span>
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
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label className="text-sm">Altura (cm)</Label>
                    <span className="text-sm font-medium">{engravingOptions.height}cm</span>
                  </div>
                  <Slider
                    value={[engravingOptions.height]}
                    min={1}
                    max={maxHeight}
                    step={0.5}
                    onValueChange={([value]) => wizard.updateOptions({ height: value })}
                  />
                </div>

                {/* Area indicator */}
                <div className={cn(
                  'p-3 rounded-lg border',
                  areaExceeded ? 'bg-warning/10 border-warning' : 'bg-muted/50'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Área total</span>
                    <div className="flex items-center gap-2">
                      {areaExceeded && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                      <span className={cn(
                        'font-semibold',
                        areaExceeded && 'text-warning'
                      )}>
                        {currentArea.toFixed(1)}cm²
                      </span>
                    </div>
                  </div>
                  {areaExceeded && (
                    <p className="text-xs text-warning mt-1">
                      Área excede o máximo de {maxArea}cm²
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Positions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Posições de Gravação
              </CardTitle>
              <CardDescription>
                Quantidade de locais onde será aplicada a gravação
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                  className="text-center text-lg font-semibold w-20"
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
                <span className="text-sm text-muted-foreground">
                  {engravingOptions.positions === 1 ? 'posição' : 'posições'}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Resumo da Configuração
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                    <span className="font-medium">
                      {engravingOptions.width}×{engravingOptions.height}cm
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posições</span>
                  <span className="font-medium">{engravingOptions.positions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-medium">{wizard.quantity} unidades</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={wizard.previousStep}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={wizard.calculateResult}
          disabled={wizard.isCalculating || areaExceeded}
          className="gap-2"
        >
          {wizard.isCalculating ? (
            <>Calculando...</>
          ) : (
            <>
              <Calculator className="h-4 w-4" />
              Calcular Resultado
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
