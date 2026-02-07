/**
 * StepProduct - Passo 1: Seleção de Produto + Quantidade
 * 
 * Design: Layout premium com cards elegantes e espaçamento generoso
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Package, 
  Search, 
  X, 
  ChevronRight,
  Sparkles,
  Palette,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchPromobrindProducts, getProductPrice, getProductImageUrl } from '@/lib/external-db';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import { ProductColorGrid } from './ProductColorGrid';

interface StepProductProps {
  wizard: UseSimulatorWizardReturn;
}

const QUANTITY_PRESETS = [50, 100, 250, 500, 1000];

export function StepProduct({ wizard }: StepProductProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch products - sem limite para buscar todos os produtos do catálogo
  const { data: products, isLoading } = useQuery({
    queryKey: ['wizard-products-all'],
    queryFn: async () => {
      // Sem limit = paginação automática busca todos
      const data = await fetchPromobrindProducts();
      return data
        .filter(p => p.active !== false && p.is_active !== false)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: getProductPrice(p),
          imageUrl: getProductImageUrl(p),
          categoryName: p.category_id || null,
          brand: p.brand || null,
          colors: (p.colors as Array<{ name: string; hex: string; code?: string; sku?: string; stock?: number; image?: string }>) || [],
        }));
    },
    staleTime: 10 * 60 * 1000, // 10 min cache para catálogos grandes
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
      colors: product.colors,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Row: Quantity + Header inline */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
        {/* Quantity Section - compact inline */}
        <div className="p-4 rounded-2xl bg-card border flex items-center gap-4 shrink-0">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Quantidade
          </h4>
          <div className="flex gap-1.5">
            {QUANTITY_PRESETS.map(qty => (
              <Button
                key={qty}
                variant={wizard.quantity === qty ? 'default' : 'outline'}
                size="sm"
                onClick={() => wizard.setQuantity(qty)}
                className={cn(
                  'min-w-[44px] rounded-xl h-9',
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
            className="text-center text-lg font-bold h-9 w-24 rounded-xl"
          />
        </div>

        {/* Section Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Escolha o Produto</h3>
            <p className="text-muted-foreground text-sm">Busque pelo nome, SKU ou categoria</p>
          </div>
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

      {/* Products Grid - 3 columns */}
      <ScrollArea className="h-[520px] pr-4">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {filteredProducts.slice(0, 60).map((product, idx) => {
                const isSelected = wizard.selectedProduct?.id === product.id;
                
                return (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.015 }}
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
                      'w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden transition-transform',
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
                          <Package className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm line-clamp-2 leading-tight">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px] font-mono h-5">
                          {product.sku}
                        </Badge>
                      </div>
                    </div>

                    {/* Price & Check */}
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-primary">
                        {formatCurrency(product.price)}
                      </p>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-1 ml-auto"
                        >
                          <Sparkles className="h-3 w-3 text-primary-foreground" />
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

      {/* Bottom CTA - only when product selected */}
      {wizard.selectedProduct && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Product color variants */}
          {wizard.selectedProduct.colors && wizard.selectedProduct.colors.length > 0 && (
            <div className="p-4 rounded-2xl bg-card border">
              <ProductColorGrid colors={wizard.selectedProduct.colors} />
            </div>
          )}

          {/* Engraving colors selector */}
          <div className="p-5 rounded-2xl bg-card border">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <Palette className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold">Cores da Gravação</h4>
                <p className="text-xs text-muted-foreground">Quantas cores terá a personalização?</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map(num => (
                <Button
                  key={num}
                  variant={wizard.engravingSpecs.colors === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => wizard.updateSpecs({ colors: num })}
                  className={cn(
                    'w-14 h-12 rounded-xl text-lg font-bold',
                    wizard.engravingSpecs.colors === num && 'shadow-lg shadow-primary/20'
                  )}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant={wizard.engravingSpecs.colors === 5 ? 'default' : 'outline'}
                size="sm"
                onClick={() => wizard.updateSpecs({ colors: 5 })}
                className={cn(
                  'h-12 px-5 rounded-xl text-sm font-bold',
                  wizard.engravingSpecs.colors === 5 && 'shadow-lg shadow-primary/20'
                )}
              >
                🎨 Colorido
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {wizard.engravingSpecs.colors === 5 
                ? 'Full color (impressão digital)' 
                : `${wizard.engravingSpecs.colors} ${wizard.engravingSpecs.colors === 1 ? 'cor' : 'cores'} de gravação`
              }
            </p>
          </div>

          {/* CTA bar */}
          <div className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden">
                {wizard.selectedProduct.imageUrl ? (
                  <img src={wizard.selectedProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-bold text-sm line-clamp-1">{wizard.selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground">
                  {wizard.quantity} un. × {formatCurrency(wizard.effectivePrice)} = <span className="font-bold text-primary">{formatCurrency(wizard.effectivePrice * wizard.quantity)}</span>
                </p>
              </div>
            </div>
            <Button
              className="h-12 px-8 text-base gap-2 rounded-2xl shadow-lg shadow-primary/20"
              size="lg"
              disabled={!wizard.canProceed}
              onClick={wizard.nextStep}
            >
              Continuar
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
