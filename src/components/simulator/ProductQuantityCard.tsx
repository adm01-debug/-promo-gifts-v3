// src/components/simulator/ProductQuantityCard.tsx
// Card compacto para seleção de produto e quantidade

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Package, Info, Loader2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/hooks/useSimulation";
import type { Product } from "@/types/simulation";

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
}: ProductQuantityCardProps) {
  const showPriceOverride = useMemo(() => {
    return selectedProduct && effectiveProductPrice !== selectedProduct.price;
  }, [selectedProduct, effectiveProductPrice]);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          Produto & Quantidade
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Produto</Label>
          <Select value={selectedProductId || ""} onValueChange={onProductChange}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Escolher produto..." />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {productsLoading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                products?.map(product => (
                  <SelectItem key={product.id} value={product.id} className="py-3">
                    <div className="flex items-center justify-between gap-4 w-full">
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({product.sku})
                        </span>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {formatCurrency(product.price)}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity with Quick Selectors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Quantidade</Label>
            <div className="flex gap-1">
              {QUICK_QUANTITIES.map(qty => (
                <button
                  key={qty}
                  onClick={() => onQuantityChange(qty)}
                  className={`
                    px-2 py-0.5 text-xs rounded-md transition-all
                    ${quantity === qty 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'}
                  `}
                >
                  {qty >= 1000 ? `${qty/1000}k` : qty}
                </button>
              ))}
            </div>
          </div>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
            className="h-12 text-lg font-semibold text-center"
          />
        </div>

        {/* Custom Price Override */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            Preço unitário
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs">
                    Use o preço base do produto ou informe um valor negociado especial
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              placeholder={selectedProduct?.price?.toFixed(2) || "0.00"}
              className="pl-10 h-12 text-lg font-mono"
            />
          </div>
        </div>

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
                <div>
                  <p className="font-semibold text-lg">{selectedProduct.name}</p>
                  <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {quantity} un
                </Badge>
              </div>
              
              <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Preço base</p>
                  <p className="font-mono font-medium">
                    {formatCurrency(selectedProduct.price)}/un
                  </p>
                </div>
                {showPriceOverride && (
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

              <div className="mt-3 p-2 rounded-lg bg-primary/10 text-center">
                <p className="text-xs text-muted-foreground">Total produtos</p>
                <p className="font-bold text-xl text-primary">
                  {formatCurrency(effectiveProductPrice * quantity)}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
