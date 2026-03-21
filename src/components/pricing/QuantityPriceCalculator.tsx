import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalRpc } from '@/lib/external-rpc';
import { useExternalProductSearch } from '@/hooks/useExternalSimulator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calculator, 
  TrendingDown, 
  Clock, 
  Palette,
  Ruler,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Package,
  Paintbrush,
  Search,
  X,
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { 
  useCustomizationPricing, 
  PriceCalculation,
  PriceTier 
} from '@/hooks/useTecnicasUnificadas';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
import { logger } from "@/lib/logger";
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ============================================
// TYPES
// ============================================

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: any;
  category_name: string | null;
}

interface ProductTechnique {
  id: string;
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  componentName: string;
  locationName: string;
  locationCode: string;
  composedCode: string;
  maxWidth: number | null;
  maxHeight: number | null;
  maxArea: number | null;
  maxColors: number | null;
  isDefault: boolean;
}

interface SelectedTechniqueConfig {
  technique: ProductTechnique;
  colors: number;
  sizeOption: string;
  sizeModifier: number;
}

interface QuantityPriceCalculatorProps {
  productBasePrice?: number;
  productName?: string;
  onSelectTechnique?: (techniqueCode: string, calculation: PriceCalculation) => void;
  className?: string;
}

// ============================================
// FORMATTERS
// ============================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

// ============================================
// PRODUCT SEARCH
// ============================================

