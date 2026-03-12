/**
 * ProductVariantsSection — Exibe variações de cor de um produto
 * Busca variantes do banco externo via external-db-bridge
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Palette, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  color_name: string | null;
  color_hex: string | null;
  color_code: string | null;
  stock_quantity: number | null;
  selected_thumbnail: string | null;
  is_active: boolean;
}

interface ProductVariantsSectionProps {
  productId: string;
}

async function fetchProductVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'product_variants',
      operation: 'select',
      filters: { product_id: productId, is_active: true },
      limit: 200,
      orderBy: { column: 'name', ascending: true },
    },
  });

  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar variações');

  return data.data?.records || [];
}

function StockBadge({ stock }: { stock: number | null }) {
  const qty = stock ?? 0;
  if (qty === 0) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
        Sem estoque
      </Badge>
    );
  }
  if (qty < 100) {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
        {qty} un
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
      {qty >= 1000 ? `${(qty / 1000).toFixed(1)}k` : qty} un
    </Badge>
  );
}

export function ProductVariantsSection({ productId }: ProductVariantsSectionProps) {
  const { data: variants = [], isLoading, error } = useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => fetchProductVariants(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        Erro ao carregar variações
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Package className="h-4 w-4" />
        Nenhuma variação cadastrada para este produto
      </div>
    );
  }

  const totalStock = variants.reduce((sum, v) => sum + (v.stock_quantity ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{variants.length} variações</span>
        <span>•</span>
        <span>Estoque total: <span className="font-medium text-foreground">{totalStock.toLocaleString('pt-BR')} un</span></span>
      </div>

      {/* Variants grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {variants.map((variant) => (
          <div
            key={variant.id}
            className={cn(
              'flex items-center gap-2.5 rounded-lg border p-2 transition-colors',
              'hover:bg-accent/50',
              !variant.stock_quantity && 'opacity-60'
            )}
          >
            {/* Color swatch or thumbnail */}
            {variant.selected_thumbnail ? (
              <img
                src={variant.selected_thumbnail}
                alt={variant.color_name || variant.name}
                className="w-10 h-10 rounded-md object-cover border shrink-0"
              />
            ) : variant.color_hex ? (
              <div
                className="w-10 h-10 rounded-md border shrink-0"
                style={{ backgroundColor: variant.color_hex }}
                title={variant.color_name || ''}
              />
            ) : (
              <div className="w-10 h-10 rounded-md border shrink-0 bg-muted flex items-center justify-center">
                <Palette className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate" title={variant.color_name || variant.name}>
                {variant.color_name || variant.name}
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">{variant.sku}</p>
              <StockBadge stock={variant.stock_quantity} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
