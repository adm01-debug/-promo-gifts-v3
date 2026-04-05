// src/components/simulator/ProductQuantityCard.tsx
// Card inteligente para seleção de produto e quantidade com busca avançada

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Package, Info, TrendingUp, TrendingDown, Sparkles, MapPin, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/hooks/useSimulation";
import { SmartProductSearch } from "./SmartProductSearch";
import { ProductLocationSelector, type SelectedLocation } from "./ProductLocationSelector";
import type { Product } from "@/types/simulation";

export type { SelectedLocation };

interface ProductQuantityCardProps {
  products: Product[] | undefined;
  productsLoading: boolean;
  selectedProductId: string | null;
  onProductChange: (id: string | null) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  customProductPrice: string;
  onCustomPriceChange: (price: string) => void;
  selectedProduct: Product | undefined;
  effectiveProductPrice: number;
  // Novos props para local de gravação
  selectedTechniqueIds?: string[];
  onLocationSelect?: (location: SelectedLocation | null) => void;
  selectedLocation?: SelectedLocation | null;
}

// Quantidades populares para sugestão rápida
const QUICK_QUANTITIES = [50, 100, 250, 500, 1000];

export function ProductQuantityCard({
  products,
  productsLoading,
  selectedProductId,
  onProductChange,
  quantity,
  onQuantityChange,
  customProductPrice,
  onCustomPriceChange,
  selectedProduct,
  effectiveProductPrice,
  selectedTechniqueIds = [],
  onLocationSelect,
  selectedLocation,
}: ProductQuantityCardProps) {
  // Toggle para usar preço negociado
  const [useNegotiatedPrice, setUseNegotiatedPrice] = useState(false);

  // Controlar quando mostrar o input de preço customizado
  const showPriceInput = useNegotiatedPrice && selectedProduct;
  
  // Verificar se está usando preço diferente do base
  const hasCustomPrice = useMemo(() => {
    if (!selectedProduct) return false;
    const custom = parseFloat(customProductPrice);
    return !isNaN(custom) && custom > 0 && custom !== selectedProduct.price;
  }, [customProductPrice, selectedProduct]);

  // Calcular diferença de preço
  const priceDifference = useMemo(() => {
    if (!selectedProduct || !hasCustomPrice) return null;
    const custom = parseFloat(customProductPrice);
    const diff = custom - selectedProduct.price;
    const percent = ((diff / selectedProduct.price) * 100).toFixed(1);
    return {
      value: diff,
      percent,
      isHigher: diff > 0,
    };
  }, [customProductPrice, selectedProduct, hasCustomPrice]);

  // Quando toggle muda, resetar preço se desligar
  const handleToggleChange = (checked: boolean) => {
    setUseNegotiatedPrice(checked);
    if (!checked) {
      onCustomPriceChange("");
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          Produto & Quantidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Smart Product Search */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            Produto
            <Badge variant="outline" className="text-xs font-normal gap-1">
              <Sparkles className="h-3 w-3" />
              Busca inteligente
            </Badge>
          </Label>
          <SmartProductSearch
            products={products}
            productsLoading={productsLoading}
            selectedProduct={selectedProduct}
            onSelect={onProductChange}
          />
        </div>

        {/* Local de Gravação - Novo componente */}
        {selectedProduct && onLocationSelect && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Local de Gravação
            </Label>
            <div className="flex items-center gap-3 flex-wrap">
              <ProductLocationSelector
                productId={selectedProductId}
                productName={selectedProduct.name}
                selectedTechniqueIds={selectedTechniqueIds}
                onLocationSelect={onLocationSelect}
                currentWidth={10}
                currentHeight={10}
              />
              {selectedLocation && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Ruler className="h-3 w-3" />
                  Máx: {selectedLocation.maxWidth}×{selectedLocation.maxHeight}cm
                </Badge>
              )}
            </div>
          </motion.div>
        )}

        {/* Quantity with Quick Selectors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Quantidade</Label>
            <div className="flex gap-1">
              {QUICK_QUANTITIES.map((qty, idx) => (
                <motion.button
                  key={qty}
                  onClick={() => onQuantityChange(qty)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`
                    px-2.5 py-1 text-xs rounded-lg font-medium transition-colors
                    ${quantity === qty 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'}
                  `}
                >
                  {qty >= 1000 ? `${qty/1000}k` : qty}
                </motion.button>
              ))}
            </div>
          </div>
          <motion.div
            key={quantity}
            initial={{ scale: 1.02 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
              className="h-12 text-lg font-semibold text-center"
            />
          </motion.div>
        </div>

        {/* Negotiated Price Toggle */}
        <AnimatePresence mode="wait">
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center gap-2">
                  <Label 
                    htmlFor="negotiated-price" 
                    className="text-sm font-medium cursor-pointer"
                  >
                    Usar preço negociado
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">
                          Ative para informar um preço especial acordado com o fornecedor, 
                          diferente do preço de tabela
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="negotiated-price"
                  checked={useNegotiatedPrice}
                  onCheckedChange={handleToggleChange}
                />
              </div>

              {/* Custom Price Input - Conditional */}
              <AnimatePresence mode="wait">
                {showPriceInput && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2"
                  >
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Preço negociado
                      {priceDifference && (
                        <Badge 
                          variant={priceDifference.isHigher ? "destructive" : "default"}
                          className="text-xs gap-1"
                        >
                          {priceDifference.isHigher ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {priceDifference.isHigher ? '+' : ''}{priceDifference.percent}%
                        </Badge>
                      )}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        R$
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={customProductPrice}
                        onChange={(e) => onCustomPriceChange(e.target.value)}
                        placeholder={selectedProduct.price.toFixed(2)}
                        className="pl-10 h-12 text-lg font-mono"
                        autoFocus
                      />
                    </div>
                    {selectedProduct && (
                      <p className="text-xs text-muted-foreground">
                        Preço base: {formatCurrency(selectedProduct.price)}/un
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Summary */}
        <AnimatePresence mode="wait">
          {selectedProduct && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-card border-2 border-dashed border-primary/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {/* Product Image Thumbnail */}
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    {selectedProduct.image_url ? (
                      <img 
                        src={selectedProduct.image_url} 
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                       loading="lazy"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm line-clamp-1">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {quantity} un
                </Badge>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Preço base</p>
                  <p className={`font-mono font-medium ${hasCustomPrice ? 'line-through text-muted-foreground text-sm' : ''}`}>
                    {formatCurrency(selectedProduct.price)}/un
                  </p>
                </div>
                {hasCustomPrice && (
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Preço negociado
                    </p>
                    <p className="font-mono font-bold text-primary">
                      {formatCurrency(effectiveProductPrice)}/un
                    </p>
                  </div>
                )}
              </div>

              <motion.div 
                className="mt-3 p-3 rounded-lg bg-primary/10 text-center"
                key={effectiveProductPrice * quantity}
                initial={{ scale: 0.98, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <p className="text-xs text-muted-foreground">Total produtos</p>
                <motion.p 
                  className="font-bold text-xl text-primary"
                  key={`${effectiveProductPrice}-${quantity}`}
                  initial={{ y: -5 }}
                  animate={{ y: 0 }}
                >
                  {formatCurrency(effectiveProductPrice * quantity)}
                </motion.p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
