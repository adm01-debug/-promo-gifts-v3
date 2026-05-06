import { PriceFreshnessBadge } from './PriceFreshnessBadge';
import type { Product } from '@/hooks/useProducts';
import { formatCurrency } from '@/lib/utils'; // Assuming this exists or using a local helper

interface ProductCardPriceProps {
  product: Product;
  displayStock: number;
  displayStatus: string;
}

export function ProductCardPrice({ product, displayStock, displayStatus }: ProductCardPriceProps) {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div className="flex items-end justify-between pt-0.5 sm:pt-1">
      <div>
        <p className="mb-0.5 text-[10px] text-muted-foreground sm:text-xs">A partir de</p>
        <span className="inline-flex items-center gap-1.5 font-display text-base font-bold text-foreground sm:text-xl">
          {formatPrice(product.price)}
          <PriceFreshnessBadge
            priceUpdatedAt={product.priceUpdatedAt}
            thresholdDays={product.priceFreshnessThresholdDays}
            variant="icon-only"
          />
        </span>
      </div>
      <div className="text-right">
        <p className="mb-0.5 text-[10px] text-muted-foreground sm:text-xs">Estoque</p>
        <div className="flex flex-col items-end">
          <span className="font-display text-sm font-bold text-foreground sm:text-base">
            {displayStock.toLocaleString('pt-BR')}
          </span>
          <span className={`text-[9px] font-medium uppercase tracking-wider sm:text-[10px] ${
            displayStatus === 'out-of-stock' ? 'text-destructive' : 
            displayStatus === 'low-stock' ? 'text-amber-500' : 'text-emerald-500'
          }`}>
            {displayStatus === 'out-of-stock' ? 'Sem estoque' : 
             displayStatus === 'low-stock' ? 'Estoque baixo' : 'Em estoque'}
          </span>
        </div>
      </div>
    </div>
  );
}
