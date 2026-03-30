import { MainLayout } from '@/components/layout/MainLayout';
import { PageSEO } from '@/components/seo/PageSEO';
import { ProductPriceSimulator } from '@/components/pricing/ProductPriceSimulator';
import { QuantityPriceCalculator } from '@/components/pricing/QuantityPriceCalculator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Package,
  Zap,
} from 'lucide-react';

export default function PriceSimulatorPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="w-8 h-8 text-primary" />
              Simulador de Preços
            </h1>
            <p className="text-muted-foreground mt-1">
              Calcule preços de personalização com base no produto e quantidade
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <Zap className="w-3 h-3 mr-1" />
            Preços em tempo real
          </Badge>
        </div>

        {/* Tabs for different modes */}
        <Tabs defaultValue="by-product" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="by-product" className="gap-2">
              <Package className="w-4 h-4" />
              Por Produto
            </TabsTrigger>
            <TabsTrigger value="by-quantity" className="gap-2">
              <Calculator className="w-4 h-4" />
              Por Tiragem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="by-product" className="mt-6">
            <ProductPriceSimulator />
          </TabsContent>

          <TabsContent value="by-quantity" className="mt-6">
            <QuantityPriceCalculator 
              productBasePrice={0}
              onSelectTechnique={() => {
                // Handler para técnica selecionada
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
