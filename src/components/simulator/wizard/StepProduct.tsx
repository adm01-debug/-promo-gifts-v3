/**
 * StepProduct - Passo 1: Seleção de Produto + Quantidade
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DollarSign,
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Product Selection */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Selecionar Produto
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Products List */}
          <ScrollArea className="h-[400px] pr-3">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredProducts.slice(0, 50).map((product, idx) => {
                  const isSelected = wizard.selectedProduct?.id === product.id;
                  
                  return (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => handleSelectProduct(product)}
                      className={cn(
                        'w-full p-3 rounded-xl border-2 mb-2 text-left transition-all',
                        'flex items-center gap-3',
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50 bg-card'
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
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {product.sku}
                          </Badge>
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className={cn(
                        'h-5 w-5 flex-shrink-0 transition-colors',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Quantity & Price */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Quantidade & Preço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selected Product Summary */}
          {wizard.selectedProduct ? (
            <div className="p-4 rounded-xl bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg bg-background overflow-hidden">
                  {wizard.selectedProduct.imageUrl ? (
                    <img 
                      src={wizard.selectedProduct.imageUrl} 
                      alt={wizard.selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{wizard.selectedProduct.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{wizard.selectedProduct.sku}</Badge>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(wizard.effectivePrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-xl border-2 border-dashed text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Selecione um produto ao lado</p>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quantidade</Label>
            <div className="flex flex-wrap gap-2">
              {QUANTITY_PRESETS.map(qty => (
                <Button
                  key={qty}
                  variant={wizard.quantity === qty ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => wizard.setQuantity(qty)}
                  className="min-w-[60px]"
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
              className="text-lg font-semibold text-center"
            />
          </div>

          {/* Negotiated Price */}
          <div className="space-y-3 pt-4 border-t">
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
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Produtos ({wizard.quantity} un.)
                </span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(wizard.effectivePrice * wizard.quantity)}
                </span>
              </div>
            </div>
          )}

          {/* Next Step Button */}
          <Button
            className="w-full"
            size="lg"
            disabled={!wizard.canProceed}
            onClick={wizard.nextStep}
          >
            Próximo: Selecionar Local
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
