/**
 * Kit Builder Header — Sub-componente sticky do header
 * Extraído do KitBuilderPage para SRP
 */

import { Package, Undo2, Redo2, Save, Loader2, Cloud, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BackButton } from '@/components/common/BackButton';
import { WizardSteps } from '@/components/kit-builder/WizardSteps';
import type { KitBuilderStep } from '@/lib/kit-builder';

interface KitBuilderHeaderProps {
  // Auto-save
  isAutoSaving: boolean;
  lastSavedAt: Date | null;
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  // Save
  isSaving: boolean;
  hasContent: boolean;
  hasExistingKit: boolean;
  onSave: () => void;
  onReset: () => void;
  // Stepper
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  onStepClick: (step: KitBuilderStep) => void;
  stepCounts: Partial<Record<KitBuilderStep, number>>;
}

export function KitBuilderHeader({
  isAutoSaving,
  lastSavedAt,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isSaving,
  hasContent,
  hasExistingKit,
  onSave,
  onReset,
  currentStep,
  completedSteps,
  onStepClick,
  stepCounts,
}: KitBuilderHeaderProps) {
  return (
    <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md shadow-header">
      <div className="container">
        {/* Top bar */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <BackButton fallbackPath="/meus-kits" className="mr-1" />
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-display font-bold tracking-tight">Montador de Kits</h1>
              <div className="flex items-center gap-2">
                {isAutoSaving ? (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Salvando...
                  </span>
                ) : lastSavedAt ? (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <Cloud className="h-2.5 w-2.5 text-success" />
                    Salvo {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">Rascunho</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo}>
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><span className="text-xs">Desfazer · Ctrl+Z</span></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo}>
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><span className="text-xs">Refazer · Ctrl+Y</span></TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-5 w-px bg-border mx-1" />

            <Button
              size="sm"
              variant="default"
              className="h-8 text-xs gap-1.5"
              onClick={onSave}
              disabled={isSaving || !hasContent}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {hasExistingKit ? 'Atualizar' : 'Salvar'}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>
        </div>

        {/* Stepper */}
        <div className="pb-3">
          <WizardSteps
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={onStepClick}
            stepCounts={stepCounts}
          />
        </div>
      </div>
    </div>
  );
}
