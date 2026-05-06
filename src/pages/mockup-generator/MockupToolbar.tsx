/**
 * MockupToolbar — Extracted undo/redo/save status bar from MockupGenerator
 */
import { Loader2, Undo2, Redo2, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MockupToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isDraftSaving: boolean;
  lastSaved: Date | null;
  draftError: string | null;
}

export function MockupToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isDraftSaving,
  lastSaved,
  draftError,
}: MockupToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Desfazer"
                className="h-8 w-8"
                disabled={!canUndo}
                onClick={onUndo}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
            Desfazer (Ctrl+Z)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Refazer"
                className="h-8 w-8"
                disabled={!canRedo}
                onClick={onRedo}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
            Refazer (Ctrl+Shift+Z)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="ml-1">
        {isDraftSaving ? (
          <Badge variant="secondary" className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Salvando...
          </Badge>
        ) : lastSaved ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Badge variant="outline" className="flex cursor-default items-center gap-1.5">
                    <Cloud className="h-3 w-3 text-success" />
                    Salvo
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                Último salvamento: {format(lastSaved, 'HH:mm:ss', { locale: ptBR })}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : draftError ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Badge variant="destructive" className="flex cursor-default items-center gap-1.5">
                    <CloudOff className="h-3 w-3" />
                    Erro ao salvar
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                {draftError}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </div>
    </div>
  );
}
