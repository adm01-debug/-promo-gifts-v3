import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, Package, Paintbrush, Palette, Check, ChevronRight } from 'lucide-react';

import {
  StepIndicator,
  ProductSearch,
  TechniqueSelector,
  CustomizationOptions,
  QuantityAndResult,
  formatCurrency,
  type Product,
  type ProductTechnique,
  type SizeOption,
} from './simulator';

// Tamanhos disponíveis (futuramente buscar de personalization_sizes)
const AVAILABLE_SIZES: SizeOption[] = [
  { label: 'Pequeno (até 5cm²)', value: 'small', modifier: 0.8 },
  { label: 'Padrão (até 20cm²)', value: 'standard', modifier: 1 },
  { label: 'Grande (até 50cm²)', value: 'large', modifier: 1.3 },
  { label: 'Extra Grande (50cm²+)', value: 'xlarge', modifier: 1.6 },
];

interface ProductPriceSimulatorProps {
  className?: string;
}

export function ProductPriceSimulator({ className }: ProductPriceSimulatorProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<ProductTechnique | null>(null);
  const [colors, setColors] = useState(1);
  const [sizeOption, setSizeOption] = useState('standard');
  const [quantity, setQuantity] = useState(100);

  const sizeModifier = AVAILABLE_SIZES.find((s) => s.value === sizeOption)?.modifier || 1;

  const handleProductSelect = useCallback((product: Product | null) => {
    setSelectedProduct(product);
    setSelectedTechnique(null);
    setCurrentStep(product ? 2 : 1);
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
            <ProductSearch onSelect={handleProductSelect} selectedProduct={selectedProduct} />
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
                  availableSizes={AVAILABLE_SIZES}
                />
                <Button className="w-full" onClick={() => setCurrentStep(4)}>
                  Calcular Preço
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
            {currentStep > 3 && (
              <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span>
                  {colors} cor{colors > 1 ? 'es' : ''}
                </span>
                <span>•</span>
                <span>{AVAILABLE_SIZES.find((s) => s.value === sizeOption)?.label}</span>
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
