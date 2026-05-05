import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BookmarkPlus } from "lucide-react";
import { type QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import { QuoteTemplateForm } from "./QuoteTemplateForm";

interface SaveAsTemplateButtonProps {
  items: QuoteTemplateItem[];
  discountPercent?: number;
  discountAmount?: number;
  notes?: string;
  internalNotes?: string;
  trigger?: React.ReactNode;
  onSaved?: () => void;
}

export function SaveAsTemplateButton({
  items,
  discountPercent = 0,
  discountAmount = 0,
  notes = "",
  internalNotes = "",
  trigger,
  onSaved,
}: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    setOpen(false);
    onSaved?.();
  };

  const initialTemplate = {
    name: "",
    description: "",
    is_default: false,
    items_data: items,
    discount_percent: discountPercent,
    discount_amount: discountAmount,
    notes,
    internal_notes: internalNotes,
    validity_days: 30,
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <TooltipProvider delayDuration={1500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                  Salvar como Template
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Transformar este orçamento em um modelo para uso futuro</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Salve este orçamento como um template reutilizável
          </DialogDescription>
        </DialogHeader>
        <QuoteTemplateForm
          initialItems={items}
          onSave={handleSave}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
