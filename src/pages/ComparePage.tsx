/**
 * ComparePage — Comparador de produtos
 * Onda C1: Score ponderado, radar chart, AI advisor, TCO, highlights expandidos, differences-only.
 * Onda C2: CRM picker, share público, export PDF/PNG/CSV, sync cross-device, CTA orçamento.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useComparisonStore, type CompareVariantInfo } from "@/stores/useComparisonStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GitCompare, X, ArrowLeft, ShoppingCart, Share2, Image as ImageIcon, List, Filter, FileText, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SyncedZoomGallery } from "@/components/compare/SyncedZoomGallery";
import { CompareTableView } from "@/components/compare/CompareTableView";
import { ComparisonScoreCard } from "@/components/compare/ComparisonScoreCard";
import { ComparisonRadarChart } from "@/components/compare/ComparisonRadarChart";
import { AIComparisonAdvisor } from "@/components/compare/AIComparisonAdvisor";
import { ShareComparisonDialog } from "@/components/compare/ShareComparisonDialog";
import { ExportComparisonButton } from "@/components/compare/ExportComparisonButton";
import { FavoritesClientPicker } from "@/components/favorites/FavoritesClientPicker";
import { useComparisonSync } from "@/hooks/useComparisonSync";

export default function ComparePage() {
  useComparisonSync();
  const navigate = useNavigate();
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const { compareItems, removeByIndex, clearCompare, compareCount } = useComparisonStore();
  const { getProductsByIds, products: _cacheSignal } = useProductsContext();

  const compareEntries = useMemo(() => {
    const uniqueIds = [...new Set(compareItems.map(i => i.productId))];
    const productMap = new Map<string, any>();
    getProductsByIds(uniqueIds).forEach(p => productMap.set(p.id, p));
    return compareItems.map((item, index) => {
      const product = productMap.get(item.productId);
      if (!product) return null;
      const displayProduct = item.variant?.thumbnail
        ? { ...product, images: [item.variant.thumbnail, ...product.images] }
        : product;
      return { product: displayProduct, variant: item.variant, index };
    }).filter(Boolean) as { product: any; variant?: CompareVariantInfo; index: number }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareItems, getProductsByIds, _cacheSignal]);

  const products = compareEntries.map(e => e.product);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case "in-stock": return { label: "Em estoque", color: "text-success" };
      case "low-stock": return { label: "Estoque baixo", color: "text-warning" };
      case "out-of-stock": return { label: "Sem estoque", color: "text-destructive" };
      default: return { label: "Em estoque", color: "text-success" };
    }
  };

  const handleCreateQuote = () => {
    const productParams = compareItems.map(i => i.productId).join(",");
    const params = new URLSearchParams({ products: productParams });
    if (client?.id) params.set("client_id", client.id);
    if (client?.name) params.set("client_name", client.name);
    navigate(`/orcamentos/novo?${params.toString()}`);
  };

  if (compareCount < 2) {
    return (
      <MainLayout>
        <PageSEO title="Comparar Produtos" description="Compare brindes lado a lado." path="/comparar"
          jsonLd={{ "@context": "https://schema.org", "@type": "WebPage", "name": "Comparar Produtos", "url": "https://criar-together-now.lovable.app/comparar" }} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <GitCompare className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Comparador de Produtos</h1>
            <p className="text-muted-foreground max-w-md">Selecione pelo menos 2 produtos para comparar.</p>
          </div>
          <Button onClick={() => navigate("/")}><ShoppingCart className="h-4 w-4 mr-2" />Explorar Produtos</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ShareComparisonDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        compareItems={compareItems}
        clientId={client?.id ?? null}
        clientName={client?.name ?? null}
      />
      <div id="compare-export-area" className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">Comparador de Produtos</h1>
              <p className="text-muted-foreground">
                Comparando {compareCount} produtos
                {client && <> · <span className="text-primary font-medium">{client.name}</span></>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={client ? "default" : "outline"} size="sm">
                  <Building2 className="h-4 w-4 mr-2" />
                  {client ? client.name.slice(0, 22) : "Cliente CRM"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3">
                <FavoritesClientPicker
                  selectedClientId={client?.id ?? null}
                  selectedClientName={client?.name ?? null}
                  onSelect={setClient}
                />
              </PopoverContent>
            </Popover>
            <Button
              variant={differencesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setDifferencesOnly(v => !v)}
              aria-pressed={differencesOnly}
            >
              <Filter className="h-4 w-4 mr-2" />
              {differencesOnly ? "Mostrando diferenças" : "Só diferenças"}
            </Button>
            <Button variant="default" size="sm" onClick={handleCreateQuote}>
              <FileText className="h-4 w-4 mr-2" />
              Criar orçamento
            </Button>
            <ExportComparisonButton products={products} formatCurrency={formatCurrency} />
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4 mr-2" />Compartilhar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { clearCompare(); navigate("/"); }}>Limpar</Button>
          </div>
        </div>

        {/* Onda C1 — Inteligência de decisão */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ComparisonScoreCard products={products} />
          <ComparisonRadarChart products={products} />
        </div>
        <AIComparisonAdvisor products={products} />

        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto mb-6">
            <TabsTrigger value="gallery" className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />Galeria Visual</TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2"><List className="h-4 w-4" />Tabela Detalhada</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="space-y-6">
            <SyncedZoomGallery products={products} onProductClick={(id) => navigate(`/produto/${id}`)} />
            <div className={cn("grid gap-4", products.length === 2 && "grid-cols-2", products.length === 3 && "grid-cols-3", products.length >= 4 && "grid-cols-2 lg:grid-cols-4")}>
              {compareEntries.map((entry) => {
                const status = getStockStatusLabel(entry.product.stockStatus);
                return (
                  <div key={`card-${entry.index}`} className="p-4 rounded-xl bg-card border-[1.5px] border-primary/20 hover:border-primary/50 hover:shadow-xl card-lift transition-all duration-300 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{formatCurrency(entry.product.price)}</span>
                        {entry.variant?.color_name && (
                          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                            {entry.variant.color_hex && <span className="inline-block w-2.5 h-2.5 rounded-full border border-border/50 shrink-0" style={{ backgroundColor: entry.variant.color_hex }} />}
                            {entry.variant.color_name}
                          </Badge>
                        )}
                      </div>
                      <button aria-label="Remover" onClick={() => removeByIndex(entry.index)} className="p-1 rounded-full hover:bg-destructive/20 transition-colors">
                        <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Mín:</span><span>{entry.product.minQuantity} un.</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Estoque:</span><span className={status.color}>{status.label}</span></div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Cores:</span>
                        <div className="flex gap-0.5">
                          {entry.product.colors.slice(0, 4).map((c: any, i: number) => <div key={i} className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: c.hex }} />)}
                          {entry.product.colors.length > 4 && <span className="text-xs text-muted-foreground ml-1">+{entry.product.colors.length - 4}</span>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => navigate(`/produto/${entry.product.id}`)}>Ver Detalhes</Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="table">
            <CompareTableView entries={compareEntries} products={products} formatCurrency={formatCurrency} getStockStatusLabel={getStockStatusLabel} onRemove={removeByIndex} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
