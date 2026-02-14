/**
 * StepSpecs - Passo 3: Especificações da Gravação (v6)
 * 
 * Configura: cores (se cobra_por_cor), tamanho (se usa_dimensao)
 * Campos condicionais baseados nos dados v6 das técnicas disponíveis.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Info,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepSpecsProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepSpecs({ wizard }: StepSpecsProps) {
  const { selectedLocation, engravingSpecs } = wizard;

  // v6: Analyze techniques to determine which fields to show
  const techniques = selectedLocation?.availableTechniques || [];
  
  const { anyUsaDimensao, anyCobraPorCor, maxColors, maxWidth, maxHeight } = useMemo(() => {
    if (!techniques.length) {
      return { anyUsaDimensao: true, anyCobraPorCor: true, maxColors: 3, maxWidth: 50, maxHeight: 50 };
    }
    const anyUsaDimensao = techniques.some(t => t.usaDimensao !== false);
    const anyCobraPorCor = techniques.some(t => t.cobraPorCor === true);
    
    const colorTechniques = techniques.filter(t => t.cobraPorCor === true);
    const maxColors = colorTechniques.length > 0
      ? Math.max(...colorTechniques.map(t => t.maxColors || 3))
      : 1;

    const dimTechniques = techniques.filter(t => t.usaDimensao !== false);
    const maxWidth = dimTechniques.length > 0
      ? Math.max(...dimTechniques.map(t => t.efetivaLarguraMax || t.areaMaxWidth || selectedLocation?.maxWidthCm || 50))
      : selectedLocation?.maxWidthCm || 50;
    
    const maxHeight = dimTechniques.length > 0
      ? Math.max(...dimTechniques.map(t => t.efetivaAlturaMax || t.areaMaxHeight || selectedLocation?.maxHeightCm || 50))
      : selectedLocation?.maxHeightCm || 50;

    return { anyUsaDimensao, anyCobraPorCor, maxColors, maxWidth, maxHeight };
  }, [techniques, selectedLocation]);

  const currentArea = engravingSpecs.width * engravingSpecs.height;
  const maxArea = selectedLocation?.maxAreaCm2 || maxWidth * maxHeight;
  const areaExceeded = anyUsaDimensao && currentArea > maxArea;

  // Count how many techniques will be filtered by current specs
  const compatibleCount = useMemo(() => {
    return techniques.filter(t => {
      if (t.cobraPorCor && t.maxColors !== null && t.maxColors > 0 && engravingSpecs.colors > t.maxColors) {
        return false;
      }
      return true;
    }).length;
  }, [techniques, engravingSpecs.colors]);

  if (!selectedLocation) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Selecione um local de gravação primeiro.</p>
      </div>
    );
  }

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
          <p className="text-muted-foreground">
            {techniques.length} {techniques.length === 1 ? 'técnica disponível' : 'técnicas disponíveis'} neste local
          </p>
        </div>
      </div>

      {/* Specs Cards */}
      <div className={cn(
        "grid gap-6 max-w-3xl",
        anyUsaDimensao && anyCobraPorCor ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
      )}>
        {/* Colors - Only if any technique charges by color */}
        {anyCobraPorCor ? (
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
                <h4 className="font-bold text-lg">Nº de Cores</h4>
              </div>
              <Badge variant="outline" className="text-xs">Máx {maxColors}</Badge>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: maxColors }, (_, i) => i + 1).map(num => (
                <Button
                  key={num}
                  variant={engravingSpecs.colors === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => wizard.updateSpecs({ colors: num })}
                  className={cn(
                    'h-12 px-5 rounded-xl text-sm font-bold',
                    engravingSpecs.colors === num && 'shadow-lg shadow-primary/20'
                  )}
                >
                  {num} {num === 1 ? 'cor' : 'cores'}
                </Button>
              ))}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              {engravingSpecs.colors === 1 
                ? '1 cor de gravação' 
                : `${engravingSpecs.colors} cores com desconto progressivo`
              }
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-3xl bg-card border shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <h4 className="font-bold text-lg">Cores</h4>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Full Color — todas as técnicas neste local são de impressão digital (sem limite de cores)</span>
            </div>
          </motion.div>
        )}

        {/* Size - Only if any technique uses dimensions */}
        {anyUsaDimensao && (
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
            <div className="space-y-2 mb-5">
              <div className="flex justify-between items-center text-sm">
                <Label className="font-medium">Largura</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => wizard.updateSpecs({ width: Math.max(0.5, engravingSpecs.width - 0.5) })}
                    disabled={engravingSpecs.width <= 0.5}
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    value={engravingSpecs.width}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0.5 && v <= maxWidth) wizard.updateSpecs({ width: v });
                    }}
                    min={0.5}
                    max={maxWidth}
                    step={0.5}
                    className="w-20 h-7 text-center text-sm font-bold rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => wizard.updateSpecs({ width: Math.min(maxWidth, engravingSpecs.width + 0.5) })}
                    disabled={engravingSpecs.width >= maxWidth}
                  >
                    +
                  </Button>
                  <span className="text-xs text-muted-foreground ml-1">cm</span>
                </div>
              </div>
              <Slider
                value={[engravingSpecs.width]}
                min={0.5}
                max={maxWidth}
                step={0.5}
                onValueChange={([value]) => wizard.updateSpecs({ width: value })}
                className="opacity-60"
              />
            </div>

            {/* Height */}
            <div className="space-y-2 mb-5">
              <div className="flex justify-between items-center text-sm">
                <Label className="font-medium">Altura</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => wizard.updateSpecs({ height: Math.max(0.5, engravingSpecs.height - 0.5) })}
                    disabled={engravingSpecs.height <= 0.5}
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    value={engravingSpecs.height}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0.5 && v <= maxHeight) wizard.updateSpecs({ height: v });
                    }}
                    min={0.5}
                    max={maxHeight}
                    step={0.5}
                    className="w-20 h-7 text-center text-sm font-bold rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => wizard.updateSpecs({ height: Math.min(maxHeight, engravingSpecs.height + 0.5) })}
                    disabled={engravingSpecs.height >= maxHeight}
                  >
                    +
                  </Button>
                  <span className="text-xs text-muted-foreground ml-1">cm</span>
                </div>
              </div>
              <Slider
                value={[engravingSpecs.height]}
                min={0.5}
                max={maxHeight}
                step={0.5}
                onValueChange={([value]) => wizard.updateSpecs({ height: value })}
                className="opacity-60"
              />
            </div>

            {/* Área Máxima shortcut */}
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-4 gap-2 text-xs"
              onClick={() => wizard.updateSpecs({ width: maxWidth, height: maxHeight })}
            >
              <Ruler className="h-3 w-3" />
              Área Máxima ({maxWidth}×{maxHeight}cm)
            </Button>

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
      </div>

      {/* Compatibility info */}
      {compatibleCount < techniques.length && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-sm text-warning-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Com {engravingSpecs.colors} {engravingSpecs.colors === 1 ? 'cor' : 'cores'}, apenas {compatibleCount} de {techniques.length} técnicas serão compatíveis.
          </span>
        </div>
      )}

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
