import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, RefreshCw, Users, Package, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  images: unknown;
}

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface MockupConfigPanelProps {
  products: Product[];
  techniques: Technique[];
  clients: Client[];
  selectedProduct: Product | null;
  selectedTechnique: Technique | null;
  selectedClient: Client | null;
  onProductChange: (product: Product | null) => void;
  onTechniqueChange: (technique: Technique | null) => void;
  onClientChange: (client: Client | null) => void;
  onGenerate: () => void;
  onReset: () => void;
  isLoading: boolean;
  isLoadingData: boolean;
  canGenerate: boolean;
}

export function MockupConfigPanel({
  products,
  techniques,
  clients,
  selectedProduct,
  selectedTechnique,
  selectedClient,
  onProductChange,
  onTechniqueChange,
  onClientChange,
  onGenerate,
  onReset,
  isLoading,
  isLoadingData,
  canGenerate,
}: MockupConfigPanelProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-br from-primary/5 to-transparent border-b border-border">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" />
          Configuração
        </CardTitle>
        <CardDescription>
          Selecione o produto, técnica e faça upload do logo
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6 space-y-5">
        {/* Loading state */}
        {isLoadingData && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        )}
        
        {!isLoadingData && (
          <>
            {/* Client Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Cliente
                <Badge variant="outline" className="text-[10px] ml-1">opcional</Badge>
              </Label>
              <Select
                value={selectedClient?.id || "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    onClientChange(null);
                  } else {
                    const client = clients.find((c) => c.id === value);
                    onClientChange(client || null);
                  }
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Associar a um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-muted-foreground" />
                Produto
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedProduct?.id || ""}
                onValueChange={(value) => {
                  const product = products.find((p) => p.id === value);
                  onProductChange(product || null);
                }}
              >
                <SelectTrigger className={cn(
                  "h-11",
                  selectedProduct && "border-primary/50 bg-primary/5"
                )}>
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center gap-2">
                        <span>{product.name}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {product.sku}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Technique Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Técnica de Personalização
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedTechnique?.id || ""}
                onValueChange={(value) => {
                  const technique = techniques.find((t) => t.id === value);
                  onTechniqueChange(technique || null);
                }}
              >
                <SelectTrigger className={cn(
                  "h-11",
                  selectedTechnique && "border-primary/50 bg-primary/5"
                )}>
                  <SelectValue placeholder="Selecione uma técnica..." />
                </SelectTrigger>
                <SelectContent>
                  {techniques.map((technique) => (
                    <SelectItem key={technique.id} value={technique.id}>
                      {technique.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                onClick={onGenerate}
                disabled={!canGenerate || isLoading}
                className="flex-1 h-11 text-base font-medium"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-5 w-5" />
                    Gerar Mockup
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onReset}
                className="h-11 px-4"
                title="Limpar formulário"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
