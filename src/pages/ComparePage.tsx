/**
 * ComparePage — Comparador de produtos (10/10)
 * C1: score, radar, AI advisor, TCO, differences-only.
 * C2: CRM picker, share público, export, sync, CTA orçamento.
 * C3: Duel mode, mobile carousel, presentation, variant sync.
 * C4: similar rail, presentation launcher.
 * C5: shortcuts, ARIA-live, smart empty state, recent sidebar.
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageSEO } from "@/components/seo/PageSEO";
import { useComparisonStore, type CompareVariantInfo } from "@/stores/useComparisonStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitCompare, X, ArrowLeft, Share2, Image as ImageIcon, List, Filter, FileText, Building2, Swords, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SyncedZoomGallery } from "@/components/compare/SyncedZoomGallery";
import { CompareTableView } from "@/components/compare/CompareTableView";
import { ComparisonScoreCard } from "@/components/compare/ComparisonScoreCard";
import { ComparisonRadarChart } from "@/components/compare/ComparisonRadarChart";
import { AIComparisonAdvisor } from "@/components/compare/AIComparisonAdvisor";
import { ShareComparisonDialog } from "@/components/compare/ShareComparisonDialog";
import { ExportComparisonButton } from "@/components/compare/ExportComparisonButton";
import { ComparisonDuelView } from "@/components/compare/ComparisonDuelView";
import { ComparisonMobileView } from "@/components/compare/ComparisonMobileView";
import { ComparisonPresentationLauncher } from "@/components/compare/ComparisonPresentationLauncher";
import { SimilarProductsRail } from "@/components/compare/SimilarProductsRail";
import { CompareEmptyStateSmart } from "@/components/compare/CompareEmptyStateSmart";
import { ComparisonSummaryDashboard } from "@/components/compare/ComparisonSummaryDashboard";
import { RecentComparisonsSidebar } from "@/components/compare/RecentComparisonsSidebar";
import { FavoritesClientPicker } from "@/components/favorites/FavoritesClientPicker";
import { useComparisonSync } from "@/hooks/useComparisonSync";
import { useComparisonShortcuts } from "@/hooks/useComparisonShortcuts";

export default function ComparePage() {
  useComparisonSync();
  const navigate = useNavigate();
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const [duelMode, setDuelMode] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [isMockLoading, setIsMockLoading] = useState(false);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [ariaMessage, setAriaMessage] = useState("");
  const { compareItems, removeByIndex, clearCompare, compareCount, addToCompare } = useComparisonStore();
  const { getProductsByIds, products: _cacheSignal } = useProductsContext();

  // Track previous count for ARIA-live announcements
  const [prevCount, setPrevCount] = useState(compareCount);
  useEffect(() => {
    if (compareCount > prevCount) {
      setAriaMessage(`Produto adicionado. ${compareCount} produtos em comparação.`);
    } else if (compareCount < prevCount) {
      if (compareCount === 0) setAriaMessage("Comparação limpa.");
      else setAriaMessage(`Produto removido. ${compareCount} produtos em comparação.`);
    }
    setPrevCount(compareCount);
  }, [compareCount, prevCount]);

  // Keyboard shortcuts
  useComparisonShortcuts({
    onToggleDifferences: () => setDifferencesOnly(v => !v),
    onToggleRadar: () => setShowRadar(v => !v),
  });

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

  // Empty state with smart suggestions
  if (compareCount < 2) {
    const handleLoadMocks = async (ids: string[]) => {
      setIsMockLoading(true);
      toast.loading(`Iniciando simulação com ${ids.length} itens...`, { id: "mock-loading" });
      
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        let addedCount = 0;
        let skippedCount = 0;
        let limitReached = false;
        
        for (const id of ids) {
          if (compareItems.length + addedCount >= 12) {
            limitReached = true;
            break;
          }
          if (addToCompare(id)) {
            addedCount++;
          } else {
            skippedCount++;
          }
        }
        
        if (limitReached) {
          toast.warning(`Limite de 12 itens atingido. ${addedCount} adicionados.`, { id: "mock-loading" });
        } else if (addedCount > 0) {
          toast.success(`Simulação concluída: ${addedCount} itens na Arena${skippedCount > 0 ? ` (${skippedCount} duplicados ignorados)` : ""}`, { id: "mock-loading" });
        } else {
          toast.info("Todos os itens já estavam na Arena", { id: "mock-loading" });
        }
      } catch (error) {
        toast.error("Erro na simulação técnica", { id: "mock-loading" });
      } finally {
        setIsMockLoading(false);
      }
    };

    return (
      <>
        <PageSEO title="Comparar Produtos" description="Compare brindes lado a lado." path="/comparar"
          jsonLd={{ "@context": "https://schema.org", "@type": "WebPage", "name": "Comparar Produtos", "url": "https://criar-together-now.lovable.app/comparar" }} />
        <CompareEmptyStateSmart />
        <div className="flex flex-col items-center gap-4 pb-20">
          <div className="flex flex-wrap justify-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isMockLoading}
              className="gap-2 border-amber-500/30 hover:border-amber-500 bg-amber-500/5 font-black uppercase text-[10px] tracking-widest"
              onClick={() => handleLoadMocks(["26462", "26463", "26464"])}
            >
              {isMockLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-amber-500" />}
              Arena Rápida (3 Itens)
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isMockLoading}
              className="gap-2 border-amber-500/30 hover:border-amber-500 bg-amber-500/5 font-black uppercase text-[10px] tracking-widest"
              onClick={() => handleLoadMocks(["26462", "26463", "26464", "26465", "26466", "26467", "26468", "26469", "26470", "26471", "26472", "26473"])}
            >
              {isMockLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <List className="h-3 w-3 text-amber-500" />}
              Arena Total (12 Itens)
            </Button>
          </div>
          <p className="text-[10px] text-amber-600/50 uppercase tracking-[0.2em] font-black">
            Laboratório de Engenharia / 10.10 Final
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* ARIA-live region for accessibility announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{ariaMessage}</div>

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
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
                </TooltipTrigger>
                <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Voltar para página anterior</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div>
              <h1 data-testid="page-title-comparador" className="text-xl lg:text-3xl font-display font-bold text-foreground">Comparador de Produtos</h1>
              <p className="text-muted-foreground">
                Comparando {compareCount} produtos
                {client && <> · <span className="text-primary font-medium">{client.name}</span></>}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Popover>
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant={client ? "default" : "outline"} size="sm" className={cn(client && "bg-amber-500 hover:bg-amber-600 border-none")}>
                      <Building2 className="h-4 w-4 mr-2" />
                      {client ? client.name.slice(0, 22) : "Vincular Cliente"}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Vincular comparação a um cliente</TooltipContent>
              </Tooltip>
            </TooltipProvider>
              <PopoverContent align="end" className="w-80 p-3">
                <FavoritesClientPicker
                  selectedClientId={client?.id ?? null}
                  selectedClientName={client?.name ?? null}
                  onSelect={setClient}
                />
              </PopoverContent>
            </Popover>
            <RecentComparisonsSidebar />
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={differencesOnly ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifferencesOnly(v => !v)}
                    aria-pressed={differencesOnly}
                    className={cn(differencesOnly && "bg-amber-500 hover:bg-amber-600 border-none")}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {differencesOnly ? "Confronto Ativo" : "Só Diferenças"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Destacar apenas atributos diferentes entre os produtos <kbd className="ml-1 px-1 py-0.5 rounded-lg bg-primary-foreground/20 text-primary-foreground text-[10px] font-mono">D</kbd></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="sm" onClick={handleCreateQuote} className="bg-amber-500 hover:bg-amber-600 border-none font-bold">
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Orçamento
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Enviar produtos comparados para novo orçamento</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ComparisonPresentationLauncher products={products} formatCurrency={formatCurrency} />
            <ExportComparisonButton products={products} formatCurrency={formatCurrency} />
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                    <Share2 className="h-4 w-4 mr-2" />Compartilhar
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Gerar link público de comparação</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => { 
                    clearCompare(); 
                    toast.success("Comparação limpa");
                    navigate("/comparar"); 
                  }} className="text-destructive hover:bg-destructive/10 border-destructive/20">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Tudo
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Remover todos os produtos da comparação</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Mobile carousel view (<768px) */}
        <ComparisonMobileView
          products={products}
          formatCurrency={formatCurrency}
          onRemove={removeByIndex}
          onProductClick={(id) => navigate(`/produto/${id}`)}
        />

        {/* Desktop view (>=768px) */}
        <div className="hidden md:block space-y-4">
          {/* Resumo Técnico (Dashboard Mock/Demo) */}
          <ComparisonSummaryDashboard products={products} />

          {/* Score + Radar */}
          <div className={cn("grid grid-cols-1 gap-4", showRadar && "lg:grid-cols-2")}>
            <ComparisonScoreCard products={products} />
            {showRadar && <ComparisonRadarChart products={products} />}
          </div>
          <AIComparisonAdvisor products={products} />

          {/* Duel mode toggle (only visible when 2 products) */}
          {compareCount === 2 && (
            <div className="flex items-center justify-center">
              <Button
                size="sm"
                variant={duelMode ? "default" : "outline"}
                onClick={() => setDuelMode(v => !v)}
              >
                <Swords className="h-4 w-4 mr-2" />
                {duelMode ? "Modo Duelo ativo" : "Ativar Modo Duelo"}
              </Button>
            </div>
          )}

          {compareCount === 2 && duelMode ? (
            <ComparisonDuelView
              products={products}
              formatCurrency={formatCurrency}
              onRemove={removeByIndex}
              onProductClick={(id) => navigate(`/produto/${id}`)}
            />
          ) : (
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
                      <div
                        key={`card-${entry.index}`}
                        data-compare-product={entry.index}
                        tabIndex={-1}
                        className="p-4 rounded-lg bg-card border-[1.5px] border-primary/20 hover:border-primary/50 hover:shadow-xl card-lift transition-all duration-300 space-y-3 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
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
                          <TooltipProvider >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button aria-label="Remover" onClick={() => removeByIndex(entry.index)} className="p-1 rounded-full hover:bg-destructive/20 transition-colors">
                                  <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">Remover este produto</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                <CompareTableView
                  entries={compareEntries}
                  products={products}
                  formatCurrency={formatCurrency}
                  getStockStatusLabel={getStockStatusLabel}
                  onRemove={removeByIndex}
                  differencesOnly={differencesOnly}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Bottom rail — Compare também com... */}
          <SimilarProductsRail products={products} formatCurrency={formatCurrency} />
        </div>
      </div>
    </>
  );
}
