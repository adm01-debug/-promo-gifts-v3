/**
 * CartActionsMenu - Menu colapsado com ações secundárias do carrinho.
 * Reduz a sidebar de 8 botões para 1 botão primário + 1 menu.
 */
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MoreHorizontal,
  Share2,
  Copy,
  Download,
  FileDown,
  Eraser,
  Save,
  Upload,
  Plus,
} from 'lucide-react';

interface CartActionsMenuProps {
  onShare: () => void;
  onDuplicate: () => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onSaveTemplate: () => void;
  onLoadTemplate: () => void;
  onAddProducts: () => void;
  onClear: () => void;
  canDuplicate: boolean;
}

export function CartActionsMenu({
  onShare,
  onDuplicate,
  onExportCSV,
  onExportPDF,
  onSaveTemplate,
  onLoadTemplate,
  onAddProducts,
  onClear,
  canDuplicate,
}: CartActionsMenuProps) {
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="group relative h-10 w-full gap-2.5 rounded-xl border-border/40 text-xs shadow-sm transition-all hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-md"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-500 group-hover:rotate-90 group-hover:text-primary" />
                <span className="font-semibold text-muted-foreground transition-colors group-hover:text-primary">
                  Gerenciar Carrinho
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
            Exportar, duplicar, templates e limpar carrinho
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onAddProducts}>
          <Plus className="mr-2 h-3.5 w-3.5" />
          Adicionar produtos
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="mr-2 h-3.5 w-3.5" />
          Compartilhar link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate} disabled={!canDuplicate}>
          <Copy className="mr-2 h-3.5 w-3.5" />
          Duplicar carrinho
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onExportCSV}>
          <Download className="mr-2 h-3.5 w-3.5" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF}>
          <FileDown className="mr-2 h-3.5 w-3.5" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSaveTemplate}>
          <Save className="mr-2 h-3.5 w-3.5" />
          Salvar como template
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLoadTemplate}>
          <Upload className="mr-2 h-3.5 w-3.5" />
          Carregar template
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onClear} className="text-destructive focus:text-destructive">
          <Eraser className="mr-2 h-3.5 w-3.5" />
          Limpar carrinho
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
