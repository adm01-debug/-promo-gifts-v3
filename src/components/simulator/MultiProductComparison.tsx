// src/components/simulator/MultiProductComparison.tsx
// Melhoria #8: Comparação multi-produto

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Layers, 
  Plus, 
  X, 
  Trophy,
  ArrowRight,
  Package,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption, Product } from "@/types/simulation";

interface ProductComparison {
  product: Product;
  options: SimulationOption[];
}

interface MultiProductComparisonProps {
  currentProduct: Product | undefined;
  currentOptions: SimulationOption[];
  products: Product[] | undefined;
  quantity: number;
  onCalculateForProduct: (product: Product) => SimulationOption[];
}

export function MultiProductComparison({
  currentProduct,
  currentOptions,
  products,
  quantity,
  onCalculateForProduct,
}: MultiProductComparisonProps) {
  const [open, setOpen] = useState(false);
  const [comparisons, setComparisons] = useState<ProductComparison[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Produtos disponíveis para adicionar (excluindo atual e já adicionados)
  const availableProducts = useMemo(() => {
    if (!products) return [];
    const usedIds = new Set([
      currentProduct?.id,
      ...comparisons.map(c => c.product.id)
    ]);
    return products.filter(p => !usedIds.has(p.id));
  }, [products, currentProduct, comparisons]);

  const addProduct = () => {
    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;

    const options = onCalculateForProduct(product);
    setComparisons(prev => [...prev, { product, options }]);
    setSelectedProductId("");
  };

  const removeProduct = (productId: string) => {
    setComparisons(prev => prev.filter(c => c.product.id !== productId));
  };

  // Todas as comparações incluindo o produto atual
  const allComparisons = useMemo(() => {
    if (!currentProduct) return comparisons;
    return [
      { product: currentProduct, options: currentOptions },
      ...comparisons
    ];
  }, [currentProduct, currentOptions, comparisons]);

  // Melhor opção geral
  const bestOverall = useMemo(() => {
    let best: { product: Product; option: SimulationOption } | null = null;
    
    for (const comp of allComparisons) {
      for (const opt of comp.options) {
        if (!best || opt.grandTotal < best.option.grandTotal) {
          best = { product: comp.product, option: opt };
        }
      }
    }
    
    return best;
  }, [allComparisons]);

  if (!currentProduct || currentOptions.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          Comparar Produtos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Comparação Multi-Produto
          </DialogTitle>
          <DialogDescription>
            Compare a mesma técnica de personalização em diferentes produtos
          </DialogDescription>
        </DialogHeader>

        {/* Add Product */}
        <div className="flex gap-2 py-2 border-b">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Adicionar produto para comparar..." />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {availableProducts.slice(0, 50).map(product => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{product.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={addProduct}
            disabled={!selectedProductId}
            size="sm"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Best Overall Badge */}
        {bestOverall && allComparisons.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-success/10 border border-success/30"
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-success" />
              <div className="flex-1">
                <p className="text-sm font-medium">Melhor combinação geral</p>
                <p className="text-xs text-muted-foreground">
                  {bestOverall.product.name} + {bestOverall.option.techniqueName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-success">
                  {formatCurrency(bestOverall.option.grandTotal)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(bestOverall.option.grandTotalPerUnit)}/un
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Comparisons Table */}
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-4">
            <AnimatePresence>
              {allComparisons.map((comparison, idx) => {
                const isCurrent = comparison.product.id === currentProduct.id;
                const sortedOptions = [...comparison.options].sort((a, b) => a.grandTotal - b.grandTotal);
                const bestOption = sortedOptions[0];
                const isBestOverall = bestOption?.id === bestOverall?.option.id && 
                                      comparison.product.id === bestOverall?.product.id;
                
                return (
                  <motion.div
                    key={comparison.product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={cn(
                      isBestOverall && "border-success/50 bg-success/5"
                    )}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {comparison.product.image_url && (
                              <img loading="lazy" src={comparison.product.image_url} 
                                alt={comparison.product.name}
                                className="h-10 w-10 rounded-lg object-cover"
                               loading="lazy"/>
                            )}
                            <div>
                              <CardTitle className="text-sm flex items-center gap-2">
                                {comparison.product.name}
                                {isCurrent && (
                                  <Badge variant="secondary" className="text-[10px]">Atual</Badge>
                                )}
                                {isBestOverall && (
                                  <Badge className="bg-success text-success-foreground text-[10px] gap-0.5">
                                    <Trophy className="h-3 w-3" />
                                    Melhor
                                  </Badge>
                                )}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {comparison.product.sku} • {formatCurrency(comparison.product.price)}/un
                              </p>
                            </div>
                          </div>
                          {!isCurrent && (
                            <Button
                              variant="ghost"
                              size="icon" aria-label="Excluir"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeProduct(comparison.product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="py-0 px-4 pb-3">
                        <Table>
                          <TableHeader>
                            <TableRow className="text-xs">
                              <TableHead className="py-2 h-8">Técnica</TableHead>
                              <TableHead className="py-2 h-8 text-right">Pers./Un</TableHead>
                              <TableHead className="py-2 h-8 text-right">Total</TableHead>
                              <TableHead className="py-2 h-8 text-right">Final/Un</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedOptions.slice(0, 3).map((opt, optIdx) => (
                              <TableRow key={opt.id} className="text-sm">
                                <TableCell className="py-1.5">
                                  <span className={cn(
                                    optIdx === 0 && "font-medium"
                                  )}>
                                    {opt.techniqueName}
                                  </span>
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-mono text-xs">
                                  {formatCurrency(opt.costPerUnit)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right font-bold">
                                  {formatCurrency(opt.grandTotal)}
                                </TableCell>
                                <TableCell className="py-1.5 text-right text-primary font-semibold">
                                  {formatCurrency(opt.grandTotalPerUnit)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {sortedOptions.length > 3 && (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            +{sortedOptions.length - 3} técnicas disponíveis
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {comparisons.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Adicione mais produtos para comparar os custos de personalização
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
