/**
 * Kit Builder Bottom Nav — Barra de navegação fixa inferior
 * Extraído do KitBuilderPage para SRP
 */

import { ArrowLeft, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/kit-builder';
import type { KitState } from '@/lib/kit-builder';

interface KitBuilderBottomNavProps {
  kitState: KitState;
  currentStep: string;
  canProceed: boolean;
  nextStepLabel: string | null;
  onPrevStep: () => void;
  onNextStep: () => void;
}

export function KitBuilderBottomNav({
  kitState,
  currentStep,
  canProceed,
  nextStepLabel,
  onPrevStep,
  onNextStep,
}: KitBuilderBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-md shadow-header">
      <div className="container flex items-center justify-between py-3">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onPrevStep}
          disabled={currentStep === 'box'}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Button>

        {/* Center — Price summary */}
        <div className="hidden sm:flex items-center gap-4 text-xs">
          {kitState.box && (
            <Badge variant="outline" className="gap-1 text-[10px] font-normal">
              <Package className="h-3 w-3" />
              {kitState.box.name.length > 15 ? kitState.box.name.slice(0, 15) + '…' : kitState.box.name}
            </Badge>
          )}
          {kitState.items.length > 0 && (
            <Badge variant="outline" className="text-[10px] font-normal">
              {kitState.items.length} {kitState.items.length === 1 ? 'item' : 'itens'}
            </Badge>
          )}
          {kitState.totalPrice > 0 && (
            <span className="font-semibold text-primary tabular-nums">
              {formatCurrency(kitState.totalPrice)}
            </span>
          )}
        </div>

        {/* Next / Finish */}
        {currentStep !== 'summary' ? (
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onNextStep}
            disabled={!canProceed}
          >
            {nextStepLabel && (
              <span className="hidden sm:inline text-primary-foreground/70">{nextStepLabel}</span>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <div className="w-20" />
        )}
      </div>
    </div>
  );
}
