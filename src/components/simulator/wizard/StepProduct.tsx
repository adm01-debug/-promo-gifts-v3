/**
 * StepProduct - Passo 1: Seleção de Produto + Quantidade
 * 
 * Design: Layout arejado, foco na busca e seleção clara
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  Search, 
  X, 
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchPromobrindProducts, getProductPrice, getProductImageUrl } from '@/lib/external-db';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface StepProductProps {
  wizard: UseSimulatorWizardReturn;
}

const QUANTITY_PRESETS = [50, 100, 250, 500, 1000];

export function StepProduct({ wizard }: StepProductProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['wizard-products'],
    queryFn: async () => {
      const data = await fetchPromobrindProducts({ limit: 500 });
      return data
        .filter(p => p.active !== false && p.is_active !== false)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: getProductPrice(p),
          imageUrl: getProductImageUrl(p),
          categoryName: p.category_name,
          brand: p.brand || null,
        }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.sku.toLowerCase().includes(term) ||
      p.categoryName?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSelectProduct = (product: typeof filteredProducts[0]) => {
    wizard.selectProduct({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      imageUrl: product.imageUrl,
      categoryName: product.categoryName,
      brand: product.brand,
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left: Product Search - 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Selecionar Produto</h3>
              <p className="text-sm text-muted-foreground">Busque pelo nome ou SKU</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-11 pr-11 h-12 text-base bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Products List */}
          <ScrollArea className="h-[420px]">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-20" />
                <p className="font-medium">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">Tente outro termo de busca</p>
              </div>
            ) : (
              <div className="space-y-2 pr-3">
                <AnimatePresence mode="popLayout">
                  {filteredProducts.slice(0, 50).map((product, idx) => {
                    const isSelected = wizard.selectedProduct?.id === product.id;
                    
                    return (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: idx * 0.015 }}
                        onClick={() => handleSelectProduct(product)}
                        className={cn(
                          'w-full p-3 rounded-xl text-left transition-all duration-200',
                          'flex items-center gap-4',
                          isSelected 
                            ? 'bg-primary/10 ring-2 ring-primary/50 shadow-sm'
                            : 'bg-card/50 hover:bg-muted/80'
                        )}
                      >
                        {/* Image */}
                        <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground font-mono">
                              {product.sku}
                            </span>
                            <span className="text-sm font-semibold text-primary">
                              {formatCurrency(product.price)}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Quantity & Summary - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Product */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Produto Selecionado
            </h4>
            
            {wizard.selectedProduct ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/10 border border-primary/20"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-background overflow-hidden shadow-sm">
                    {wizard.selectedProduct.imageUrl ? (
                      <img 
                        src={wizard.selectedProduct.imageUrl} 
                        alt={wizard.selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold line-clamp-2">{wizard.selectedProduct.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {wizard.selectedProduct.sku}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preço unitário</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(wizard.effectivePrice)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="p-8 rounded-2xl border-2 border-dashed border-muted-foreground/20 text-center">
                <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground mt-2">
                  Selecione um produto
                </p>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Quantidade
            </h4>
            <div className="flex flex-wrap gap-2">
              {QUANTITY_PRESETS.map(qty => (
                <Button
                  key={qty}
                  variant={wizard.quantity === qty ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => wizard.setQuantity(qty)}
                  className={cn(
                    'min-w-[56px]',
                    wizard.quantity === qty && 'shadow-md'
                  )}
                >
                  {qty >= 1000 ? `${qty / 1000}k` : qty}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              value={wizard.quantity}
              onChange={e => wizard.setQuantity(parseInt(e.target.value) || 1)}
              min={1}
              className="text-center text-lg font-semibold h-12"
            />
          </div>

          {/* Negotiated Price Toggle */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                Usar preço negociado
              </Label>
              <Switch
                checked={wizard.useNegotiatedPrice}
                onCheckedChange={(checked) => 
                  wizard.setNegotiatedPrice(checked, wizard.negotiatedPrice)
                }
              />
            </div>
            {wizard.useNegotiatedPrice && (
              <Input
                type="number"
                step="0.01"
                placeholder="Preço negociado..."
                value={wizard.negotiatedPrice || ''}
                onChange={e => 
                  wizard.setNegotiatedPrice(true, parseFloat(e.target.value) || null)
                }
                className="text-lg font-semibold"
              />
            )}
          </div>

          {/* Summary */}
          {wizard.selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-primary/5"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm text-muted-foreground">Total Produtos</span>
                  <p className="text-xs text-muted-foreground/70">{wizard.quantity} unidades</p>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(wizard.effectivePrice * wizard.quantity)}
                </span>
              </div>
            </motion.div>
          )}

          {/* Next Button */}
          <Button
            className="w-full h-12 text-base gap-2"
            size="lg"
            disabled={!wizard.canProceed}
            onClick={wizard.nextStep}
          >
            Selecionar Local
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