function ProductSearch({ 
  onSelect, 
  selectedProduct 
}: { 
  onSelect: (product: Product | null) => void;
  selectedProduct: Product | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { data: externalProducts, isLoading } = useExternalProductSearch(searchQuery);

  // Mapear produtos externos para o formato esperado
  const products = useMemo(() => {
    if (!externalProducts) return [];
    return externalProducts.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.sale_price || p.base_price || 0,
      images: p.images || (p.primary_image_url ? [p.primary_image_url] : []),
      category_name: null,
    }));
  }, [externalProducts]);

  if (selectedProduct && !isSearching) {
    return (
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              {selectedProduct.images?.[0] ? (
                <img 
                  src={selectedProduct.images[0]} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">{selectedProduct.name}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>SKU: {selectedProduct.sku}</span>
                <span>•</span>
                <span className="text-primary font-medium">{formatCurrency(selectedProduct.price)}</span>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => {
              onSelect(null);
              setIsSearching(true);
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produto por nome ou SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {products && products.length > 0 && (
        <ScrollArea className="h-64">
          <div className="space-y-1">
            {products.map(product => (
              <button
                key={product.id}
                onClick={() => {
                  onSelect(product);
                  setIsSearching(false);
                  setSearchQuery('');
                }}
                className="w-full p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-left flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {product.images?.[0] ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.sku} • {formatCurrency(product.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {searchQuery.length >= 2 && products?.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum produto encontrado</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// TECHNIQUE MULTI-SELECTOR
// ============================================

function TechniqueMultiSelector({
  productId,
  selectedTechniques,
  onToggleTechnique,
}: {
  productId: string;
  selectedTechniques: SelectedTechniqueConfig[];
  onToggleTechnique: (technique: ProductTechnique, add: boolean) => void;
}) {
  const { data: techniques, isLoading, error } = useQuery({
    queryKey: ['product-techniques-multi', productId],
    queryFn: async (): Promise<ProductTechnique[]> => {
      try {
        const result = await invokeExternalRpc<any>(
          'fn_get_product_customization_options',
          { p_product_id: productId }
        );

        if (!result?.locations?.length) return [];

        const techList: ProductTechnique[] = [];
        for (const loc of result.locations) {
          for (const opt of loc.options || []) {
            techList.push({
              id: opt.technique_id,
              techniqueId: opt.technique_id,
              techniqueName: opt.tecnica_nome || 'Técnica',
              techniqueCode: opt.codigo_tabela || '',
              componentName: loc.location_name,
              locationName: loc.location_name,
              locationCode: loc.location_code,
              composedCode: opt.codigo_tabela,
              maxWidth: null,
              maxHeight: null,
              maxArea: null,
              maxColors: opt.max_cores ?? null,
              isDefault: false,
            });
          }
        }
        return techList;
      } catch (err) {
        logger.warn('Error fetching techniques via v6:', err);
        return [];
      }
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
        <AlertCircle className="w-5 h-5 mb-2" />
        <p>Erro ao carregar técnicas</p>
      </div>
    );
  }

  if (!techniques?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Este produto não possui técnicas de personalização cadastradas</p>
      </div>
    );
  }

  const grouped = techniques.reduce((acc, tech) => {
    if (!acc[tech.componentName]) acc[tech.componentName] = [];
    acc[tech.componentName].push(tech);
    return acc;
  }, {} as Record<string, ProductTechnique[]>);

  const isSelected = (techId: string) => selectedTechniques.some(st => st.technique.id === techId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Selecione uma ou mais técnicas de gravação para comparar
      </p>
      {Object.entries(grouped).map(([componentName, techs]) => (
        <div key={componentName} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Package className="w-4 h-4" />
            {componentName}
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {techs.map(tech => {
              const selected = isSelected(tech.id);
              return (
                <button
                  key={tech.id}
                  onClick={() => onToggleTechnique(tech, !selected)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    selected
                      ? "bg-primary/10 border-primary ring-1 ring-primary"
                      : "bg-card hover:bg-accent border-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selected} className="pointer-events-none" />
                      <span className="font-medium">{tech.techniqueName}</span>
                    </div>
                    {tech.isDefault && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Padrão
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1 ml-6">
                    <p>Local: {tech.locationName}</p>
                    <div className="flex items-center gap-3">
                      {tech.maxWidth && tech.maxHeight && (
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3 h-3" />
                          {tech.maxWidth}x{tech.maxHeight}cm
                        </span>
                      )}
                      {tech.maxColors && (
                        <span className="flex items-center gap-1">
                          <Palette className="w-3 h-3" />
                          {tech.maxColors} cor{tech.maxColors > 1 ? 'es' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// TECHNIQUE CONFIG CARD
// ============================================

const availableSizes = [
  { label: 'Pequeno (até 5cm²)', value: 'small', modifier: 0.8 },
  { label: 'Padrão (até 20cm²)', value: 'standard', modifier: 1 },
  { label: 'Grande (até 50cm²)', value: 'large', modifier: 1.3 },
  { label: 'Extra Grande (50cm²+)', value: 'xlarge', modifier: 1.6 },
];

function TechniqueConfigCard({
  config,
  onUpdate,
  onRemove,
}: {
  config: SelectedTechniqueConfig;
  onUpdate: (updated: SelectedTechniqueConfig) => void;
  onRemove: () => void;
}) {
  const { technique, colors, sizeOption } = config;
  const maxColors = technique.maxColors || 4;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Paintbrush className="w-4 h-4 text-primary" />
              {technique.techniqueName}
            </CardTitle>
            <CardDescription className="text-xs">
              {technique.componentName} • {technique.locationName}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Colors */}
        <div className="space-y-2">
          <label className="text-xs font-medium flex items-center gap-1">
            <Palette className="w-3 h-3" />
            Cores
          </label>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: maxColors }, (_, i) => i + 1).map(num => (
              <Button
                key={num}
                variant={colors === num ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onUpdate({ ...config, colors: num })}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="space-y-2">
          <label className="text-xs font-medium flex items-center gap-1">
            <Ruler className="w-3 h-3" />
            Tamanho
          </label>
          <Select 
            value={sizeOption} 
            onValueChange={(val) => {
              const modifier = availableSizes.find(s => s.value === val)?.modifier || 1;
              onUpdate({ ...config, sizeOption: val, sizeModifier: modifier });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableSizes.map(size => (
                <SelectItem key={size.value} value={size.value} className="text-xs">
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// QUANTITY COMPARISON TABLE
// ============================================

function QuantityComparisonTable({
  product,
  selectedConfigs,
  quantities,
}: {
  product: Product;
  selectedConfigs: SelectedTechniqueConfig[];
  quantities: number[];
}) {
  const { priceTables, calculatePrice } = useCustomizationPricing();

  const calculateForConfig = useCallback((config: SelectedTechniqueConfig, quantity: number) => {
    const { technique, colors, sizeModifier } = config;
    
    // Find matching price table
    const matchingTable = priceTables.find(t => 
      t.table_code.toLowerCase().includes(technique.techniqueCode.toLowerCase()) ||
      technique.techniqueCode.toLowerCase().includes(t.table_code.toLowerCase()) ||
      t.customization_type_name.toLowerCase().includes(technique.techniqueName.toLowerCase()) ||
      technique.techniqueName.toLowerCase().includes(t.customization_type_name.toLowerCase())
    );

    if (!matchingTable) return null;

    const calc = calculatePrice(matchingTable.table_code, quantity);
    if (!calc) return null;

    // Apply modifiers
    let modifiedUnitPrice = calc.unitPrice;
    
    if (colors > 1 && matchingTable.price_by_color) {
      modifiedUnitPrice *= (1 + (colors - 1) * 0.1);
    }
    
    modifiedUnitPrice *= sizeModifier;

    const customizationTotal = modifiedUnitPrice * quantity + calc.setupPrice;
    const productTotal = product.price * quantity;
    const grandTotal = productTotal + customizationTotal;
    const unitTotal = grandTotal / quantity;

    return {
      unitPrice: modifiedUnitPrice,
      customizationTotal,
      productTotal,
      grandTotal,
      unitTotal,
      slaDays: calc.slaDays,
    };
  }, [priceTables, calculatePrice, product.price]);

  if (selectedConfigs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Selecione técnicas para ver a comparação de preços</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px]">Técnica</TableHead>
              {quantities.map(qty => (
                <TableHead key={qty} className="text-center min-w-[100px]">
                  {formatNumber(qty)} un
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {selectedConfigs.map((config) => (
              <TableRow key={config.technique.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">{config.technique.techniqueName}</p>
                    <p className="text-xs text-muted-foreground">
                      {config.colors} cor{config.colors > 1 ? 'es' : ''} • {
                        availableSizes.find(s => s.value === config.sizeOption)?.label.split(' ')[0]
                      }
                    </p>
                  </div>
                </TableCell>
                {quantities.map(qty => {
                  const result = calculateForConfig(config, qty);
                  if (!result) {
                    return (
                      <TableCell key={qty} className="text-center text-xs text-muted-foreground">
                        N/D
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell key={qty} className="text-center">
                      <div className="space-y-1">
                        <p className="font-bold text-primary text-sm">
                          {formatCurrency(result.unitTotal)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total: {formatCurrency(result.grandTotal)}
                        </p>
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {/* Product only row */}
            <TableRow className="bg-muted/30">
              <TableCell>
                <div>
                  <p className="font-medium text-sm">Apenas Produto</p>
                  <p className="text-xs text-muted-foreground">Sem gravação</p>
                </div>
              </TableCell>
              {quantities.map(qty => (
                <TableCell key={qty} className="text-center">
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      {formatCurrency(product.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: {formatCurrency(product.price * qty)}
                    </p>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
        <p className="font-medium mb-1">Valores incluem:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Preço do produto ({formatCurrency(product.price)}/un)</li>
          <li>Custo de gravação por unidade</li>
          <li>Custo de setup (quando aplicável)</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function QuantityPriceCalculator({
  productBasePrice = 0,
  productName,
  onSelectTechnique,
  className,
}: QuantityPriceCalculatorProps) {
  const { priceTables, isLoading: pricingLoading } = useCustomizationPricing();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedConfigs, setSelectedConfigs] = useState<SelectedTechniqueConfig[]>([]);
  const [customQuantities, setCustomQuantities] = useState<number[]>([250, 500, 1000, 2500, 5000]);
  const [newQuantity, setNewQuantity] = useState('');

  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    setSelectedConfigs([]);
  }, []);

  const handleToggleTechnique = useCallback((technique: ProductTechnique, add: boolean) => {
    if (add) {
      setSelectedConfigs(prev => [...prev, {
        technique,
        colors: 1,
        sizeOption: 'standard',
        sizeModifier: 1,
      }]);
    } else {
      setSelectedConfigs(prev => prev.filter(c => c.technique.id !== technique.id));
    }
  }, []);

  const handleUpdateConfig = useCallback((index: number, updated: SelectedTechniqueConfig) => {
    setSelectedConfigs(prev => {
      const newConfigs = [...prev];
      newConfigs[index] = updated;
      return newConfigs;
    });
  }, []);

  const handleRemoveConfig = useCallback((index: number) => {
    setSelectedConfigs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddQuantity = useCallback(() => {
    const qty = parseInt(newQuantity);
    if (qty > 0 && !customQuantities.includes(qty)) {
      setCustomQuantities(prev => [...prev, qty].sort((a, b) => a - b));
      setNewQuantity('');
    }
  }, [newQuantity, customQuantities]);

  const handleRemoveQuantity = useCallback((qty: number) => {
    if (customQuantities.length > 1) {
      setCustomQuantities(prev => prev.filter(q => q !== qty));
    }
  }, [customQuantities.length]);

  if (pricingLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Step 1: Product Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">1. Selecione o Produto</CardTitle>
          </div>
          <CardDescription>
            Escolha o produto base para simular preços de gravação em diferentes tiragens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductSearch 
            onSelect={handleProductSelect}
            selectedProduct={selectedProduct}
          />
        </CardContent>
      </Card>

      {/* Step 2: Technique Selection */}
      {selectedProduct && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">2. Selecione as Técnicas de Gravação</CardTitle>
            </div>
            <CardDescription>
              Escolha uma ou mais técnicas para comparar preços
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TechniqueMultiSelector
              productId={selectedProduct.id}
              selectedTechniques={selectedConfigs}
              onToggleTechnique={handleToggleTechnique}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 3: Configure Techniques */}
      {selectedConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">3. Configure as Opções de Cada Técnica</CardTitle>
            </div>
            <CardDescription>
              Defina cores e tamanho para cada técnica selecionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {selectedConfigs.map((config, index) => (
                <TechniqueConfigCard
                  key={config.technique.id}
                  config={config}
                  onUpdate={(updated) => handleUpdateConfig(index, updated)}
                  onRemove={() => handleRemoveConfig(index)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Quantities and Comparison */}
      {selectedProduct && selectedConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg">4. Compare Preços por Tiragem</CardTitle>
            </div>
            <CardDescription>
              Veja como o preço por unidade muda conforme a quantidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quantity pills */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tiragens para comparar:</label>
              <div className="flex flex-wrap gap-2">
                {customQuantities.map(qty => (
                  <Badge 
                    key={qty} 
                    variant="secondary"
                    className="pl-3 pr-1 py-1 flex items-center gap-1"
                  >
                    {formatNumber(qty)}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-destructive/20"
                      onClick={() => handleRemoveQuantity(qty)}
                      disabled={customQuantities.length <= 1}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    placeholder="Nova qtd"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-24 h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddQuantity()}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={handleAddQuantity}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <QuantityComparisonTable
              product={selectedProduct}
              selectedConfigs={selectedConfigs}
              quantities={customQuantities}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default QuantityPriceCalculator;
