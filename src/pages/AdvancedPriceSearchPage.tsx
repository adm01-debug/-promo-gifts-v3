/**
 * Página: Busca Avançada por Preço
 * 
 * Permite ao vendedor filtrar produtos por:
 * - Categoria/tipo de produto
 * - Tiragem (quantidade mínima)
 * - Cores do produto
 * - Técnica de personalização
 * - Faixa de preço (com ou sem personalização)
 */

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Table2, 
  Package,
  Palette,
  Layers,
  DollarSign,
  Hash,
  RotateCcw,
  TrendingDown,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useProducts, Product } from '@/hooks/useProducts';
import { useExternalTechniques } from '@/hooks/useExternalDatabase';
import { fetchPromobrindPriceTables, PromobrindPriceTable } from '@/lib/external-db';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Formatador de moeda BRL
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// ============================================
// TYPES
// ============================================

interface SearchFilters {
  searchQuery: string;
  category: string;
  minQuantity: number;
  colors: string[];
  technique: string;
  priceType: 'with_personalization' | 'without_personalization';
  priceRange: [number, number];
}

interface ProductWithCalculatedPrice extends Product {
  calculatedUnitPrice: number;
  priceBreakdown: {
    productPrice: number;
    customizationPrice: number;
    setupPrice: number;
    handlingPrice: number;
    totalPerUnit: number;
  };
  matchingTechnique?: PromobrindPriceTable;
}

type ViewMode = 'cards' | 'table' | 'list';

const DEFAULT_FILTERS: SearchFilters = {
  searchQuery: '',
  category: 'all',
  minQuantity: 100,
  colors: [],
  technique: 'all',
  priceType: 'with_personalization',
  priceRange: [0, 100],
};

const QUANTITY_OPTIONS = [
  { value: 50, label: '50+ unidades' },
  { value: 100, label: '100+ unidades' },
  { value: 250, label: '250+ unidades' },
  { value: 500, label: '500+ unidades' },
  { value: 1000, label: '1.000+ unidades' },
  { value: 2500, label: '2.500+ unidades' },
  { value: 5000, label: '5.000+ unidades' },
];

// ============================================
// HELPER COMPONENTS
// ============================================

function FilterSection({ 
  title, 
  icon: Icon, 
  children 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  );
}

function PriceRangeDisplay({ range }: { range: [number, number] }) {
  return (
    <div className="flex justify-between text-sm mt-2">
      <span className="text-muted-foreground">
        {formatCurrency(range[0])}
      </span>
      <span className="text-muted-foreground">
        {formatCurrency(range[1])}
      </span>
    </div>
  );
}

