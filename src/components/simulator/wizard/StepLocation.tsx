/**
 * StepLocation - Passo 2: Seleção do Local de Gravação
 * 
 * Design: Cards limpos, visual hierárquico
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MapPin, 
  Ruler, 
  Maximize2, 
  Palette,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepLocationProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepLocation({ wizard }: StepLocationProps) {
  const { availableLocations, selectedLocation, locationsLoading } = wizard;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Context Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-background overflow-hidden">
            {wizard.selectedProduct?.imageUrl ? (
              <img 
                src={wizard.selectedProduct.imageUrl} 
                alt={wizard.selectedProduct.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">{wizard.selectedProduct?.name}</p>
            <p className="text-xs text-muted-foreground">
              {wizard.quantity} unidades
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={wizard.previousStep}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Alterar
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Onde gravar?</h3>
          <p className="text-sm text-muted-foreground">Escolha o local de personalização</p>
        </div>
      </div>

      {/* Locations Grid */}
      {locationsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : availableLocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mb-4 text-warning/60" />
          <p className="font-medium text-lg">Nenhum local configurado</p>
          <p className="text-sm mt-1 text-center max-w-md">
            Este produto não possui áreas de personalização cadastradas.
          </p>
          <Button variant="outline" className="mt-6" onClick={wizard.previousStep}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Escolher outro produto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {availableLocations.map((location, idx) => {
              const isSelected = selectedLocation?.id === location.id;
              
              return (
                <motion.button
                  key={location.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => wizard.selectLocation(location)}
                  className={cn(
                    'w-full p-5 rounded-2xl text-left transition-all duration-200',
                    'border-2',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-transparent bg-muted/40 hover:bg-muted/70 hover:border-muted'
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-background'
                    )}>
                      {location.areaImageUrl ? (
                        <img
                          src={location.areaImageUrl}
                          alt={location.locationName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <MapPin className="h-5 w-5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{location.componentName}</h4>
                        <Badge variant="outline" className="text-xs font-normal">
                          {location.locationName}
                        </Badge>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />
                        )}
                      </div>

                      {/* Dimensions */}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Ruler className="h-3.5 w-3.5" />
                          {location.maxWidthCm || '–'}×{location.maxHeightCm || '–'}cm
                        </span>
                        {location.maxAreaCm2 && (
                          <span className="flex items-center gap-1">
                            <Maximize2 className="h-3.5 w-3.5" />
                            {location.maxAreaCm2}cm²
                          </span>
                        )}
                      </div>

                      {/* Techniques */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {location.availableTechniques.slice(0, 3).map(tech => (
                          <Badge
                            key={tech.id}
                            variant="secondary"
                            className="text-[10px] h-5 gap-1 font-normal"
                          >
                            <Palette className="h-2.5 w-2.5" />
                            {tech.techniqueName}
                          </Badge>
                        ))}
                        {location.availableTechniques.length > 3 && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            +{location.availableTechniques.length - 3}
                          </Badge>
                        )}
                      </div>

                      {location.isFromGroup && (
                        <Badge variant="outline" className="mt-2 text-[10px] gap-1">
                          <Layers className="h-2.5 w-2.5" />
                          Regra de Grupo
                        </Badge>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={wizard.previousStep}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          disabled={!wizard.canProceed}
          onClick={wizard.nextStep}
          className="gap-2"
        >
          Escolher Técnica
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
