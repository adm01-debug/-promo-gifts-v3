import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calculator, 
  Package, 
  Search,
  Paintbrush,
  Palette,
  Ruler,
  Clock,
  TrendingDown,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useCustomizationPricing, 
  PriceCalculation,
  PriceTier,
  extractPriceTiers,
} from '@/hooks/useCustomizationPricing';

// ============================================
// TIPOS
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

interface SimulationResult {
  technique: ProductTechnique;
  priceCalculation: PriceCalculation | null;
  productTotal: number;
  customizationTotal: number;
  grandTotal: number;
  unitTotal: number;
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
// STEP INDICATOR
// ============================================

function StepIndicator({ 
  step, 
  currentStep, 
  label, 
  isComplete 
}: { 
  step: number; 
  currentStep: number;
  label: string;
  isComplete: boolean;
}) {
  const isActive = step === currentStep;
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
        isComplete ? "bg-green-500 text-white" :
        isActive ? "bg-primary text-primary-foreground" :
        "bg-muted text-muted-foreground"
      )}>
        {isComplete ? <Check className="w-4 h-4" /> : step}
      </div>
      <span className={cn(
        "text-sm font-medium hidden sm:inline",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}>
        {label}
      </span>
      {step < 4 && (
        <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:inline" />
      )}
    </div>
  );
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

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, price, images, category_name')
        .or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(20);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: searchQuery.length >= 2,
  });

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
// TECHNIQUE SELECTOR - WIZARD SEQUENCIAL
// ============================================

interface ComponentData {
  id: string;
  name: string;
  code: string;
  locations: LocationData[];
}

interface LocationData {
  id: string;
  name: string;
  code: string;
  maxWidth: number | null;
  maxHeight: number | null;
  maxArea: number | null;
  techniques: TechniqueData[];
}

interface TechniqueData {
  id: string;
  techniqueId: string;
  name: string;
  code: string;
  composedCode: string;
  maxColors: number | null;
  isDefault: boolean;
}

