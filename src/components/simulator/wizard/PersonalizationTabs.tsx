/**
 * PersonalizationTabs - Abas para alternar entre personalizações
 * 
 * Permite visualizar/editar cada gravação e adicionar novas
 */

import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface PersonalizationTabsProps {
  wizard: UseSimulatorWizardReturn;
  onAddNew: () => void;
}

export function PersonalizationTabs({ wizard, onAddNew }: PersonalizationTabsProps) {
  const { 
    personalizations, 
    currentPersonalizationIndex, 
    isEditingPersonalization,
    editPersonalization,
    removePersonalization,
    selectedLocation,
    currentStep,
    hasAvailableLocations,
  } = wizard;

  // Determina se estamos criando uma nova personalização (não editando existente)
  const isCreatingNew = !isEditingPersonalization && (
    currentStep === 'location' || 
    currentStep === 'technique' || 
    currentStep === 'configuration'
  );

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {/* Abas das personalizações existentes */}
      {personalizations.map((pers, idx) => (
        <motion.div
          key={pers.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <Button
            variant={isEditingPersonalization && currentPersonalizationIndex === idx ? 'default' : 'outline'}
            size="sm"
            className="gap-2 pr-8"
            onClick={() => editPersonalization(idx)}
          >
            <span className="font-bold">{idx + 1}.</span>
            <span className="truncate max-w-[120px]">
              {pers.location.locationName}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              removePersonalization(pers.id);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </motion.div>
      ))}

      {/* Aba da nova personalização em edição */}
      {isCreatingNew && (
        <Button
          variant="default"
          size="sm"
          className="gap-1 uppercase text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          {selectedLocation ? selectedLocation.locationName : 'Personalização'}
        </Button>
      )}

      {/* Botão adicionar nova - só mostra se há locais disponíveis e não está criando */}
      {personalizations.length > 0 && !isCreatingNew && hasAvailableLocations && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-primary shrink-0 uppercase text-xs font-semibold"
          onClick={onAddNew}
        >
          <Plus className="h-4 w-4" />
          Personalização
        </Button>
      )}
    </div>
  );
}
