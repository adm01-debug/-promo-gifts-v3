import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Package, Paintbrush, Palette, Check, Plus, X } from 'lucide-react';

import {
  StepIndicator,
  ProductSearch,
  TechniqueSelector,
  CustomizationOptions,
  formatCurrency,
  type Product,
  type ProductTechnique,
  type ConfiguredEngraving,
} from './simulator';
import { EngravingList } from './simulator/EngravingList';
import { MultiEngravingResult } from './simulator/MultiEngravingResult';

interface ProductPriceSimulatorProps {
  className?: string;
}

type SimulatorMode = 'list' | 'adding';

export function ProductPriceSimulator({ className }: ProductPriceSimulatorProps) {
  // Estado do produto
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Lista de gravações configuradas
  const [engravings, setEngravings] = useState<ConfiguredEngraving[]>([]);
  
  // Estado para adicionar nova gravação
  const [mode, setMode] = useState<SimulatorMode>('list');
  const [currentTechnique, setCurrentTechnique] = useState<ProductTechnique | null>(null);
  const [currentColors, setCurrentColors] = useState(1);
  const [currentSizeOption, setCurrentSizeOption] = useState<string | null>(null);
  const [currentTableCode, setCurrentTableCode] = useState<string | null>(null);
  
  // Quantidade
  const [quantity, setQuantity] = useState(100);

  const MAX_ENGRAVINGS = 5;

  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    setEngravings([]);
    setMode('list');
    setCurrentTechnique(null);
  }, []);

  const handleStartAddEngraving = useCallback(() => {
    setMode('adding');
    setCurrentTechnique(null);
    setCurrentColors(1);
    setCurrentSizeOption(null);
    setCurrentTableCode(null);
  }, []);

  const handleCancelAddEngraving = useCallback(() => {
    setMode('list');
    setCurrentTechnique(null);
  }, []);

  const handleTechniqueSelect = useCallback((technique: ProductTechnique | null) => {
    setCurrentTechnique(technique);
    if (technique) {
      setCurrentColors(1);
      setCurrentSizeOption(null);
    }
  }, []);

  const handleConfirmEngraving = useCallback(() => {
    if (!currentTechnique) return;

    const newEngraving: ConfiguredEngraving = {
      id: crypto.randomUUID(),
      technique: currentTechnique,
      colors: currentColors,
      sizeOption: currentSizeOption,
      tableCode: currentTableCode,
    };

    setEngravings((prev) => [...prev, newEngraving]);
    setMode('list');
    setCurrentTechnique(null);
  }, [currentTechnique, currentColors, currentSizeOption, currentTableCode]);

  const handleRemoveEngraving = useCallback((id: string) => {
    setEngravings((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const canAddMore = engravings.length < MAX_ENGRAVINGS;
  const hasEngravings = engravings.length > 0;
  const showResults = selectedProduct && hasEngravings;

  // Determinar o passo atual
  const getCurrentStep = () => {
    if (!selectedProduct) return 1;
    if (mode === 'adding') {
      if (!currentTechnique) return 2;
      return 3;
    }
    if (hasEngravings) return 4;
    return 2;
  };

  const currentStep = getCurrentStep();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <CardTitle>Simulador de Preços por Produto</CardTitle>
        </div>
        <CardDescription>
          Selecione o produto, adicione gravações e calcule o preço final
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between pb-4 border-b">
          <StepIndicator step={1} currentStep={currentStep} label="Produto" isComplete={!!selectedProduct} />
          <StepIndicator step={2} currentStep={currentStep} label="Gravações" isComplete={hasEngravings} />
          <StepIndicator step={3} currentStep={currentStep} label="Opções" isComplete={mode !== 'adding' && hasEngravings} />
          <StepIndicator step={4} currentStep={currentStep} label="Resultado" isComplete={false} />
        </div>

        {/* Step 1: Product */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              1. Selecione o Produto
            </h3>
            {selectedProduct && (
              <Button variant="ghost" size="sm" onClick={() => handleProductSelect(null)}>
                Alterar
              </Button>
            )}
          </div>
          {!selectedProduct && (
            <ProductSearch onSelect={handleProductSelect} selectedProduct={selectedProduct} />
          )}
          {selectedProduct && (
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{selectedProduct.name}</span>
                <span className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</span>
              </div>
              <Badge variant="secondary">{formatCurrency(selectedProduct.price)}</Badge>
            </div>
          )}
        </div>

        {/* Step 2: Engravings List / Add Engraving */}
        {selectedProduct && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Paintbrush className="w-4 h-4 text-primary" />
                2. Personalizações
              </h3>
            </div>

            {mode === 'list' && (
              <EngravingList
                engravings={engravings}
                onRemove={handleRemoveEngraving}
                onAddNew={handleStartAddEngraving}
                canAddMore={canAddMore}
                maxEngravings={MAX_ENGRAVINGS}
              />
            )}

            {mode === 'adding' && (
              <div className="space-y-4 p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Nova Gravação</h4>
                  <Button variant="ghost" size="sm" onClick={handleCancelAddEngraving}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </div>

                {/* Technique Selector */}
                {!currentTechnique && (
                  <TechniqueSelector
                    productId={selectedProduct.id}
                    onSelect={handleTechniqueSelect}
                    selectedTechnique={currentTechnique}
                  />
                )}

                {/* Options */}
                {currentTechnique && (
                  <div className="space-y-4">
                    {/* Summary of selected technique */}
                    <div className="p-3 rounded-lg bg-background border flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{currentTechnique.techniqueName}</p>
                        <p className="text-xs text-muted-foreground">
                          {currentTechnique.componentName} → {currentTechnique.locationName}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentTechnique(null)}>
                        Alterar
                      </Button>
                    </div>

                    {/* Customization Options */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary" />
                        Opções de Personalização
                      </h4>
                      <CustomizationOptions
                        technique={currentTechnique}
                        colors={currentColors}
                        onColorsChange={setCurrentColors}
                        sizeOption={currentSizeOption}
                        onSizeChange={setCurrentSizeOption}
                        onTableCodeChange={setCurrentTableCode}
                      />
                    </div>

                    {/* Confirm Button */}
                    <Button className="w-full" onClick={handleConfirmEngraving}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Gravação
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results */}
        {showResults && mode === 'list' && (
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              3. Quantidade e Resultado
            </h3>
            <MultiEngravingResult
              product={selectedProduct}
              engravings={engravings}
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
