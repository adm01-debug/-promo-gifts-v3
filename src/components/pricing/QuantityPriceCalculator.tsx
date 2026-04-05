import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invokeExternalRpc } from '@/lib/external-rpc';
import { useExternalProductSearch } from '@/hooks/useExternalSimulator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Palette,
  Ruler,
  Check,
  Sparkles,
  Package,
  Paintbrush,
  X,
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Trophy,
} from 'lucide-react';
import { 
  useCustomizationPricing, 
  PriceCalculation,
} from '@/hooks/useTecnicasUnificadas';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { logger } from "@/lib/logger";

// #3 — Reusar ProductSearch unificado
import { ProductSearch as UnifiedProductSearch } from './simulator/ProductSearch';

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
// QUANTITY COMPARISON TABLE — #6 Highlight
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
    
    const matchingTable = priceTables.find(t => 
      t.table_code.toLowerCase().includes(technique.techniqueCode.toLowerCase()) ||
      technique.techniqueCode.toLowerCase().includes(t.table_code.toLowerCase()) ||
      t.customization_type_name.toLowerCase().includes(technique.techniqueName.toLowerCase()) ||
      technique.techniqueName.toLowerCase().includes(t.customization_type_name.toLowerCase())
    );

    if (!matchingTable) return null;

    const calc = calculatePrice(matchingTable.table_code, quantity);
    if (!calc) return null;

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

  // #6 — Find best unit price per config
  const bestPricePerConfig = useMemo(() => {
    const map = new Map<string, number>();
    selectedConfigs.forEach(config => {
      let bestQty = -1;
      let bestUnit = Infinity;
      quantities.forEach(qty => {
        const result = calculateForConfig(config, qty);
        if (result && result.unitTotal < bestUnit) {
          bestUnit = result.unitTotal;
          bestQty = qty;
        }
      });
      if (bestQty > 0) map.set(config.technique.id, bestQty);
    });
    return map;
  }, [selectedConfigs, quantities, calculateForConfig]);

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
                  const isBest = bestPricePerConfig.get(config.technique.id) === qty;
                  if (!result) {
                    return (
                      <TableCell key={qty} className="text-center text-xs text-muted-foreground">
                        N/D
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell
                      key={qty}
                      className={cn(
                        "text-center relative",
                        isBest && "bg-success/10 border border-success/30 rounded-lg"
                      )}
                    >
                      {isBest && (
                        <Trophy className="w-3 h-3 text-success absolute top-1 right-1" />
                      )}
                      <div className="space-y-1">
                        <p className={cn("font-bold text-sm", isBest ? "text-success" : "text-primary")}>
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
  const navigate = useNavigate();
  const { priceTables, isLoading: pricingLoading } = useCustomizationPricing();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedConfigs, setSelectedConfigs] = useState<SelectedTechniqueConfig[]>([]);
  const [customQuantities, setCustomQuantities] = useState<number[]>([250, 500, 1000, 2500, 5000]);
  const [newQuantity, setNewQuantity] = useState('');

  const handleProductSelect = useCallback((product: any | null) => {
    if (!product) {
      setSelectedProduct(null);
      setSelectedConfigs([]);
      return;
    }
    setSelectedProduct({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      images: product.images,
      category_name: null,
    });
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

  const handleCreateQuote = useCallback(() => {
    navigate('/orcamentos', {
      state: {
        fromSimulator: true,
        product: selectedProduct,
        techniques: selectedConfigs,
        quantities: customQuantities,
      },
    });
  }, [navigate, selectedProduct, selectedConfigs, customQuantities]);

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
      {/* Step 1: Product Selection — #3 usando search unificado */}
      <Card className="animate-fade-in">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-display">1. Selecione o Produto</CardTitle>
          </div>
          <CardDescription>
            Escolha o produto base para simular preços de gravação em diferentes tiragens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedProductSearch 
            onSelect={handleProductSelect}
            selectedProduct={selectedProduct as any}
          />
        </CardContent>
      </Card>

      {/* Step 2: Technique Selection */}
      {selectedProduct && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Paintbrush className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-display">2. Selecione as Técnicas de Gravação</CardTitle>
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
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-display">3. Configure as Opções</CardTitle>
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

      {/* Step 4: Quantities and Comparison — #8 highlight */}
      {selectedProduct && selectedConfigs.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-display">4. Compare Preços por Tiragem</CardTitle>
            </div>
            <CardDescription>
              Veja como o preço por unidade muda conforme a quantidade. <Trophy className="inline w-3 h-3 text-success" /> = melhor preço.
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

            {/* Comparison Table with highlight */}
            <QuantityComparisonTable
              product={selectedProduct}
              selectedConfigs={selectedConfigs}
              quantities={customQuantities}
            />

            {/* #9 — CTA Criar Orçamento */}
            <Button
              size="lg"
              className="w-full gap-2 font-display font-semibold"
              onClick={handleCreateQuote}
            >
              <FileText className="w-5 h-5" />
              Criar Orçamento a partir desta Simulação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default QuantityPriceCalculator;
