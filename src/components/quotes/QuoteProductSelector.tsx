import { useState } from "react";
import { Plus, Search, Package, ShoppingCart } from "lucide-react";
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

interface QuoteProductSelectorProps {
  onProductAdd: (item: QuoteItem) => void;
  existingProductIds: string[];
}

export function QuoteProductSelector({ onProductAdd, existingProductIds }: QuoteProductSelectorProps) {
  const { products } = useProductsContext();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [quantity, setQuantity] = useState(1);

  const filteredProducts = products.filter(product =>
    !existingProductIds.includes(product.id) &&
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
     (product.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    resetSelection();
    setOpen(false);
  };

  const resetSelection = () => {
    setSelectedProduct(null);
    setSelectedColor(null);
    setQuantity(1);
    setSearchQuery("");
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

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
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Selecionar Produto
          </DialogTitle>
        </DialogHeader>

        {!selectedProduct ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto por nome, SKU ou categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum produto encontrado
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
                          <span>{product.sku || 'N/A'}</span>
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
                      <div className="flex gap-1">
                        {product.colors.slice(0, 5).map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                        {product.colors.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{product.colors.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
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
