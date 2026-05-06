import { Edit, FileText, ArrowLeft, BookTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QuoteTemplateSelector } from '@/components/quotes/QuoteTemplateSelector';
import { SaveAsTemplateButton } from '@/components/quotes/SaveAsTemplateButton';

interface QuoteBuilderHeaderProps {
  isEditMode: boolean;
  quoteId?: string;
  quoteNumber?: string;
  templates: any[];
  items: any[];
  discountType: 'percent' | 'amount';
  discountValue: number;
  notes: string;
  internalNotes: string;
  applyTemplate: (template: any) => void;
  getTemplateItems: () => any[];
  navigate: (to: any) => void;
  guardNavigation: (action: () => void) => void;
}

export function QuoteBuilderHeader({
  isEditMode,
  quoteId,
  quoteNumber,
  templates,
  items,
  discountType,
  discountValue,
  notes,
  internalNotes,
  applyTemplate,
  getTemplateItems,
  navigate,
  guardNavigation,
}: QuoteBuilderHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Voltar"
                onClick={() => guardNavigation(() => navigate(-1))}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
              Voltar para a página anterior
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div>
          <h1 className="flex items-center gap-3 font-display text-2xl font-bold text-foreground">
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-2">
              {isEditMode ? <Edit className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />}
            </div>
            {isEditMode ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {isEditMode && quoteNumber ? (
              <>Editando: <strong>{quoteNumber}</strong></>
            ) : (
              'Crie um orçamento com produtos e personalizações'
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isEditMode && (
          <QuoteTemplateSelector
            onSelectTemplate={applyTemplate}
            trigger={
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      <BookTemplate className="mr-2 h-4 w-4" />
                      Usar Template
                      {templates.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {templates.length}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                    Carregar configurações de um orçamento salvo anteriormente
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            }
          />
        )}
        {items.length > 0 && (
          <SaveAsTemplateButton
            items={getTemplateItems()}
            discountPercent={discountType === 'percent' ? discountValue : 0}
            discountAmount={discountType === 'amount' ? discountValue : 0}
            notes={notes}
            internalNotes={internalNotes}
          />
        )}
      </div>
    </div>
  );
}
