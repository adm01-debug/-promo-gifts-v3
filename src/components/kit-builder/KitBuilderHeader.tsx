/**
 * Kit Builder Header — 2-tier premium layout
 * Tier 1: Identity (name + status badges)
 * Tier 2: Primary actions (Save, New) + grouped secondary in dropdown
 */
import {
  Package, Save, Cloud, Loader2, RotateCcw, Undo2, Redo2, Copy, MoreHorizontal, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BackButton } from '@/components/common/BackButton';
import { KitAIPromptDialog } from '@/components/kit-builder/KitAIPromptDialog';
import { cn } from '@/lib/utils';

interface KitBuilderHeaderProps {
  kitName: string;
  onKitNameChange: (name: string) => void;
  isValid: boolean;
  isSaving: boolean;
  isAutoSaving: boolean;
  lastSavedAt: Date | null;
  hasContent: boolean;
  isExistingKit: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onDuplicate: () => void;
  onAIApply: (s: { kit_type: 'montado' | 'original' | 'simples'; box_keywords: string[] }) => void;
}

export function KitBuilderHeader({
  kitName, onKitNameChange, isValid, isSaving, isAutoSaving, lastSavedAt, hasContent, isExistingKit,
  canUndo, canRedo, onSave, onUndo, onRedo, onReset, onDuplicate, onAIApply,
}: KitBuilderHeaderProps) {
  // Morphing save icon: idle → saving → saved
  const SaveIcon = isSaving ? Loader2 : (lastSavedAt && !isAutoSaving) ? Check : Save;

  return (
    <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div className="container py-3">
        <BackButton fallbackPath="/meus-kits" className="mb-2" />

        {/* TIER 1 — Identity */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20">
            <Package className="h-5 w-5 text-primary" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              value={kitName}
              onChange={(e) => onKitNameChange(e.target.value)}
              placeholder="Kit sem nome"
              aria-label="Nome do kit"
              className={cn(
                'font-display font-bold text-2xl tracking-tight border-0 px-0 h-auto py-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                !kitName && 'italic text-muted-foreground',
              )}
            />
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
              <span>Kit Maker</span>
              {lastSavedAt && !isAutoSaving && (
                <Badge variant="outline" className="text-[10px] gap-1 h-5 border-success/40 text-success">
                  <Cloud className="h-2.5 w-2.5" />
                  Salvo {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
              {isAutoSaving && (
                <Badge variant="outline" className="text-[10px] gap-1 h-5">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Salvando…
                </Badge>
              )}
              {isValid && hasContent && !isAutoSaving && (
                <Badge className="text-[10px] gap-1 h-5 bg-success/15 text-success border-success/30 hover:bg-success/20">
                  ✓ Kit válido
                </Badge>
              )}
            </div>
          </div>

          {/* TIER 2 — Primary actions */}
          <div className="flex items-center gap-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Desfazer" disabled={!canUndo} onClick={onUndo}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Refazer" disabled={!canRedo} onClick={onRedo}>
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant={isValid && hasContent ? 'default' : 'outline'}
              onClick={onSave}
              disabled={isSaving || !hasContent}
              className="font-medium"
            >
              <SaveIcon className={cn('h-4 w-4 mr-2', isSaving && 'animate-spin')} />
              {isExistingKit ? 'Atualizar' : 'Salvar'}
            </Button>

            {/* Secondary actions grouped */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Ações rápidas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDuplicate} disabled={!hasContent}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicar kit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onReset} className="text-destructive focus:text-destructive">
                  <RotateCcw className="h-4 w-4 mr-2" /> Novo kit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden lg:block">
              <KitAIPromptDialog onApply={onAIApply} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
