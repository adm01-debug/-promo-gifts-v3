/**
 * ProductMatchPage — "Match" tool for sellers.
 * Side-by-side layout: selected product on the left, matches on the right.
 */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from '@/components/seo/PageSEO';

import { useProducts, type Product } from '@/hooks/useProducts';
import { useProductMatch, type MatchFilters, type MatchResult } from '@/hooks/useProductMatch';
import { MOCK_MATCH_PRODUCTS } from '@/data/mock-match-products';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Search,
  Target,
  ArrowRight,
  Package,
  Layers,
  Filter,
  Star,
  ExternalLink,
  Zap,
  Users,
  Tag,
  X,
  Sparkles,
  Link2,
  Equal,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import { getCdnUrl } from '@/utils/image-utils';
import Fuse from 'fuse.js';

const MATCH_TYPE_CONFIG = {
  identical: { label: 'Idêntico', icon: Equal, color: 'bg-primary text-primary-foreground' },
  similar: { label: 'Semelhante', icon: Layers, color: 'bg-info text-info-foreground' },
  complementary: { label: 'Complementar', icon: Link2, color: 'bg-warning text-warning-foreground' },
} as const;

function formatPrice(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function ProductSearchPanel({
  products,
  onSelect,
  selectedId,
}: {
  products: Product[];
  onSelect: (p: Product) => void;
  selectedId?: string;
}) {
  const [search, setSearch] = useState('');

  const fuse = useMemo(
    () =>
      new Fuse(products, {
        keys: ['name', 'sku', 'supplier_reference'],
        threshold: 0.35,
        minMatchCharLength: 2,
      }),
    [products]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 50);
    return fuse.search(search, { limit: 50 }).map((r) => r.item);
  }, [search, fuse, products]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      <ScrollArea className="h-[calc(100vh-22rem)]">
        <div className="space-y-1.5 pr-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all border',
                selectedId === p.id
                  ? 'bg-primary/10 border-primary/40 shadow-sm'
                  : 'bg-card/50 border-border/30 hover:bg-accent/50 hover:border-border/60'
              )}
            >
              <img
                src={getCdnUrl(p.images?.[0] || p.image_url || '/placeholder.svg', 'thumbnail')}
                alt={p.name}
                className="w-10 h-10 rounded-md object-cover bg-muted shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.sku} • {formatPrice(p.price)}</p>
              </div>
              {selectedId === p.id && <Target className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum produto encontrado</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SelectedProductCard({ product }: { product: Product }) {
  const navigate = useNavigate();
  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <img
            src={getCdnUrl(product.images?.[0] || product.image_url || '/placeholder.svg', 'small')}
            alt={product.name}
            className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="text-sm font-bold text-foreground leading-tight">{product.name}</h3>
            <p className="text-[11px] text-muted-foreground">SKU: {product.sku}</p>
            <p className="text-sm font-semibold text-foreground">{formatPrice(product.price)}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {product.category?.name && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{product.category.name}</Badge>
              )}
              {product.supplier?.name && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{product.supplier.name}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Tags summary */}
        {product.tags && (
          <div className="space-y-1.5">
            {product.tags.publicoAlvo?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Users className="h-3 w-3 text-primary shrink-0" />
                {product.tags.publicoAlvo.map(t => (
                  <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                ))}
              </div>
            )}
            {product.tags.nicho?.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="h-3 w-3 text-accent-foreground shrink-0" />
                {product.tags.nicho.map(t => (
                  <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs gap-1.5"
          onClick={() => navigate(`/produto/${product.id}`)}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
}

function MatchCard({ match, onNavigate }: { match: MatchResult; onNavigate: (id: string) => void }) {
  const navigate = useNavigate();
  const config = MATCH_TYPE_CONFIG[match.matchType];
  const Icon = config.icon;

  const handleAddToQuote = () => {
    const p = match.product;
    const params = new URLSearchParams({
      product_id: p.id,
      sku: p.sku,
      price: String(p.price),
      min_quantity: String(p.minQuantity || 1),
      ...(p.image_url ? { image: p.image_url } : {}),
    });
    navigate(`/orcamentos/novo?${params.toString()}`);
  };

  return (
    <Card className="border-border/40 hover:border-border/80 hover:shadow-md transition-all group">
      <CardContent className="p-3 flex items-start gap-3">
        <img
          src={getCdnUrl(match.product.images?.[0] || match.product.image_url || '/placeholder.svg', 'small')}
          alt={match.product.name}
          className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-foreground truncate">{match.product.name}</h4>
              <p className="text-[10px] text-muted-foreground">{match.product.sku} • {formatPrice(match.product.price)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className={cn('text-[9px] px-1.5 py-0 gap-0.5', config.color)}>
                <Icon className="h-2.5 w-2.5" />
                {config.label}
              </Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                {match.score}pts
              </Badge>
            </div>
          </div>

          {/* Reasons */}
          <div className="flex flex-wrap gap-1">
            {match.reasons.map((reason, i) => (
              <span key={i} className="inline-flex items-center text-[9px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                {reason}
              </span>
            ))}
          </div>

          {/* Category + Supplier */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {match.product.category?.name && <span>{match.product.category.name}</span>}
            {match.product.supplier?.name && (
              <>
                <span className="text-border">•</span>
                <span>{match.product.supplier.name}</span>
              </>
            )}
            {match.product.colors?.length > 0 && (
              <>
                <span className="text-border">•</span>
                <span>{match.product.colors.length} cores</span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] gap-1 px-2"
              onClick={handleAddToQuote}
            >
              <FileText className="h-3 w-3" />
              Orçamento
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[10px] gap-1 px-2"
              onClick={() => onNavigate(match.product.id)}
            >
              <ExternalLink className="h-3 w-3" />
              Detalhes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProductMatchPage() {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filters, setFilters] = useState<Partial<MatchFilters>>({
    minScore: 10,
    matchTypes: ['identical', 'similar', 'complementary'],
    onlyInStock: false,
  });

  // Load all products for matching — fall back to mock data when DB is empty
  const { data: dbProducts = [] } = useProducts({ limit: 500 });
  const allProducts = dbProducts.length > 0 ? dbProducts : MOCK_MATCH_PRODUCTS;

  const { matches } = useProductMatch(selectedProduct, allProducts, filters);

  // Derive unique categories and suppliers for filter dropdowns
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allProducts.forEach(p => p.category?.name && cats.add(p.category.name));
    return [...cats].sort();
  }, [allProducts]);

  const suppliers = useMemo(() => {
    const sups = new Set<string>();
    allProducts.forEach(p => p.supplier?.name && sups.add(p.supplier.name));
    return [...sups].sort();
  }, [allProducts]);

  // Stats
  const stats = useMemo(() => {
    const byType = { identical: 0, similar: 0, complementary: 0 };
    matches.forEach(m => byType[m.matchType]++);
    return byType;
  }, [matches]);

  const toggleMatchType = useCallback((type: MatchResult['matchType']) => {
    setFilters(prev => {
      const current = prev.matchTypes || ['identical', 'similar', 'complementary'];
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      return { ...prev, matchTypes: updated.length > 0 ? updated : current };
    });
  }, []);

  return (
    <MainLayout>
      <PageSEO
        title="Match de Produtos"
        description="Encontre produtos idênticos, semelhantes e complementares para venda cruzada."
        path="/match"
      />

      <div className="max-w-[1600px] mx-auto space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Match de Produtos</h1>
              <p className="text-xs text-muted-foreground">
                Encontre produtos idênticos, semelhantes e complementares
              </p>
            </div>
          </div>

          {selectedProduct && matches.length > 0 && (
            <div className="flex items-center gap-2">
              {(Object.entries(MATCH_TYPE_CONFIG) as [MatchResult['matchType'], typeof MATCH_TYPE_CONFIG[keyof typeof MATCH_TYPE_CONFIG]][]).map(([type, cfg]) => {
                const Icon = cfg.icon;
                const count = stats[type];
                const active = (filters.matchTypes || []).includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleMatchType(type)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all',
                      active
                        ? `${cfg.color} border-transparent shadow-sm`
                        : 'bg-muted/50 text-muted-foreground border-border/40 opacity-60 hover:opacity-100'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                    <span className="ml-1 text-[10px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main grid: Search | Selected + Filters | Matches */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_300px_1fr] gap-4 xl:gap-5">
          {/* Column 1: Product search */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Search className="h-3.5 w-3.5" />
              Buscar Produto
            </div>
            <ProductSearchPanel
              products={allProducts}
              onSelect={setSelectedProduct}
              selectedId={selectedProduct?.id}
            />
          </div>

          {/* Column 2: Selected product + Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Target className="h-3.5 w-3.5" />
              Produto Selecionado
            </div>

            {selectedProduct ? (
              <>
                <SelectedProductCard product={selectedProduct} />

                {/* Filters */}
                <Card className="border-border/30">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                      <Filter className="h-3.5 w-3.5 text-primary" />
                      Filtros Inteligentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    {/* Category filter */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Categoria</label>
                      <Select
                        value={filters.categoryFilter || '__all__'}
                        onValueChange={(v) =>
                          setFilters((f) => ({ ...f, categoryFilter: v === '__all__' ? undefined : v }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todas as categorias</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Supplier filter */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Fornecedor</label>
                      <Select
                        value={filters.supplierFilter || '__all__'}
                        onValueChange={(v) =>
                          setFilters((f) => ({ ...f, supplierFilter: v === '__all__' ? undefined : v }))
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">Todos os fornecedores</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Min score */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground">Score mínimo</label>
                      <Select
                        value={String(filters.minScore || 10)}
                        onValueChange={(v) => setFilters((f) => ({ ...f, minScore: Number(v) }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5+ (todos)</SelectItem>
                          <SelectItem value="10">10+ (relevante)</SelectItem>
                          <SelectItem value="25">25+ (forte)</SelectItem>
                          <SelectItem value="50">50+ (muito forte)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* In stock only */}
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-medium text-muted-foreground">Apenas em estoque</label>
                      <Switch
                        checked={filters.onlyInStock || false}
                        onCheckedChange={(v) => setFilters((f) => ({ ...f, onlyInStock: v }))}
                      />
                    </div>

                    {/* Clear filters */}
                    {(filters.categoryFilter || filters.supplierFilter || filters.onlyInStock) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs gap-1.5 text-destructive"
                        onClick={() =>
                          setFilters({
                            minScore: 10,
                            matchTypes: ['identical', 'similar', 'complementary'],
                            onlyInStock: false,
                          })
                        }
                      >
                        <X className="h-3 w-3" />
                        Limpar filtros
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-dashed border-border/40">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-3 rounded-full bg-muted/50">
                    <Target className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selecione um produto na lista ao lado para encontrar matches
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Column 3: Matches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                Matches Encontrados
                {matches.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">{matches.length}</Badge>
                )}
              </div>
            </div>

            {!selectedProduct ? (
              <Card className="border-dashed border-border/40">
                <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Zap className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground/60">Nenhum produto selecionado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Busque e selecione um produto para encontrar matches automáticos
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : matches.length === 0 ? (
              <Card className="border-dashed border-border/40">
                <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-4 rounded-full bg-muted/50">
                    <Package className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground/60">Nenhum match encontrado</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tente reduzir o score mínimo ou remover filtros
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-14rem)]">
                <div className="space-y-2 pr-3">
                  {matches.map((match) => (
                    <MatchCard
                      key={match.product.id}
                      match={match}
                      onNavigate={(id) => navigate(`/produto/${id}`)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
