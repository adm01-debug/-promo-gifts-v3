import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Plus, Search, Package, ShoppingCart, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Product, ProductColor } from "@/hooks/useProducts";
import { QuoteItem } from "@/hooks/useQuotes";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";

interface QuoteProductSelectorProps {
  onProductAdd: (item: QuoteItem) => void;
  existingProductIds: string[];
}

// Fuse.js config — same pattern as simulator ProductSearch
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
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedCount, setAddedCount] = useState(0);
  const [sessionAddedIds, setSessionAddedIds] = useState<string[]>([]);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Combine existing + session-added IDs to hide already-added products
  const allAddedIds = useMemo(
    () => [...existingProductIds, ...sessionAddedIds],
    [existingProductIds, sessionAddedIds]
  );

  // Products not yet in quote
  const availableProducts = useMemo(
    () => products.filter(p => !allAddedIds.includes(p.id)),
    [products, allAddedIds]
  );

  // Fuse index — only rebuild when available products change
  const fuse = useMemo(
    () => new Fuse(availableProducts, fuseOptions),
    [availableProducts]
  );

  // Fuzzy filtered results
  const filteredProducts = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return availableProducts;
    return fuse.search(debouncedQuery).map(r => r.item);
  }, [fuse, debouncedQuery, availableProducts]);

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
    
    // Go back to list (multi-add) instead of closing
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const isSearching = debouncedQuery.length >= 2;
  const resultCount = filteredProducts.length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetSelection();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Produto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Produto
            {addedCount > 0 && (
              <Badge variant="default" className="ml-2 gap-1">
                <Check className="h-3 w-3" />
                {addedCount} adicionado{addedCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {!selectedProduct ? (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search with clear button and result counter */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, SKU, categoria ou marca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                  autoFocus
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

            <ScrollArea className="flex-1 mt-3 pr-4" style={{ maxHeight: addedCount > 0 ? '320px' : '400px' }}>
              <div className="space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto encontrado</p>
                    {isSearching && (
                      <p className="text-xs mt-1">Tente ajustar o termo de busca</p>
                    )}
                  </div>
                ) : (
                  filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    >
                      <img
                        src={product.images?.[0] || '/placeholder.svg'}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-md"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{product.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="font-mono text-xs">{product.sku || 'N/A'}</span>
                          <span>•</span>
                          <span>{product.category_name || 'Sem categoria'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-primary font-semibold">
                            {formatCurrency(product.price)}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Mín. {product.minQuantity || 1} un.
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 max-w-[80px] justify-end">
                        {product.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Sticky footer — visible when items have been added */}
            {addedCount > 0 && (
              <div className="shrink-0 mt-3 pt-3 border-t flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{addedCount}</span> produto{addedCount !== 1 ? 's' : ''} adicionado{addedCount !== 1 ? 's' : ''} ao orçamento
                </p>
                <Button onClick={handleClose} className="gap-2">
                  <Check className="h-4 w-4" />
                  Concluir
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected Product Info */}
            <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
              <img
                src={selectedProduct.images?.[0] || '/placeholder.svg'}
                alt={selectedProduct.name}
                className="w-24 h-24 object-cover rounded-md"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedProduct.sku || 'N/A'}</p>
                <p className="text-primary font-bold text-xl mt-2">
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

            {/* Quantity */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Quantidade (mínimo: {selectedProduct.minQuantity || 1})
              </label>
              <Input
                type="number"
                min={selectedProduct.minQuantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(selectedProduct.minQuantity || 1, parseInt(e.target.value) || 0))}
                className="w-32"
              />
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <span className="text-sm text-muted-foreground">Subtotal do item:</span>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(selectedProduct.price * Math.max(quantity, selectedProduct.minQuantity || 1))}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>
                  Voltar
                </Button>
                <Button onClick={handleAddProduct} className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Adicionar ao Orçamento
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
