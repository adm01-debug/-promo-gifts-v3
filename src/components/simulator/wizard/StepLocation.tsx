/**
 * StepLocation - Passo 2: Seleção do Local de Gravação
 * 
 * Design: Cards elegantes com visual hierárquico premium
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
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepLocationProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepLocation({ wizard }: StepLocationProps) {
  // Usa locais filtrados (exclui locais já usados em personalizações)
  const { availableLocationsFiltered, selectedLocation, locationsLoading, personalizations } = wizard;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
          <div>
            <p className="font-bold">{wizard.selectedProduct?.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {wizard.quantity} unidades
              </Badge>
              <span className="text-sm text-primary font-semibold">
                {formatCurrency(wizard.effectivePrice * wizard.quantity)}
              </span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={wizard.previousStep} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Alterar
        </Button>
      </motion.div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Onde personalizar?</h3>
          <p className="text-muted-foreground">Escolha a área de aplicação</p>
        </div>
      </div>

      {/* Locations Grid */}
      {locationsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : availableLocationsFiltered.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="p-5 rounded-full bg-primary/10 mb-5">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <p className="font-bold text-xl mb-2">
            {personalizations.length > 0 
              ? 'Todos os locais já foram personalizados!' 
              : 'Nenhum local configurado'}
          </p>
          <p className="text-muted-foreground max-w-md">
            {personalizations.length > 0 
              ? `Você já configurou ${personalizations.length} personalização(ões). Finalize a simulação ou remova uma gravação existente.`
              : 'Este produto não possui áreas de personalização cadastradas no sistema.'}
          </p>
          {personalizations.length > 0 ? (
            <Button 
              className="mt-6 gap-2" 
              onClick={() => wizard.setStep('comparison')}
            >
              <CheckCircle2 className="h-4 w-4" />
              Ver Resultado Final
            </Button>
          ) : (
            <Button variant="outline" className="mt-6 gap-2" onClick={wizard.previousStep}>
              <ChevronLeft className="h-4 w-4" />
              Escolher outro produto
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence mode="popLayout">
            {availableLocationsFiltered.map((location, idx) => {
              const isSelected = selectedLocation?.id === location.id;
              
              return (
                <motion.button
                  key={location.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => wizard.selectLocation(location)}
                  className={cn(
                    'w-full p-6 rounded-2xl text-left transition-all duration-300 group',
                    isSelected
                      ? 'bg-primary/5 ring-2 ring-primary shadow-xl shadow-primary/10'
                      : 'bg-card border hover:border-primary/30 hover:shadow-lg'
                  )}
                >
                  <div className="flex items-start gap-5">
                    {/* Icon / Image */}
                    <div className={cn(
                      'w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all',
                      isSelected 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                        : 'bg-muted group-hover:bg-primary/10'
                    )}>
                      {location.areaImageUrl ? (
                        <img
                          src={location.areaImageUrl}
                          alt={location.locationName}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <MapPin className="h-6 w-6" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="font-bold text-lg">{location.componentName}</h4>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                      </div>
                      
                      <Badge variant="secondary" className="text-xs font-normal mb-3">
                        {location.locationName}
                      </Badge>

                      {/* Dimensions */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <span className="flex items-center gap-1.5">
                          <Ruler className="h-4 w-4" />
                          {location.maxWidthCm || '–'}×{location.maxHeightCm || '–'}cm
                        </span>
                        {location.maxAreaCm2 && (
                          <span className="flex items-center gap-1.5">
                            <Maximize2 className="h-4 w-4" />
                            {location.maxAreaCm2}cm²
                          </span>
                        )}
                      </div>

                      {/* Techniques */}
                      <div className="flex flex-wrap gap-1.5">
                        {location.availableTechniques.slice(0, 3).map(tech => (
                          <Badge
                            key={tech.id}
                            variant="outline"
                            className="text-[10px] h-6 gap-1 font-normal"
                          >
                            <Palette className="h-3 w-3" />
                            {tech.techniqueName}
                          </Badge>
                        ))}
                        {location.availableTechniques.length > 3 && (
                          <Badge variant="outline" className="text-[10px] h-6">
                            +{location.availableTechniques.length - 3}
                          </Badge>
                        )}
                      </div>

                      {location.isFromGroup && (
                        <Badge variant="secondary" className="mt-3 text-[10px] gap-1">
                          <Layers className="h-3 w-3" />
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
          disabled={!wizard.canProceed}
          onClick={wizard.nextStep}
          size="lg"
          className="gap-2 min-w-[180px] rounded-xl shadow-lg shadow-primary/20"
        >
          Configurar Especificações
          <ChevronRight className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}
