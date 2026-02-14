import { useState, useMemo, useRef, useCallback } from "react";
import Fuse from "fuse.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Plus, Minus, Search, Package, ShoppingCart, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product, ProductColor } from "@/hooks/useProducts";
import { QuoteItem } from "@/hooks/useQuotes";
import { useDebounce } from "@/hooks/useDebounce";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface QuoteProductSelectorProps {
  onProductAdd: (item: QuoteItem) => void;
  existingProductIds: string[];
}

// Fuse.js config
const fuseOptions: Fuse.IFuseOptions<Product> = {
  keys: [
    { name: 'name', weight: 0.45 },
    { name: 'sku', weight: 0.3 },
    { name: 'category_name', weight: 0.15 },
    { name: 'brand', weight: 0.1 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
};

export function QuoteProductSelector({ onProductAdd, existingProductIds }: QuoteProductSelectorProps) {
  const { products } = useProductsContext();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedCount, setAddedCount] = useState(0);
  const [sessionAddedIds, setSessionAddedIds] = useState<string[]>([]);
  const [scrollState, setScrollState] = useState({ top: false, bottom: true });

  const handleScroll = useCallback(() => {
    const el = scrollParentRef.current;
    if (!el) return;
    const atTop = el.scrollTop > 8;
    const atBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 8;
    setScrollState({ top: atTop, bottom: atBottom });
  }, []);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const isFilterPending = searchQuery.length >= 2 && searchQuery !== debouncedQuery;

  const allAddedIds = useMemo(
    () => [...existingProductIds, ...sessionAddedIds],
    [existingProductIds, sessionAddedIds]
  );

  const availableProducts = useMemo(
    () => products.filter(p => !allAddedIds.includes(p.id)),
    [products, allAddedIds]
  );

  const fuse = useMemo(
    () => new Fuse(availableProducts, fuseOptions),
    [availableProducts]
  );

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return availableProducts;
    return fuse.search(debouncedQuery).map(r => r.item);
  }, [fuse, debouncedQuery, availableProducts]);

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 88,
    overscan: 5,
  });

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const item: QuoteItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku || '',
      product_image_url: product.images?.[0] || '',
      quantity: product.minQuantity || 1,
      unit_price: product.price,
      personalizations: [],
    };
    onProductAdd(item);
    setAddedCount(prev => prev + 1);
    setSessionAddedIds(prev => [...prev, product.id]);
    toast.success(`"${product.name}" adicionado rapidamente`);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    const item: QuoteItem = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      product_sku: selectedProduct.sku || '',
      product_image_url: selectedProduct.images?.[0] || '',
      quantity: Math.max(quantity, selectedProduct.minQuantity || 1),
      unit_price: selectedProduct.price,
      color_name: selectedColor?.name,
      color_hex: selectedColor?.hex,
      personalizations: [],
    };
    onProductAdd(item);
    setAddedCount(prev => prev + 1);
    setSessionAddedIds(prev => [...prev, selectedProduct.id]);
    toast.success(`"${selectedProduct.name}" adicionado ao orçamento`);
    setSelectedProduct(null);
    setSelectedColor(null);
    setQuantity(1);
  };

  const resetSelection = () => {
    setSelectedProduct(null);
    setSelectedColor(null);
    setQuantity(1);
    setSearchQuery("");
    setAddedCount(0);
    setSessionAddedIds([]);
  };

  const handleClose = () => {
    setOpen(false);
    resetSelection();
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const isSearching = debouncedQuery.length >= 2;
  const resultCount = filteredProducts.length;

  // --- Shared header ---
  const headerContent = (
    <div className="flex items-center gap-2">
      <Package className="h-5 w-5" />
      Selecionar Produto
      {addedCount > 0 && (
        <Badge variant="default" className="ml-2 gap-1">
          <Check className="h-3 w-3" />
          {addedCount} adicionado{addedCount !== 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );

  // --- Shared body ---
  const bodyContent = (
    <>
      {!selectedProduct ? (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Search */}
          <div className="space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU, categoria ou marca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
                autoFocus={!isMobile}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {isSearching && (
              <p className="text-xs text-muted-foreground px-1">
                {resultCount} produto{resultCount !== 1 ? 's' : ''} encontrado{resultCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Virtualized product list with fade indicators */}
          <div className="relative flex-1 mt-3">
            {/* Top fade */}
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
              style={{
                opacity: scrollState.top ? 1 : 0,
                background: 'linear-gradient(to bottom, hsl(var(--background)), transparent)',
              }}
            />
            <div
              ref={scrollParentRef}
              className="pr-2 overflow-auto h-full"
              style={{ maxHeight: isMobile ? '60vh' : (addedCount > 0 ? '320px' : '400px') }}
              onScroll={handleScroll}
            >
              {isFilterPending ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                    <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum produto encontrado</p>
                {isSearching && (
                  <p className="text-xs mt-1">Tente ajustar o termo de busca</p>
                )}
              </div>
            ) : (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const product = filteredProducts[virtualRow.index];
                  return (
                    <div
                      key={product.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="py-1"
                    >
                      <div
                        onClick={() => setSelectedProduct(product)}
                        className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors h-full min-h-[48px]"
                      >
                        <img
                          src={product.images?.[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate text-sm sm:text-base">{product.name}</h4>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <span className="font-mono">{product.sku || 'N/A'}</span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">{product.category_name || 'Sem categoria'}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-primary font-semibold text-sm">
                              {formatCurrency(product.price)}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              Mín. {product.minQuantity || 1}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="hidden sm:flex flex-wrap gap-1 max-w-[80px] justify-end">
                            {product.colors.slice(0, 5).map((color, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              />
                            ))}
                            {product.colors.length > 5 && (
                              <span className="text-[10px] text-muted-foreground">+{product.colors.length - 5}</span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 sm:h-7 sm:w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={(e) => handleQuickAdd(e, product)}
                            title="Adicionar rápido (qtd mínima, sem cor)"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
            {/* Bottom fade */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 z-10 transition-opacity duration-200"
              style={{
                opacity: scrollState.bottom ? 1 : 0,
                background: 'linear-gradient(to top, hsl(var(--background)), transparent)',
              }}
            />
          </div>

          {/* Sticky footer */}
          {addedCount > 0 && (
            <div className="shrink-0 mt-3 pt-3 border-t flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{addedCount}</span> produto{addedCount !== 1 ? 's' : ''} adicionado{addedCount !== 1 ? 's' : ''}
              </p>
              <Button onClick={handleClose} className="gap-2">
                <Check className="h-4 w-4" />
                Concluir
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Selected Product Info */}
          <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <img
              src={selectedProduct.images?.[0] || '/placeholder.svg'}
              alt={selectedProduct.name}
              className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-base sm:text-lg">{selectedProduct.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedProduct.sku || 'N/A'}</p>
              <p className="text-primary font-bold text-lg sm:text-xl mt-2">
                {formatCurrency(selectedProduct.price)}
              </p>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Cor</label>
            <div className="flex flex-wrap gap-2">
              {(selectedProduct.colors || []).map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    selectedColor?.name === color.name
                      ? "border-primary bg-primary/10"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-sm">{color.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Stepper */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Quantidade (mínimo: {selectedProduct.minQuantity || 1})
            </label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setQuantity(prev => Math.max(selectedProduct.minQuantity || 1, prev - 1))}
                disabled={quantity <= (selectedProduct.minQuantity || 1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={selectedProduct.minQuantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(selectedProduct.minQuantity || 1, parseInt(e.target.value) || 0))}
                className="w-20 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={() => setQuantity(prev => prev + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {quantity < (selectedProduct.minQuantity || 1) && (
              <p className="text-xs text-destructive mt-1">
                Quantidade mínima: {selectedProduct.minQuantity || 1} unidades
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-muted rounded-lg">
            <div>
              <span className="text-sm text-muted-foreground">Subtotal do item:</span>
              <p className="text-xl sm:text-2xl font-bold text-primary">
                {formatCurrency(selectedProduct.price * Math.max(quantity, selectedProduct.minQuantity || 1))}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setSelectedProduct(null)} className="flex-1 sm:flex-initial">
                Voltar
              </Button>
              <Button onClick={handleAddProduct} className="gap-2 flex-1 sm:flex-initial">
                <ShoppingCart className="h-4 w-4" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const triggerButton = (
    <Button variant="outline" className="gap-2">
      <Plus className="h-4 w-4" />
      Adicionar Produto
    </Button>
  );

  // --- Mobile: Drawer ---
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetSelection();
      }}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[90vh] flex flex-col px-4 pb-4">
          <DrawerHeader className="px-0">
            <DrawerTitle>{headerContent}</DrawerTitle>
          </DrawerHeader>
          {bodyContent}
        </DrawerContent>
      </Drawer>
    );
  }

  // --- Desktop: Dialog ---
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetSelection();
    }}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{headerContent}</DialogTitle>
        </DialogHeader>
        {bodyContent}
      </DialogContent>
    </Dialog>
  );
}
