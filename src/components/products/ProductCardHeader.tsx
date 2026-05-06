import { Building2 } from 'lucide-react';
import { GenderBadge } from './GenderBadge';
import { getSupplierColors } from '@/lib/supplier-colors';
import { cn } from '@/lib/utils';
import type { Product } from '@/hooks/useProducts';

interface ProductCardHeaderProps {
  product: Product;
}

export function ProductCardHeader({ product }: ProductCardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate font-mono text-[10px] text-muted-foreground sm:text-xs">
        {product.sku}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <GenderBadge gender={product.gender} size="sm" />
        <span className="flex max-w-[120px] items-center gap-1 truncate rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground sm:px-2 sm:text-xs">
          <Building2
            className={cn('h-3 w-3 shrink-0', getSupplierColors(product.supplier.name).text)}
          />
          {product.supplier.name}
        </span>
      </div>
    </div>
  );
}
