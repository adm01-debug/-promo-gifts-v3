/**
 * StepProduct - Passo 1: Seleção de Produto + Quantidade
 * 
 * Design: Layout premium com cards elegantes e espaçamento generoso
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
  Tag,
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
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left: Product Search - 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section Header */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Escolha o Produto</h3>
              <p className="text-muted-foreground">Busque pelo nome, SKU ou categoria</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produtos..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 pr-12 h-14 text-base rounded-2xl bg-muted/30 border-0 focus-visible:ring-2 focus-visible:ring-primary/40 shadow-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Results count */}
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {filteredProducts.length} produtos encontrados
            </p>
          )}

          {/* Products Grid */}
          <ScrollArea className="h-[480px] pr-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 mb-4">
                  <Package className="h-10 w-10 opacity-30" />
                </div>
                <p className="font-semibold text-lg">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">Tente outro termo de busca</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredProducts.slice(0, 50).map((product, idx) => {
                    const isSelected = wizard.selectedProduct?.id === product.id;
                    
                    return (
                      <motion.button
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => handleSelectProduct(product)}
                        className={cn(
                          'w-full p-4 rounded-2xl text-left transition-all duration-300',
                          'flex items-center gap-4 group',
                          isSelected 
                            ? 'bg-primary/10 ring-2 ring-primary shadow-lg shadow-primary/10'
                            : 'bg-card hover:bg-muted/60 hover:shadow-md border border-transparent hover:border-border/50'
                        )}
                      >
                        {/* Image */}
                        <div className={cn(
                          'w-16 h-16 rounded-xl flex-shrink-0 overflow-hidden transition-transform',
                          'bg-gradient-to-br from-muted to-muted/50',
                          'group-hover:scale-105'
                        )}>
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-2 leading-tight">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px] font-mono h-5">
                              {product.sku}
                            </Badge>
                          </div>
                        </div>

                        {/* Price & Check */}
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(product.price)}
                          </p>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-6 h-6 rounded-full bg-primary flex items-center justify-center mt-1 ml-auto"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right: Selection Summary - 1 col */}
        <div className="space-y-6">
          {/* Selected Product Card */}
          <div className="sticky top-4">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-card via-card to-muted/30 border shadow-lg">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Selecionado
              </h4>
              
              {wizard.selectedProduct ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5"
                >
                  {/* Product */}
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-muted overflow-hidden shadow-sm">
                      {wizard.selectedProduct.imageUrl ? (
                        <img 
                          src={wizard.selectedProduct.imageUrl} 
                          alt={wizard.selectedProduct.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold line-clamp-2 leading-tight">
                        {wizard.selectedProduct.name}
                      </p>
                      <Badge variant="outline" className="text-xs mt-2">
                        {wizard.selectedProduct.sku}
                      </Badge>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Preço unitário</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(wizard.effectivePrice)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="py-10 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 mx-auto flex items-center justify-center mb-3">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    Selecione um produto
                  </p>
                </div>
              )}
            </div>

            {/* Quantity Section */}
            <div className="p-6 rounded-3xl bg-card border mt-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Quantidade
              </h4>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {QUANTITY_PRESETS.map(qty => (
                  <Button
                    key={qty}
                    variant={wizard.quantity === qty ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => wizard.setQuantity(qty)}
                    className={cn(
                      'min-w-[52px] rounded-xl',
                      wizard.quantity === qty && 'shadow-lg shadow-primary/20'
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
                className="text-center text-xl font-bold h-14 rounded-xl"
              />

              {/* Negotiated Price */}
              <div className="mt-5 pt-5 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Preço negociado</Label>
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
                    placeholder="R$ 0,00"
                    value={wizard.negotiatedPrice || ''}
                    onChange={e => 
                      wizard.setNegotiatedPrice(true, parseFloat(e.target.value) || null)
                    }
                    className="text-lg font-semibold h-12 rounded-xl"
                  />
                )}
              </div>
            </div>

            {/* Total & CTA */}
            {wizard.selectedProduct && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 space-y-4"
              >
                <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-muted-foreground">Subtotal</span>
                      <p className="text-xs text-muted-foreground/70">{wizard.quantity} un.</p>
                    </div>
                    <span className="text-3xl font-bold text-primary">
                      {formatCurrency(wizard.effectivePrice * wizard.quantity)}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-base gap-2 rounded-2xl shadow-lg shadow-primary/20"
                  size="lg"
                  disabled={!wizard.canProceed}
                  onClick={wizard.nextStep}
                >
                  Continuar
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
