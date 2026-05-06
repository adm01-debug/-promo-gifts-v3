import { Save, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuoteFloatingActionsProps {
  isDraftValid: boolean;
  isFormValid: boolean;
  isEditMode: boolean;
  quotesLoading: boolean;
  isDiscountExceeded: boolean;
  handleSaveQuote: (status: 'draft' | 'pending' | 'pending_approval') => void;
}

export function QuoteFloatingActions({
  isDraftValid,
  isFormValid,
  isEditMode,
  quotesLoading,
  isDiscountExceeded,
  handleSaveQuote,
}: QuoteFloatingActionsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 p-4 backdrop-blur-md md:static md:mt-6 md:border-none md:bg-transparent md:p-0 md:backdrop-blur-none">
      <div className="mx-auto flex max-w-[1920px] items-center justify-end gap-3 px-4 md:px-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => handleSaveQuote('draft')}
                disabled={!isDraftValid || quotesLoading}
                className="group border-primary/20 hover:border-primary/40"
              >
                {quotesLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Rascunho
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-muted text-foreground border">
              Salva o progresso atual sem oficializar o orçamento
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => handleSaveQuote(isDiscountExceeded ? 'pending_approval' : 'pending')}
                disabled={!isFormValid || quotesLoading}
                className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {quotesLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isEditMode ? 'Atualizar Orçamento' : isDiscountExceeded ? 'Solicitar Aprovação' : 'Finalizar Orçamento'}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-primary text-primary-foreground border-none">
              {isDiscountExceeded 
                ? 'Este orçamento requer aprovação devido ao desconto aplicado' 
                : 'Concluir e gerar documento final'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
