import { useState, useMemo } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Package, 
  Clock, 
  Truck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  ChevronLeft,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  ProductStockSummary, 
  VariantStock, 
  StockStatus,
} from '@/types/stock';

// ============================================
// CONFIGURAÇÕES DE STATUS
// ============================================

const STATUS_CONFIG: Record<StockStatus, { 
  label: string; 
  color: string; 
  bgColor: string;
  icon: React.ReactNode;
}> = {
  in_stock: { 
    label: 'Em Estoque', 
    color: 'text-success',
    bgColor: 'bg-success/10 border-success/20',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  low_stock: { 
    label: 'Baixo', 
    color: 'text-warning',
    bgColor: 'bg-warning/10 border-warning/20',
    icon: <TrendingDown className="h-4 w-4" />
  },
  critical: { 
    label: 'Crítico', 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 border-destructive/20',
    icon: <AlertTriangle className="h-4 w-4" />
  },
  out_of_stock: { 
    label: 'Esgotado', 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 border-destructive/20',
    icon: <XCircle className="h-4 w-4" />
  },
  overstocked: { 
    label: 'Excesso', 
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/20',
    icon: <TrendingUp className="h-4 w-4" />
  },
  incoming: { 
    label: 'Chegando', 
    color: 'text-primary/80',
    bgColor: 'bg-primary/10 border-primary/15',
    icon: <Truck className="h-4 w-4" />
  },
};

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function StockStatusBadge({ status }: { status: StockStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant="outline" className={cn("gap-1", config.bgColor, config.color)}>
      {config.icon}
      <span className="hidden sm:inline">{config.label}</span>
    </Badge>
  );
}

function ColorSwatch({ hex, name }: { hex?: string; name?: string }) {
  return (
    <div className="flex items-center gap-2">
      {hex ? (
        <div 
          className="h-5 w-5 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: hex }}
          title={name}
        />
      ) : (
        <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/50" />
      )}
      <span className="text-sm">{name || 'Sem cor'}</span>
    </div>
  );
}

function StockProgressBar({ current, min }: { current: number; min: number; max?: number }) {
  const percentage = min > 0 ? Math.min((current / min) * 100, 100) : (current > 0 ? 100 : 0);
  
  const progressColor = 
    current <= 0 ? 'bg-destructive' :
    current <= min * 0.25 ? 'bg-destructive' :
    current <= min ? 'bg-warning' :
    'bg-success';
  
  return (
    <div className="w-24">
      <Progress 
        value={percentage} 
        className={cn("h-2", progressColor)} 
      />
    </div>
  );
}

// ============================================
// LINHA DE VARIANTE (COR/TAMANHO)
// ============================================

function VariantRow({ variant, isNested = false }: { variant: VariantStock; isNested?: boolean }) {
  return (
    <TableRow className={cn(isNested && "bg-muted/30")}>
      <TableCell className={cn(isNested && "pl-12")}>
        <ColorSwatch hex={variant.colorHex} name={variant.colorName} />
      </TableCell>
      <TableCell>
        <span className="text-xs font-mono text-muted-foreground">
          {variant.variantSku}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-semibold",
            variant.currentStock <= 0 ? "text-destructive" :
            variant.currentStock <= variant.minStock * 0.25 ? "text-destructive" :
            variant.currentStock <= variant.minStock ? "text-warning" :
            "text-foreground"
          )}>
            {variant.currentStock}
          </span>
          <span className="text-xs text-muted-foreground">
            / {variant.minStock} mín
          </span>
        </div>
      </TableCell>
      <TableCell>
        <StockProgressBar current={variant.currentStock} min={variant.minStock} max={variant.maxStock} />
      </TableCell>
      <TableCell>
        {variant.reservedStock > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm text-warning">-{variant.reservedStock}</span>
              </TooltipTrigger>
              <TooltipContent><p>{variant.reservedStock} unidades reservadas em pedidos</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <span className={cn("font-medium", variant.availableStock <= 0 ? "text-destructive" : "text-foreground")}>
          {variant.availableStock}
        </span>
      </TableCell>
      <TableCell>
        {variant.inTransitStock > 0 ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm text-primary/80 flex items-center gap-1">
                  <Truck className="h-3 w-3" />+{variant.inTransitStock}
                </span>
              </TooltipTrigger>
              <TooltipContent><p>{variant.inTransitStock} unidades em trânsito</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell><StockStatusBadge status={variant.status} /></TableCell>
      <TableCell>
        {variant.daysUntilStockout !== undefined ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={cn(
                  "flex items-center gap-1 text-sm",
                  variant.daysUntilStockout <= 7 ? "text-destructive" :
                  variant.daysUntilStockout <= 14 ? "text-warning" :
                  "text-muted-foreground"
                )}>
                  <Clock className="h-3 w-3" />{variant.daysUntilStockout}d
                </div>
              </TooltipTrigger>
              <TooltipContent><p>Previsão de esgotamento em {variant.daysUntilStockout} dias</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ============================================
// LINHA DO PRODUTO (EXPANSÍVEL)
// ============================================

function ProductRow({ product, isExpanded, onToggle }: {
  product: ProductStockSummary;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow 
        className={cn("cursor-pointer hover:bg-muted/50 transition-colors", isExpanded && "bg-muted/30")}
        onClick={onToggle}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={isExpanded ? `Recolher ${product.productName}` : `Expandir ${product.productName}`} className="h-6 w-6">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div className="flex flex-col">
              <span className="font-medium truncate max-w-[200px]">{product.productName}</span>
              <span className="text-xs text-muted-foreground">
                {product.productSku} • {product.totalVariants} {product.totalVariants === 1 ? 'variação' : 'variações'}
              </span>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex gap-1 flex-wrap">
            {product.availableColors.slice(0, 5).map((color, idx) => (
              <TooltipProvider key={idx}>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      className={cn("h-5 w-5 rounded-full border shadow-sm", color.status === 'out_of_stock' && "opacity-30")}
                      style={{ backgroundColor: color.colorHex || '#ccc' }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{color.colorName}: {color.totalStock} un ({STATUS_CONFIG[color.status].label})</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            {product.availableColors.length > 5 && (
              <span className="text-xs text-muted-foreground ml-1">+{product.availableColors.length - 5}</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{product.totalCurrentStock}</span>
            <span className="text-xs text-muted-foreground">/ {product.totalMinStock} mín</span>
          </div>
        </TableCell>
        <TableCell><StockProgressBar current={product.totalCurrentStock} min={product.totalMinStock} /></TableCell>
        <TableCell>
          {product.totalReservedStock > 0 ? <span className="text-sm text-warning">-{product.totalReservedStock}</span> : '-'}
        </TableCell>
        <TableCell><span className="font-medium">{product.totalAvailableStock}</span></TableCell>
        <TableCell>
          {product.totalInTransitStock > 0 ? (
            <span className="text-sm text-primary/80 flex items-center gap-1">
              <Truck className="h-3 w-3" />+{product.totalInTransitStock}
            </span>
          ) : '-'}
        </TableCell>
        <TableCell><StockStatusBadge status={product.overallStatus} /></TableCell>
        <TableCell>
          <div className="flex gap-1">
            {product.variantsCritical > 0 && (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                {product.variantsCritical} crítico
              </Badge>
            )}
            {product.variantsOutOfStock > 0 && (
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                {product.variantsOutOfStock} esgotado
              </Badge>
            )}
          </div>
        </TableCell>
      </TableRow>
      
      {isExpanded && product.variants.map(variant => (
        <VariantRow key={variant.id} variant={variant} isNested />
      ))}
    </>
  );
}

// ============================================
// PAGINAÇÃO
// ============================================

const PAGE_SIZE = 50;

// ============================================
// TABELA PRINCIPAL
// ============================================

interface VariantStockTableProps {
  products: ProductStockSummary[];
  className?: string;
}

export function VariantStockTable({ products, className }: VariantStockTableProps) {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  
  // Reset page when products change (e.g. filter applied)
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages - 1);
  if (safePage !== currentPage) setCurrentPage(safePage);

  const paginatedProducts = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return products.slice(start, start + PAGE_SIZE);
  }, [products, safePage]);

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };
  
  const expandAll = () => setExpandedProducts(new Set(paginatedProducts.map(p => p.productId)));
  const collapseAll = () => setExpandedProducts(new Set());
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        {/* Pagination info */}
        <div className="text-xs text-muted-foreground">
          {products.length > PAGE_SIZE ? (
            <>
              Mostrando {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, products.length)} de {products.length} produtos
            </>
          ) : (
            <>{products.length} produtos</>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>Expandir Todos</Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>Recolher Todos</Button>
        </div>
      </div>
      
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Produto / Cor</TableHead>
              <TableHead className="w-[150px]">Cores</TableHead>
              <TableHead>Estoque</TableHead>
              <TableHead className="w-[100px]">Nível</TableHead>
              <TableHead>Reservado</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead>Em Trânsito</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Alertas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length > 0 ? (
              paginatedProducts.map(product => (
                <ProductRow 
                  key={product.productId}
                  product={product}
                  isExpanded={expandedProducts.has(product.productId)}
                  onToggle={() => toggleProduct(product.productId)}
                />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhum produto encontrado</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (safePage < 3) {
                pageNum = i;
              } else if (safePage > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = safePage - 3 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === safePage ? "default" : "ghost"}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="gap-1"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default VariantStockTable;
