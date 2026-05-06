import { useNavigate } from 'react-router-dom';
import { Building2, CalendarClock, GitCompare, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getSupplierColors } from '@/lib/supplier-colors';
import { useComparisonStore } from '@/stores/useComparisonStore';
import { toast } from 'sonner';

interface ProductInfoBarProps {
  sku: string;
  supplierName: string;
  supplierId?: string;
  productId?: string;
  productName?: string;
  onOpenFutureStock: () => void;
  onOpenSupplierComparison: () => void;
  hasFutureStock?: boolean;
}

export function ProductInfoBar({
  sku,
  supplierName,
  supplierId,
  productId,
  productName,
  onOpenFutureStock,
  onOpenSupplierComparison,
  hasFutureStock = true,
}: ProductInfoBarProps) {
  const navigate = useNavigate();
  const { addToCompare, isInCompare, compareCount } = useComparisonStore();

  const handleSupplierClick = () => {
    if (supplierId) {
      navigate(`/filtros?supplier=${supplierId}`);
    }
  };

  const handleToggleCompare = () => {
    if (!productId) return;
    const added = addToCompare(productId);
    if (added) {
      toast.success(`${productName || 'Produto'} adicionado ao comparador`, {
        action: {
          label: 'Ver agora',
          onClick: () => navigate('/comparar'),
        },
      });
    } else {
      if (isInCompare(productId)) {
        toast.info('Produto já está na lista de comparação');
      } else {
        toast.error('Limite de produtos atingido (máx 12)');
      }
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* SKU */}
      <Badge
        variant="secondary"
        className="rounded-full bg-muted px-3 py-1.5 font-mono text-xs hover:bg-muted"
      >
        SKU: {sku}
      </Badge>

      {/* Fornecedor - Clicável, abre Super Filtro com esse fornecedor */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'group/supplier rounded-full border-border bg-card px-3 py-1.5 text-xs font-medium transition-all duration-200 hover:scale-[1.02]',
              supplierId && 'cursor-pointer',
            )}
            style={{
              ['--supplier-color' as string]: getSupplierColors(supplierName).hex,
            }}
            onClick={handleSupplierClick}
          >
            <Building2
              className={cn(
                'mr-1.5 h-3.5 w-3.5 transition-colors',
                getSupplierColors(supplierName).text,
              )}
            />
            <span className="transition-colors group-hover/supplier:text-[var(--supplier-color)]">
              {supplierName}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Ver todos os produtos de {supplierName}</TooltipContent>
      </Tooltip>

      {/* Estoque Futuro */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFutureStock}
            className="h-8 gap-1.5 rounded-full px-3 text-xs hover:border-orange/50 hover:bg-orange/5"
          >
            <CalendarClock className="h-3.5 w-3.5 text-orange" />
            Estoque Futuro
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ver previsão de reposição de estoque</TooltipContent>
      </Tooltip>

      {/* Comparar Fornecedores */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSupplierComparison}
            className="h-8 gap-1.5 rounded-full px-3 text-xs"
          >
            <GitCompare className="h-3.5 w-3.5 text-muted-foreground" />
            Comparar Fornecedores
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ver mesmo produto em outros fornecedores</TooltipContent>
      </Tooltip>
      {/* Botão Comparar Produto (Zustand Store) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={productId && isInCompare(productId) ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleCompare}
            className={cn(
              'h-8 gap-1.5 rounded-full px-3 text-xs transition-all duration-300',
              productId &&
                isInCompare(productId) &&
                'border-none bg-amber-500 shadow-md shadow-orange/20 hover:bg-amber-600',
            )}
          >
            <LayoutGrid
              className={cn(
                'h-3.5 w-3.5',
                productId && isInCompare(productId) ? 'text-white' : 'text-primary',
              )}
            />
            {productId && isInCompare(productId) ? 'No Comparador' : 'Adicionar à Arena'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {productId && isInCompare(productId)
            ? 'Produto já está na Arena de Comparação'
            : 'Enviar para comparação técnica (Score, Radar e Duelo)'}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
