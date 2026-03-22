import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useComparisonContext } from "@/contexts/ComparisonContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  GitCompare, 
  X, 
  ArrowLeft, 
  Package, 
  ShoppingCart,
  Share2,
  Check,
  Minus,
  Image as ImageIcon,
  List,
  Crown,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SyncedZoomGallery } from "@/components/compare/SyncedZoomGallery";
import { useComparisonHighlight, highlightClasses } from "@/components/compare/ComparisonHighlights";

export default function ComparePage() {
  const navigate = useNavigate();
  const { getCompareProducts, removeFromCompare, clearCompare, compareCount } =
    useComparisonContext();

  const products = getCompareProducts();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case "in-stock":
        return { label: "Em estoque", color: "text-success" };
      case "low-stock":
        return { label: "Estoque baixo", color: "text-warning" };
      case "out-of-stock":
        return { label: "Sem estoque", color: "text-destructive" };
      default:
        return { label: "Em estoque", color: "text-success" };
    }
  };

  const handleShare = () => {
    const productNames = products.map((p) => `• ${p.name} - ${formatCurrency(p.price)}`).join("\n");
    const message = `Comparativo de Produtos:\n\n${productNames}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Comparativo de Produtos - PROMO BRINDES",
        text: message,
      });
    } else {
      navigator.clipboard.writeText(message);
      toast.success("Comparativo copiado para a área de transferência!");
    }
  };

  // Collect all unique attributes for comparison
  const allMaterials = [...new Set(products.flatMap((p) => p.materials))];
  const allColors = [...new Set(products.flatMap((p) => p.colors.map((c) => c.name)))];
  const allPublicoAlvo = [...new Set(products.flatMap((p) => p.tags.publicoAlvo))];
  const allDatas = [...new Set(products.flatMap((p) => p.tags.datasComemorativas))];

  if (compareCount < 2) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <GitCompare className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Comparador de Produtos
            </h1>
            <p className="text-muted-foreground max-w-md">
              Selecione pelo menos 2 produtos para comparar. Você pode adicionar até 4 produtos
              para uma comparação detalhada.
            </p>
          </div>
          <Button onClick={() => navigate("/")}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Explorar Produtos
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                Comparador de Produtos
              </h1>
              <p className="text-muted-foreground">
                Comparando {compareCount} produtos
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearCompare();
                navigate("/");
              }}
            >
              Limpar Comparação
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto mb-6">
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Galeria Visual
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Tabela Detalhada
            </TabsTrigger>
          </TabsList>

          {/* Gallery View with Synced Zoom */}
          <TabsContent value="gallery" className="space-y-6">
            <SyncedZoomGallery 
              products={products}
              onProductClick={(id) => navigate(`/produto/${id}`)}
            />

            {/* Quick comparison cards below gallery */}
            <div className={cn(
              "grid gap-4",
              products.length === 2 && "grid-cols-2",
              products.length === 3 && "grid-cols-3",
              products.length >= 4 && "grid-cols-2 lg:grid-cols-4"
            )}>
              {products.map((product) => {
                const status = getStockStatusLabel(product.stockStatus);
                return (
                  <div 
                    key={product.id} 
                    className="p-4 rounded-xl bg-card border border-border space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(product.price)}
                      </span>
                      <button
                        onClick={() => removeFromCompare(product.id)}
                        className="p-1 rounded-full hover:bg-destructive/20 transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mín:</span>
                        <span>{product.minQuantity} un.</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estoque:</span>
                        <span className={status.color}>{status.label}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Cores:</span>
                        <div className="flex gap-0.5">
                          {product.colors.slice(0, 4).map((color, idx) => (
                            <div
                              key={idx}
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: color.hex }}
                            />
                          ))}
                          {product.colors.length > 4 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              +{product.colors.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/produto/${product.id}`)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* Table View */}
          <TabsContent value="table">
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] bg-muted/50 sticky left-0 z-10">
                        Atributo
                      </TableHead>
                      {products.map((product) => (
                        <TableHead
                          key={product.id}
                          className="min-w-[200px] text-center"
                        >
                          <div className="relative group">
                            <button
                              onClick={() => removeFromCompare(product.id)}
                              className="absolute -top-1 -right-1 p-1 rounded-full bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 z-10"
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </button>
                            <div className="flex flex-col items-center gap-2">
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-24 h-24 rounded-lg object-cover cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                onClick={() => navigate(`/produto/${product.id}`)}
                              />
                              <span className="font-medium text-foreground text-sm line-clamp-2">
                                {product.name}
                              </span>
                            </div>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Preço - with highlight */}
                    <HighlightedPriceRow 
                      products={products} 
                      formatCurrency={formatCurrency} 
                    />

                    {/* Quantidade Mínima - with highlight */}
                    <HighlightedMinQtyRow 
                      products={products} 
                    />

                    {/* SKU */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        SKU
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center font-mono text-sm">
                          {product.sku}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Categoria */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Categoria
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <Badge variant="outline">
                            {product.category.icon} {product.category.name}
                          </Badge>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Fornecedor */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Fornecedor
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          {product.supplier.name}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Estoque */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Estoque
                      </TableCell>
                      {products.map((product) => {
                        const status = getStockStatusLabel(product.stockStatus);
                        return (
                          <TableCell key={product.id} className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={cn("font-medium", status.color)}>
                                {status.label}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {product.stock.toLocaleString("pt-BR")} un.
                              </span>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>

                    {/* É Kit */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        É Kit?
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          {product.isKit ? (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          ) : (
                            <Minus className="h-5 w-5 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Cores */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Cores Disponíveis
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {product.colors.slice(0, 6).map((color, idx) => (
                              <div
                                key={idx}
                                className="w-5 h-5 rounded-full border border-border"
                                style={{ backgroundColor: color.hex }}
                                title={color.name}
                              />
                            ))}
                            {product.colors.length > 6 && (
                              <span className="text-xs text-muted-foreground">
                                +{product.colors.length - 6}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Materiais */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Materiais
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {product.materials.map((material) => (
                              <Badge key={material} variant="secondary" className="text-xs">
                                {material}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Público-Alvo */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Público-Alvo
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {product.tags.publicoAlvo.slice(0, 3).map((publico) => (
                              <Badge key={publico} variant="outline" className="text-xs">
                                {publico}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Datas Comemorativas */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Datas Comemorativas
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          {product.tags.datasComemorativas.length > 0 ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              {product.tags.datasComemorativas.slice(0, 2).map((data) => (
                                <Badge key={data} variant="outline" className="text-xs">
                                  {data}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <Minus className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Descrição */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Descrição
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {product.description}
                          </p>
                        </TableCell>
                      ))}
                    </TableRow>

                    {/* Ações */}
                    <TableRow>
                      <TableCell className="font-medium bg-muted/50 sticky left-0">
                        Ações
                      </TableCell>
                      {products.map((product) => (
                        <TableCell key={product.id} className="text-center">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/produto/${product.id}`)}
                          >
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// Highlighted Price Row Component
function HighlightedPriceRow({ 
  products, 
  formatCurrency 
}: { 
  products: any[]; 
  formatCurrency: (v: number) => string;
}) {
  const prices = products.map(p => p.price);
  const highlights = useComparisonHighlight(prices, "lower-is-better");

  return (
    <TableRow>
      <TableCell className="font-medium bg-muted/50 sticky left-0">
        Preço Unitário
      </TableCell>
      {products.map((product, idx) => (
        <TableCell 
          key={product.id} 
          className={cn("text-center", highlightClasses[highlights[idx]])}
        >
          <div className="flex items-center justify-center gap-1">
            {highlights[idx] === "best" && (
              <Crown className="h-4 w-4 text-success" />
            )}
            <span className={cn(
              "text-lg font-bold",
              highlights[idx] === "best" ? "text-success" : 
              highlights[idx] === "worst" ? "text-destructive" : "text-primary"
            )}>
              {formatCurrency(product.price)}
            </span>
            {highlights[idx] === "worst" && (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            )}
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
}

// Highlighted Min Quantity Row Component
function HighlightedMinQtyRow({ products }: { products: any[] }) {
  const quantities = products.map(p => p.minQuantity);
  const highlights = useComparisonHighlight(quantities, "lower-is-better");

  return (
    <TableRow>
      <TableCell className="font-medium bg-muted/50 sticky left-0">
        Quantidade Mínima
      </TableCell>
      {products.map((product, idx) => (
        <TableCell 
          key={product.id} 
          className={cn("text-center", highlightClasses[highlights[idx]])}
        >
          <div className="flex items-center justify-center gap-1">
            {highlights[idx] === "best" && (
              <Crown className="h-3.5 w-3.5 text-success" />
            )}
            <span className={cn(
              highlights[idx] === "best" ? "font-semibold text-success" :
              highlights[idx] === "worst" ? "text-destructive" : ""
            )}>
              {product.minQuantity} un.
            </span>
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
}