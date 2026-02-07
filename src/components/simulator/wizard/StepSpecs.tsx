/**
 * StepSpecs - Passo 3: Especificações da Gravação
 * 
 * Configura: cores, tamanho (largura × altura)
 * Após configurar, o vendedor avança para ver o comparativo de técnicas.
 */

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  SlidersHorizontal, 
  Palette, 
  Ruler,
  ChevronLeft,
  AlertTriangle,
  BarChart3,
  Loader2,
  Package,
  MapPin,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepSpecsProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepSpecs({ wizard }: StepSpecsProps) {
  const { selectedLocation, engravingSpecs, maxColorsForLocation } = wizard;

  if (!selectedLocation) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Selecione um local de gravação primeiro.</p>
      </div>
    );
  }

  const maxWidth = selectedLocation.maxWidthCm || 50;
  const maxHeight = selectedLocation.maxHeightCm || 50;
  const currentArea = engravingSpecs.width * engravingSpecs.height;
  const maxArea = selectedLocation.maxAreaCm2 || maxWidth * maxHeight;
  const areaExceeded = currentArea > maxArea;

  const handleCompare = async () => {
    await wizard.fetchComparisonPrices();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Context Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-muted/80 to-muted/40 border"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-background overflow-hidden shadow-sm">
            {wizard.selectedProduct?.imageUrl ? (
              <img 
                src={wizard.selectedProduct.imageUrl} 
                alt={wizard.selectedProduct.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase">Produto</p>
              <p className="font-semibold truncate max-w-[150px]">{wizard.selectedProduct?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">Local</p>
              <p className="font-semibold flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {selectedLocation.componentName} • {selectedLocation.locationName}
              </p>
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
          <SlidersHorizontal className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Especificações da Gravação</h3>
          <p className="text-muted-foreground">Defina as características e veja as opções disponíveis</p>
        </div>
      </div>

      {/* Specs Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        {/* Colors */}
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
            <Badge variant="outline">Máx {maxColorsForLocation}</Badge>
          </div>
          
          {/* Quick Select */}
          <div className="flex flex-wrap gap-2 mb-5">
            {Array.from({ length: Math.min(6, maxColorsForLocation) }, (_, i) => i + 1).map(num => (
              <Button
                key={num}
                variant={engravingSpecs.colors === num ? 'default' : 'outline'}
                size="sm"
                onClick={() => wizard.updateSpecs({ colors: num })}
                className={cn(
                  'w-11 h-11 rounded-xl text-base',
                  engravingSpecs.colors === num && 'shadow-lg shadow-primary/20'
                )}
              >
                {num}
              </Button>
            ))}
          </div>
          
          {/* Slider */}
          <div className="space-y-3">
            <Slider
              value={[engravingSpecs.colors]}
              min={1}
              max={maxColorsForLocation}
              step={1}
              onValueChange={([value]) => wizard.updateSpecs({ colors: value })}
              className="py-2"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">1</span>
              <span className="font-bold text-lg text-primary">
                {engravingSpecs.colors} {engravingSpecs.colors === 1 ? 'cor' : 'cores'}
              </span>
              <span className="text-xs text-muted-foreground">{maxColorsForLocation}</span>
            </div>
          </div>
        </motion.div>

        {/* Size */}
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
              <span className="font-bold text-primary">{engravingSpecs.width}cm</span>
            </div>
            <Slider
              value={[engravingSpecs.width]}
              min={1}
              max={maxWidth}
              step={0.5}
              onValueChange={([value]) => wizard.updateSpecs({ width: value })}
            />
          </div>

          {/* Height */}
          <div className="space-y-3 mb-5">
            <div className="flex justify-between text-sm">
              <Label className="font-medium">Altura</Label>
              <span className="font-bold text-primary">{engravingSpecs.height}cm</span>
            </div>
            <Slider
              value={[engravingSpecs.height]}
              min={1}
              max={maxHeight}
              step={0.5}
              onValueChange={([value]) => wizard.updateSpecs({ height: value })}
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
          Voltar
        </Button>
        <Button
          disabled={wizard.isCalculating || areaExceeded}
          onClick={handleCompare}
          size="lg"
          className="gap-3 min-w-[220px] h-14 rounded-xl shadow-lg shadow-primary/25 text-base"
        >
          {wizard.isCalculating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Calculando...
            </>
          ) : (
            <>
              <BarChart3 className="h-5 w-5" />
              Comparar Técnicas
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