function TechniqueSelector({
  productId,
  onSelect,
  selectedTechnique,
}: {
  productId: string;
  onSelect: (technique: ProductTechnique | null) => void;
  selectedTechnique: ProductTechnique | null;
}) {
  const [selectedComponent, setSelectedComponent] = useState<ComponentData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const { data: components, isLoading, error } = useQuery({
    queryKey: ['product-components-hierarchy', productId],
    queryFn: async () => {
      const { data: comps, error: compError } = await supabase
        .from('product_components')
        .select(`
          id,
          component_name,
          component_code,
          product_component_locations (
            id,
            location_name,
            location_code,
            max_width_cm,
            max_height_cm,
            max_area_cm2,
            product_component_location_techniques (
              id,
              technique_id,
              composed_code,
              is_default,
              max_colors,
              personalization_techniques (
                id,
                name,
                code
              )
            )
          )
        `)
        .eq('product_id', productId)
        .eq('is_active', true)
        .eq('is_personalizable', true);

      if (compError) throw compError;
      if (!comps?.length) return [];

      // Transform into hierarchical structure
      const result: ComponentData[] = comps.map(comp => ({
        id: comp.id,
        name: comp.component_name,
        code: comp.component_code,
        locations: (comp.product_component_locations || []).map((loc: any) => ({
          id: loc.id,
          name: loc.location_name,
          code: loc.location_code,
          maxWidth: loc.max_width_cm,
          maxHeight: loc.max_height_cm,
          maxArea: loc.max_area_cm2,
          techniques: (loc.product_component_location_techniques || []).map((tech: any) => ({
            id: tech.id,
            techniqueId: tech.technique_id,
            name: tech.personalization_techniques?.name || 'Técnica',
            code: tech.personalization_techniques?.code || '',
            composedCode: tech.composed_code,
            maxColors: tech.max_colors,
            isDefault: tech.is_default || false,
          })),
        })).filter((loc: LocationData) => loc.techniques.length > 0),
      })).filter(comp => comp.locations.length > 0);

      return result;
    },
    enabled: !!productId,
  });

  // Reset selections when product changes
  useEffect(() => {
    setSelectedComponent(null);
    setSelectedLocation(null);
    onSelect(null);
  }, [productId]);

  const handleComponentSelect = (comp: ComponentData) => {
    setSelectedComponent(comp);
    setSelectedLocation(null);
    onSelect(null);
    
    // Auto-select if only one location
    if (comp.locations.length === 1) {
      handleLocationSelect(comp.locations[0], comp);
    }
  };

  const handleLocationSelect = (loc: LocationData, comp: ComponentData = selectedComponent!) => {
    setSelectedLocation(loc);
    onSelect(null);
    
    // Auto-select if only one technique or has default
    const defaultTech = loc.techniques.find(t => t.isDefault);
    if (loc.techniques.length === 1 || defaultTech) {
      const techToSelect = defaultTech || loc.techniques[0];
      handleTechniqueSelect(techToSelect, loc, comp);
    }
  };

  const handleTechniqueSelect = (
    tech: TechniqueData, 
    loc: LocationData = selectedLocation!, 
    comp: ComponentData = selectedComponent!
  ) => {
    const fullTechnique: ProductTechnique = {
      id: tech.id,
      techniqueId: tech.techniqueId,
      techniqueName: tech.name,
      techniqueCode: tech.code,
      componentName: comp.name,
      locationName: loc.name,
      locationCode: loc.code,
      composedCode: tech.composedCode,
      maxWidth: loc.maxWidth,
      maxHeight: loc.maxHeight,
      maxArea: loc.maxArea,
      maxColors: tech.maxColors,
      isDefault: tech.isDefault,
    };
    onSelect(fullTechnique);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
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

  if (!components?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Este produto não possui técnicas de personalização cadastradas</p>
      </div>
    );
  }

  const wizardStep = !selectedComponent ? 1 : !selectedLocation ? 2 : !selectedTechnique ? 3 : 4;

  return (
    <div className="space-y-4">
      {/* Mini step indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={cn("px-2 py-1 rounded", wizardStep >= 1 ? "bg-primary/20 text-primary font-medium" : "bg-muted")}>
          Componente
        </span>
        <ChevronRight className="w-3 h-3" />
        <span className={cn("px-2 py-1 rounded", wizardStep >= 2 ? "bg-primary/20 text-primary font-medium" : "bg-muted")}>
          Local
        </span>
        <ChevronRight className="w-3 h-3" />
        <span className={cn("px-2 py-1 rounded", wizardStep >= 3 ? "bg-primary/20 text-primary font-medium" : "bg-muted")}>
          Técnica
        </span>
      </div>

      {/* Step 1: Component Selection */}
      {!selectedComponent && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Qual parte do produto será personalizada?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {components.map(comp => (
              <button
                key={comp.id}
                onClick={() => handleComponentSelect(comp)}
                className="p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{comp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {comp.locations.length} {comp.locations.length === 1 ? 'local' : 'locais'} disponíveis
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Location Selection */}
      {selectedComponent && !selectedLocation && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Onde será a gravação em "{selectedComponent.name}"?</p>
            <Button variant="ghost" size="sm" onClick={() => setSelectedComponent(null)}>
              <X className="w-3 h-3 mr-1" /> Voltar
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {selectedComponent.locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => handleLocationSelect(loc)}
                className="p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                    <Ruler className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loc.maxWidth && loc.maxHeight ? `${loc.maxWidth}x${loc.maxHeight}cm` : 'Área variável'}
                      {' • '}
                      {loc.techniques.length} {loc.techniques.length === 1 ? 'técnica' : 'técnicas'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Technique Selection */}
      {selectedComponent && selectedLocation && !selectedTechnique && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Qual técnica de gravação?</p>
            <Button variant="ghost" size="sm" onClick={() => setSelectedLocation(null)}>
              <X className="w-3 h-3 mr-1" /> Voltar
            </Button>
          </div>
          <div className="grid gap-2">
            {selectedLocation.techniques.map(tech => (
              <button
                key={tech.id}
                onClick={() => handleTechniqueSelect(tech)}
                className="p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                      <Paintbrush className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{tech.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tech.code && `Código: ${tech.code}`}
                        {tech.maxColors && ` • Até ${tech.maxColors} cores`}
                      </p>
                    </div>
                  </div>
                  {tech.isDefault && (
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Recomendado
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected summary */}
      {selectedTechnique && (
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-medium">Técnica selecionada</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setSelectedComponent(null);
                setSelectedLocation(null);
                onSelect(null);
              }}
            >
              Alterar
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Componente</p>
              <p className="font-medium">{selectedTechnique.componentName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Local</p>
              <p className="font-medium">{selectedTechnique.locationName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Técnica</p>
              <p className="font-medium">{selectedTechnique.techniqueName}</p>
            </div>
          </div>
          {(selectedTechnique.maxWidth || selectedTechnique.maxColors) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              {selectedTechnique.maxWidth && selectedTechnique.maxHeight && (
                <span className="flex items-center gap-1">
                  <Ruler className="w-3 h-3" />
                  Área máx: {selectedTechnique.maxWidth}x{selectedTechnique.maxHeight}cm
                </span>
              )}
              {selectedTechnique.maxColors && (
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Até {selectedTechnique.maxColors} cores
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// CUSTOMIZATION OPTIONS
// ============================================

function CustomizationOptions({
  technique,
  colors,
  onColorsChange,
  sizeOption,
  onSizeChange,
  availableSizes,
}: {
  technique: ProductTechnique;
  colors: number;
  onColorsChange: (colors: number) => void;
  sizeOption: string;
  onSizeChange: (size: string) => void;
  availableSizes: { label: string; value: string; modifier: number }[];
}) {
  const maxColors = technique.maxColors || 4;

  return (
    <div className="space-y-6">
      {/* Colors */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          Número de Cores
        </label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: maxColors }, (_, i) => i + 1).map(num => (
            <Button
              key={num}
              variant={colors === num ? "default" : "outline"}
              size="sm"
              onClick={() => onColorsChange(num)}
              className="min-w-12"
            >
              {num} {num === 1 ? 'cor' : 'cores'}
            </Button>
          ))}
        </div>
      </div>

      {/* Size */}
      {availableSizes.length > 0 && (
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary" />
            Tamanho da Gravação
          </label>
          <Select value={sizeOption} onValueChange={onSizeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tamanho" />
            </SelectTrigger>
            <SelectContent>
              {availableSizes.map(size => (
                <SelectItem key={size.value} value={size.value}>
                  {size.label}
                  {size.modifier !== 1 && (
                    <span className="text-muted-foreground ml-2">
                      ({size.modifier > 1 ? '+' : ''}{((size.modifier - 1) * 100).toFixed(0)}%)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Area info */}
      {technique.maxWidth && technique.maxHeight && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <p className="text-muted-foreground">
            Área máxima de gravação: <strong>{technique.maxWidth} x {technique.maxHeight} cm</strong>
            {technique.maxArea && <span> ({technique.maxArea} cm²)</span>}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================
// QUANTITY AND RESULT
// ============================================

function QuantityAndResult({
  product,
  technique,
  colors,
  sizeModifier,
  quantity,
  onQuantityChange,
}: {
  product: Product;
  technique: ProductTechnique;
  colors: number;
  sizeModifier: number;
  quantity: number;
  onQuantityChange: (qty: number) => void;
}) {
  const { priceTables, calculatePrice, getTiers } = useCustomizationPricing();

  // Find matching price table for technique
  const matchingTable = useMemo(() => {
    // Try to match by technique code
    const codeMatch = priceTables.find(t => 
      t.table_code.toLowerCase().includes(technique.techniqueCode.toLowerCase()) ||
      technique.techniqueCode.toLowerCase().includes(t.table_code.toLowerCase())
    );
    if (codeMatch) return codeMatch;

    // Try to match by technique name
    return priceTables.find(t =>
      t.customization_type_name.toLowerCase().includes(technique.techniqueName.toLowerCase()) ||
      technique.techniqueName.toLowerCase().includes(t.customization_type_name.toLowerCase())
    );
  }, [priceTables, technique]);

  const priceCalc = useMemo(() => {
    if (!matchingTable) return null;
    const calc = calculatePrice(matchingTable.table_code, quantity);
    if (!calc) return null;

    // Apply modifiers
    let modifiedUnitPrice = calc.unitPrice;
    
    // Color modifier (example: +10% per extra color after first)
    if (colors > 1 && matchingTable.price_by_color) {
      modifiedUnitPrice *= (1 + (colors - 1) * 0.1);
    }
    
    // Size modifier
    modifiedUnitPrice *= sizeModifier;

    return {
      ...calc,
      unitPrice: modifiedUnitPrice,
      totalPrice: modifiedUnitPrice * quantity,
      grandTotal: modifiedUnitPrice * quantity + calc.setupPrice + calc.handlingPrice,
    };
  }, [matchingTable, calculatePrice, quantity, colors, sizeModifier]);

  const tiers = matchingTable ? getTiers(matchingTable.table_code) : [];

  const productTotal = product.price * quantity;
  const customizationTotal = priceCalc?.grandTotal || 0;
  const grandTotal = productTotal + customizationTotal;
  const unitTotal = grandTotal / quantity;

  const quickQuantities = [50, 100, 250, 500, 1000, 2500, 5000];

  return (
    <div className="space-y-6">
      {/* Quantity selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Quantidade</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={50000}
              value={quantity}
              onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-28 text-right"
            />
            <span className="text-sm text-muted-foreground">unidades</span>
          </div>
        </div>

        <Slider
          value={[quantity]}
          onValueChange={([val]) => onQuantityChange(val)}
          min={1}
          max={10000}
          step={1}
        />

        <div className="flex flex-wrap gap-2">
          {quickQuantities.map(qty => (
            <Button
              key={qty}
              variant={quantity === qty ? "default" : "outline"}
              size="sm"
              onClick={() => onQuantityChange(qty)}
            >
              {formatNumber(qty)}
            </Button>
          ))}
        </div>
      </div>

      {/* Result */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Resumo do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!matchingTable ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-5 h-5 mb-2" />
              <p className="font-medium">Tabela de preços não encontrada</p>
              <p className="text-sm mt-1">
                Não encontramos tabela de preços para "{technique.techniqueName}". 
                Verifique se a técnica está cadastrada nas tabelas de customização.
              </p>
            </div>
          ) : (
            <>
              {/* Price breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Produtos ({formatNumber(quantity)} x {formatCurrency(product.price)})
                  </span>
                  <span>{formatCurrency(productTotal)}</span>
                </div>
                
                {priceCalc && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Gravação ({formatNumber(quantity)} x {formatCurrency(priceCalc.unitPrice)})
                      </span>
                      <span>{formatCurrency(priceCalc.totalPrice)}</span>
                    </div>
                    
                    {priceCalc.setupPrice > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Setup</span>
                        <span>{formatCurrency(priceCalc.setupPrice)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="pt-2 border-t flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(grandTotal)}</span>
                </div>

                <div className="text-sm text-center text-muted-foreground">
                  = {formatCurrency(unitTotal)} por unidade
                </div>
              </div>

              {/* Savings */}
              {priceCalc?.savings && priceCalc.savings.percentageOff > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Economia de {priceCalc.savings.percentageOff}% 
                    ({formatCurrency(priceCalc.savings.comparedToMin)})
                  </span>
                </div>
              )}

              {/* SLA */}
              {priceCalc?.slaDays && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Prazo estimado: {priceCalc.slaDays} dias úteis</span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Price tiers */}
      {tiers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Faixas de preço</h4>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {tiers.slice(0, 10).map(tier => {
              const isActive = quantity >= tier.minQuantity && 
                (!tier.maxQuantity || quantity <= tier.maxQuantity);
              return (
                <div
                  key={tier.tierIndex}
                  className={cn(
                    "p-2 rounded-lg text-center text-xs transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <p className="font-medium">
                    {formatNumber(tier.minQuantity)}
                    {tier.maxQuantity ? ` - ${formatNumber(tier.maxQuantity)}` : '+'}
                  </p>
                  <p className="font-bold">{formatCurrency(tier.unitPrice)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProductPriceSimulator({ className }: { className?: string }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<ProductTechnique | null>(null);
  const [colors, setColors] = useState(1);
  const [sizeOption, setSizeOption] = useState('standard');
  const [quantity, setQuantity] = useState(100);

  // Mock sizes - ideally this would come from personalization_sizes table
  const availableSizes = [
    { label: 'Pequeno (até 5cm²)', value: 'small', modifier: 0.8 },
    { label: 'Padrão (até 20cm²)', value: 'standard', modifier: 1 },
    { label: 'Grande (até 50cm²)', value: 'large', modifier: 1.3 },
    { label: 'Extra Grande (50cm²+)', value: 'xlarge', modifier: 1.6 },
  ];

  const sizeModifier = availableSizes.find(s => s.value === sizeOption)?.modifier || 1;

  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    setSelectedTechnique(null);
    if (product) setCurrentStep(2);
    else setCurrentStep(1);
  }, []);

  const handleTechniqueSelect = useCallback((technique: ProductTechnique | null) => {
    setSelectedTechnique(technique);
    if (technique) setCurrentStep(3);
  }, []);

  const isStep1Complete = !!selectedProduct;
  const isStep2Complete = !!selectedTechnique;
  const isStep3Complete = colors > 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Simulador de Preços por Produto</CardTitle>
        </div>
        <CardDescription>
          Selecione o produto, técnica de gravação e quantidade para calcular o preço
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between pb-4 border-b">
          <StepIndicator step={1} currentStep={currentStep} label="Produto" isComplete={isStep1Complete} />
          <StepIndicator step={2} currentStep={currentStep} label="Técnica" isComplete={isStep2Complete} />
          <StepIndicator step={3} currentStep={currentStep} label="Opções" isComplete={isStep3Complete} />
          <StepIndicator step={4} currentStep={currentStep} label="Resultado" isComplete={false} />
        </div>

        {/* Step 1: Product */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              1. Selecione o Produto
            </h3>
            {currentStep > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
                Alterar
              </Button>
            )}
          </div>
          {currentStep === 1 && (
            <ProductSearch 
              onSelect={handleProductSelect} 
              selectedProduct={selectedProduct}
            />
          )}
          {currentStep > 1 && selectedProduct && (
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500" />
              <span>{selectedProduct.name}</span>
              <Badge variant="secondary">{formatCurrency(selectedProduct.price)}</Badge>
            </div>
          )}
        </div>

        {/* Step 2: Technique */}
        {currentStep >= 2 && selectedProduct && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-primary" />
                2. Escolha a Técnica de Gravação
              </h3>
              {currentStep > 2 && (
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
                  Alterar
                </Button>
              )}
            </div>
            {currentStep === 2 && (
              <TechniqueSelector
                productId={selectedProduct.id}
                onSelect={handleTechniqueSelect}
                selectedTechnique={selectedTechnique}
              />
            )}
            {currentStep > 2 && selectedTechnique && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>{selectedTechnique.techniqueName}</span>
                <Badge variant="outline">{selectedTechnique.locationName}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Options */}
        {currentStep >= 3 && selectedTechnique && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                3. Personalize as Opções
              </h3>
              {currentStep > 3 && (
                <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
                  Alterar
                </Button>
              )}
            </div>
            {currentStep === 3 && (
              <>
                <CustomizationOptions
                  technique={selectedTechnique}
                  colors={colors}
                  onColorsChange={setColors}
                  sizeOption={sizeOption}
                  onSizeChange={setSizeOption}
                  availableSizes={availableSizes}
                />
                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(4)}
                >
                  Calcular Preço
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
            {currentStep > 3 && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>{colors} cor{colors > 1 ? 'es' : ''}</span>
                <span>•</span>
                <span>{availableSizes.find(s => s.value === sizeOption)?.label}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Result */}
        {currentStep >= 4 && selectedProduct && selectedTechnique && (
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              4. Quantidade e Resultado
            </h3>
            <QuantityAndResult
              product={selectedProduct}
              technique={selectedTechnique}
              colors={colors}
              sizeModifier={sizeModifier}
              quantity={quantity}
              onQuantityChange={setQuantity}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductPriceSimulator;
