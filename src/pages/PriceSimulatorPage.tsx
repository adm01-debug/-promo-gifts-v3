import { MainLayout } from '@/components/layout/MainLayout';
import { QuantityPriceCalculator } from '@/components/pricing/QuantityPriceCalculator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  TrendingDown, 
  Clock, 
  Palette,
  Target,
  Zap,
  CheckCircle2
} from 'lucide-react';

export default function PriceSimulatorPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="w-8 h-8 text-primary" />
              Simulador de Preços por Tiragem
            </h1>
            <p className="text-muted-foreground mt-1">
              Calcule preços de personalização com base na quantidade desejada
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <Zap className="w-3 h-3 mr-1" />
            Preços em tempo real
          </Badge>
        </div>

        {/* Cards informativos */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-green-500" />
                Economia por Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">Até 99%</p>
              <p className="text-xs text-muted-foreground">
                Desconto em 10.000+ unidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-500" />
                Técnicas Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">9</p>
              <p className="text-xs text-muted-foreground">
                Hot Stamping, UV, Laser, Bordado...
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Prazo Mínimo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">2 dias</p>
              <p className="text-xs text-muted-foreground">
                Para pequenas quantidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                Faixas de Preço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">15</p>
              <p className="text-xs text-muted-foreground">
                De 1 a 10.000+ unidades
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Calculadora principal */}
        <QuantityPriceCalculator 
          productBasePrice={0}
          onSelectTechnique={(code, calc) => {
            console.log('Técnica selecionada:', code, calc);
          }}
        />

        {/* Dicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💡 Dicas para Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Quantidade ótima</p>
                  <p className="text-sm text-muted-foreground">
                    A partir de 100 unidades, o preço unitário cai significativamente.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Compare técnicas</p>
                  <p className="text-sm text-muted-foreground">
                    UV Digital é mais barato para full color, Laser para metal.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Considere o prazo</p>
                  <p className="text-sm text-muted-foreground">
                    Quantidades maiores têm prazo estendido. Planeje com antecedência.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