function ProductCardResult({ 
  product, 
  quantity 
}: { 
  product: ProductWithCalculatedPrice; 
  quantity: number;
}) {
  const { priceBreakdown, matchingTechnique } = product;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
        <div className="aspect-square relative bg-muted/30">
          {product.image ? (
            <img loading="lazy" src={product.image} 
              alt={product.name}
              className="w-full h-full object-contain p-4"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          {matchingTechnique && (
            <Badge className="absolute top-2 right-2 bg-primary/90">
              {matchingTechnique.technique_name || matchingTechnique.customization_type_name}
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              SKU: {product.sku}
            </p>
          </div>
          
          {/* Cores disponíveis */}
          {product.colors && product.colors.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {product.colors.slice(0, 6).map((color, idx) => (
                <div
                  key={idx}
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: color.hex || '#ccc' }}
                  title={color.name}
                />
              ))}
              {product.colors.length > 6 && (
                <span className="text-xs text-muted-foreground">
                  +{product.colors.length - 6}
                </span>
              )}
            </div>
          )}

          {/* Breakdown de preço */}
          <div className="pt-2 border-t border-border/50 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Produto:</span>
              <span>{formatCurrency(priceBreakdown.productPrice)}</span>
            </div>
            {priceBreakdown.customizationPrice > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Personalização:</span>
                <span>{formatCurrency(priceBreakdown.customizationPrice)}</span>
              </div>
            )}
            {priceBreakdown.setupPrice > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Setup (÷{quantity}):</span>
                <span>{formatCurrency(priceBreakdown.setupPrice / quantity)}</span>
              </div>
            )}
            {priceBreakdown.handlingPrice > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Manuseio:</span>
                <span>{formatCurrency(priceBreakdown.handlingPrice)}</span>
              </div>
            )}
          </div>

          {/* Preço final */}
          <div className="flex items-end justify-between pt-2 border-t border-primary/20 bg-primary/5 -mx-4 px-4 py-2 -mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Preço unitário</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(priceBreakdown.totalPerUnit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{quantity} un.</p>
              <p className="text-sm font-medium">
                {formatCurrency(priceBreakdown.totalPerUnit * quantity)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ProductTableResult({ 
  products, 
  quantity 
}: { 
  products: ProductWithCalculatedPrice[]; 
  quantity: number;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Produto</th>
              <th className="text-left p-3 text-sm font-medium">SKU</th>
              <th className="text-left p-3 text-sm font-medium">Técnica</th>
              <th className="text-right p-3 text-sm font-medium">Produto</th>
              <th className="text-right p-3 text-sm font-medium">Gravação</th>
              <th className="text-right p-3 text-sm font-medium">Setup</th>
              <th className="text-right p-3 text-sm font-medium">Unit. Final</th>
              <th className="text-right p-3 text-sm font-medium">Total ({quantity})</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((product) => (
              <motion.tr 
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {product.image && (
                      <img loading="lazy" src={product.image} 
                        alt={product.name} 
                        className="w-10 h-10 object-contain rounded"
                        loading="lazy"
                      />
                    )}
                    <span className="text-sm font-medium line-clamp-1 max-w-[200px]">
                      {product.name}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-sm text-muted-foreground">{product.sku}</td>
                <td className="p-3">
                  {product.matchingTechnique && (
                    <Badge variant="outline" className="text-xs">
                      {product.matchingTechnique.technique_name || product.matchingTechnique.customization_type_name}
                    </Badge>
                  )}
                </td>
                <td className="p-3 text-right text-sm">
                  {formatCurrency(product.priceBreakdown.productPrice)}
                </td>
                <td className="p-3 text-right text-sm">
                  {formatCurrency(product.priceBreakdown.customizationPrice)}
                </td>
                <td className="p-3 text-right text-sm text-muted-foreground">
                  {formatCurrency(product.priceBreakdown.setupPrice / quantity)}
                </td>
                <td className="p-3 text-right">
                  <span className="font-semibold text-primary">
                    {formatCurrency(product.priceBreakdown.totalPerUnit)}
                  </span>
                </td>
                <td className="p-3 text-right font-medium">
                  {formatCurrency(product.priceBreakdown.totalPerUnit * quantity)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductListResult({ 
  products, 
  quantity 
}: { 
  products: ProductWithCalculatedPrice[]; 
  quantity: number;
}) {
  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Posição */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                </div>
                
                {/* Imagem */}
                <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-muted/50 overflow-hidden">
                  {product.image ? (
                    <img loading="lazy" src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
                  <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  {product.matchingTechnique && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {product.matchingTechnique.technique_name || product.matchingTechnique.customization_type_name}
                    </Badge>
                  )}
                </div>
                
                {/* Preço */}
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(product.priceBreakdown.totalPerUnit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(product.priceBreakdown.totalPerUnit * quantity)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdvancedPriceSearchPage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isSearching, setIsSearching] = useState(false);

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useProducts();
  
  // Fetch techniques
  const { data: techniques = [], isLoading: loadingTechniques } = useExternalTechniques();

  // Fetch price tables for selected technique
  const { data: priceTables = [], isLoading: loadingPrices } = useQuery({
    queryKey: ['price-tables-search', filters.technique, filters.minQuantity],
    queryFn: async () => {
      if (filters.technique === 'all') return [];
      return fetchPromobrindPriceTables({
        techniqueName: filters.technique,
        quantity: filters.minQuantity,
      });
    },
    enabled: filters.technique !== 'all',
  });

  // Get unique categories from products
  const categories = useMemo(() => {
    const cats = new Map<string, string>();
    products.forEach(p => {
      // category pode ser string ou objeto {id, name}
      const catName = typeof p.category === 'object' && p.category?.name 
        ? p.category.name 
        : (typeof p.category === 'string' ? p.category : null);
      if (catName && !cats.has(catName)) {
        cats.set(catName, catName);
      }
    });
    return Array.from(cats.values()).sort();
  }, [products]);

  // Get unique colors from products
  const availableColors = useMemo(() => {
    const colorMap = new Map<string, { name: string; hex: string }>();
    products.forEach(p => {
      p.colors?.forEach(c => {
        if (c.hex && !colorMap.has(c.hex)) {
          colorMap.set(c.hex, { name: c.name, hex: c.hex });
        }
      });
    });
    return Array.from(colorMap.values());
  }, [products]);

  // Calculate prices and filter products
  const filteredProducts = useMemo((): ProductWithCalculatedPrice[] => {
    if (!isSearching) return [];

    let result = products.filter(product => {
      // Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!product.name.toLowerCase().includes(query) && 
            !product.sku?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Category
      if (filters.category !== 'all') {
        const productCatName = typeof product.category === 'object' && product.category?.name 
          ? product.category.name 
          : (typeof product.category === 'string' ? product.category : null);
        if (productCatName !== filters.category) {
          return false;
        }
      }

      // Colors
      if (filters.colors.length > 0) {
        const productColorHexes = product.colors?.map(c => c.hex) || [];
        if (!filters.colors.some(c => productColorHexes.includes(c))) {
          return false;
        }
      }

      return true;
    });

    // Calculate prices for each product
    const withPrices: ProductWithCalculatedPrice[] = result.map(product => {
      const productPrice = product.price || 0;
      
      // Find matching price table for the technique
      let customizationPrice = 0;
      let setupPrice = 0;
      let handlingPrice = 0;
      let matchingTable: PromobrindPriceTable | undefined;

      if (filters.technique !== 'all' && priceTables.length > 0) {
        // Find best matching table for quantity
        matchingTable = priceTables.find(t => 
          t.min_quantity <= filters.minQuantity &&
          (t.max_quantity === null || t.max_quantity >= filters.minQuantity)
        ) || priceTables[0];

        if (matchingTable) {
          customizationPrice = matchingTable.unit_price || 0;
          setupPrice = matchingTable.setup_price || 0;
          handlingPrice = matchingTable.handling_price || 0;
        }
      }

      // Calculate total per unit
      const setupPerUnit = setupPrice / filters.minQuantity;
      const totalPerUnit = filters.priceType === 'with_personalization'
        ? productPrice + customizationPrice + setupPerUnit + handlingPrice
        : productPrice;

      return {
        ...product,
        calculatedUnitPrice: totalPerUnit,
        priceBreakdown: {
          productPrice,
          customizationPrice,
          setupPrice,
          handlingPrice,
          totalPerUnit,
        },
        matchingTechnique: matchingTable,
      };
    });

    // Filter by price range
    const priceFiltered = withPrices.filter(p => {
      const price = p.priceBreakdown.totalPerUnit;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Sort by price (lowest first)
    return priceFiltered.sort((a, b) => 
      a.priceBreakdown.totalPerUnit - b.priceBreakdown.totalPerUnit
    );
  }, [products, priceTables, filters, isSearching]);

  const handleSearch = () => {
    setIsSearching(true);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setIsSearching(false);
  };

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setIsSearching(false); // Reset search when filters change
  };

  const toggleColor = (hex: string) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors.includes(hex)
        ? prev.colors.filter(c => c !== hex)
        : [...prev.colors, hex]
    }));
    setIsSearching(false);
  };

  const isLoading = loadingProducts || loadingTechniques;

  return (
    <MainLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Busca Avançada por Preço</h1>
              <p className="text-muted-foreground text-sm">
                Encontre produtos que atendam ao orçamento do cliente
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[320px,1fr] gap-6">
          {/* Filters Panel */}
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Busca
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search */}
              <FilterSection title="Buscar Produto" icon={Search}>
                <Input
                  placeholder="Nome ou SKU..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilter('searchQuery', e.target.value)}
                />
              </FilterSection>

              {/* Category */}
              <FilterSection title="Categoria" icon={Package}>
                <Select 
                  value={filters.category} 
                  onValueChange={(v) => updateFilter('category', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterSection>

              {/* Quantity */}
              <FilterSection title="Tiragem Mínima" icon={Hash}>
                <Select 
                  value={filters.minQuantity.toString()} 
                  onValueChange={(v) => updateFilter('minQuantity', parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUANTITY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterSection>

              {/* Colors */}
              <FilterSection title="Cores" icon={Palette}>
                <ScrollArea className="h-24">
                  <div className="flex flex-wrap gap-2">
                    {availableColors.slice(0, 20).map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => toggleColor(color.hex)}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-all",
                          filters.colors.includes(color.hex) 
                            ? "border-primary scale-110 ring-2 ring-primary/30" 
                            : "border-border hover:scale-105"
                        )}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </ScrollArea>
                {filters.colors.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => updateFilter('colors', [])}
                  >
                    Limpar cores
                  </Button>
                )}
              </FilterSection>

              {/* Technique */}
              <FilterSection title="Técnica de Personalização" icon={Layers}>
                <Select 
                  value={filters.technique} 
                  onValueChange={(v) => updateFilter('technique', v)}
                  disabled={loadingTechniques}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a técnica" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sem personalização</SelectItem>
                    {techniques.map((tech: any) => (
                      <SelectItem key={tech.id} value={tech.name}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FilterSection>

              {/* Price Type Toggle */}
              <FilterSection title="Tipo de Preço" icon={DollarSign}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm">
                      {filters.priceType === 'with_personalization' 
                        ? 'Com personalização' 
                        : 'Sem personalização'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {filters.priceType === 'with_personalization'
                        ? 'Produto + Gravação + Setup + Manuseio'
                        : 'Apenas preço do produto'}
                    </p>
                  </div>
                  <Switch
                    checked={filters.priceType === 'with_personalization'}
                    onCheckedChange={(checked) => 
                      updateFilter('priceType', checked ? 'with_personalization' : 'without_personalization')
                    }
                    disabled={filters.technique === 'all'}
                  />
                </div>
              </FilterSection>

              {/* Price Range */}
              <FilterSection title="Faixa de Preço Unitário" icon={TrendingDown}>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Mínimo</Label>
                      <Input
                        type="number"
                        value={filters.priceRange[0]}
                        onChange={(e) => updateFilter('priceRange', [parseFloat(e.target.value) || 0, filters.priceRange[1]])}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Máximo</Label>
                      <Input
                        type="number"
                        value={filters.priceRange[1]}
                        onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], parseFloat(e.target.value) || 100])}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(v) => updateFilter('priceRange', v as [number, number])}
                    min={0}
                    max={200}
                    step={1}
                    className="mt-2"
                  />
                  <PriceRangeDisplay range={filters.priceRange} />
                </div>
              </FilterSection>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={handleSearch} 
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="space-y-4">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div>
                {isSearching ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{filteredProducts.length}</span> produtos encontrados
                    {filters.technique !== 'all' && (
                      <span> com <span className="text-primary">{filters.technique}</span></span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Configure os filtros e clique em "Buscar"
                  </p>
                )}
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                <Button
                  variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="aspect-square" />
                    <CardContent className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-6 w-1/3 mt-4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && isSearching && filteredProducts.length === 0 && (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-lg mb-2">
                    Nenhum produto encontrado
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Tente ajustar os filtros, como aumentar a faixa de preço ou reduzir a tiragem mínima.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Initial State */}
            {!isLoading && !isSearching && (
              <Card className="py-12 border-dashed">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Sparkles className="h-12 w-12 text-primary/50 mb-4" />
                  <h3 className="font-medium text-lg mb-2">
                    Encontre o produto ideal
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Configure os filtros ao lado: selecione a tiragem, técnica de gravação e faixa de preço desejada.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            <AnimatePresence mode="wait">
              {!isLoading && isSearching && filteredProducts.length > 0 && (
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {viewMode === 'cards' && (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredProducts.map(product => (
                        <ProductCardResult 
                          key={product.id} 
                          product={product} 
                          quantity={filters.minQuantity}
                        />
                      ))}
                    </div>
                  )}

                  {viewMode === 'table' && (
                    <ProductTableResult 
                      products={filteredProducts} 
                      quantity={filters.minQuantity}
                    />
                  )}

                  {viewMode === 'list' && (
                    <ProductListResult 
                      products={filteredProducts} 
                      quantity={filters.minQuantity}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
