/**
 * StepLocation - Passo 2: Seleção do Local de Gravação
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-6">
      {/* Header com produto selecionado */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-background overflow-hidden">
                {wizard.selectedProduct?.imageUrl ? (
                  <img 
                    src={wizard.selectedProduct.imageUrl} 
                    alt={wizard.selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold">{wizard.selectedProduct?.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {wizard.selectedProduct?.sku}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {wizard.quantity} unidades
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={wizard.previousStep}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Alterar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Locations Grid */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Selecionar Local de Gravação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {locationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : availableLocations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-3 text-warning opacity-70" />
              <p className="font-medium">Nenhum local de gravação configurado</p>
              <p className="text-sm mt-1 text-center max-w-md">
                Este produto não possui áreas de personalização cadastradas. 
                Configure os componentes e locais na área de administração.
              </p>
              <Button variant="outline" className="mt-4" onClick={wizard.previousStep}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar e escolher outro produto
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
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => wizard.selectLocation(location)}
                      className={cn(
                        'w-full p-4 rounded-xl border-2 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 bg-card'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon/Image */}
                        <div className={cn(
                          'w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                          {location.areaImageUrl ? (
                            <img
                              src={location.areaImageUrl}
                              alt={location.locationName}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <MapPin className="h-6 w-6" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{location.componentName}</h4>
                            <Badge variant="outline" className="text-xs">
                              {location.locationName}
                            </Badge>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                            )}
                          </div>

                          {/* Dimensions */}
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Ruler className="h-3.5 w-3.5" />
                              {location.maxWidthCm || '–'} × {location.maxHeightCm || '–'} cm
                            </span>
                            <span className="flex items-center gap-1">
                              <Maximize2 className="h-3.5 w-3.5" />
                              {location.maxAreaCm2 || '–'} cm²
                            </span>
                          </div>

                          {/* Available Techniques */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {location.availableTechniques.slice(0, 4).map(tech => (
                              <Badge
                                key={tech.id}
                                variant="secondary"
                                className="text-[10px] h-5 gap-1"
                              >
                                {tech.techniqueName}
                                {tech.maxColors && (
                                  <span className="flex items-center gap-0.5 text-muted-foreground">
                                    <Palette className="h-2.5 w-2.5" />
                                    {tech.maxColors}
                                  </span>
                                )}
                              </Badge>
                            ))}
                            {location.availableTechniques.length > 4 && (
                              <Badge variant="outline" className="text-[10px] h-5">
                                +{location.availableTechniques.length - 4}
                              </Badge>
                            )}
                          </div>

                          {/* Group indicator */}
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
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={wizard.previousStep}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button
          disabled={!wizard.canProceed}
          onClick={wizard.nextStep}
        >
          Próximo: Selecionar Técnica
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
