/**
 * MockupConfigPanel — Configuration form for mockup generation
 * 
 * Extracted from MockupGenerator.tsx to reduce god-component size.
 * Handles: Client, Product, Technique selection + Generate button.
 */

import { Loader2, Paintbrush, RefreshCw, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Wand2 } from "lucide-react";
import { TechniqueTooltip } from "./TechniqueTooltip";
import { GenerateButton } from "./GenerateButton";
import { MockupClientSelector } from "./MockupClientSelector";
import { MockupProductSelector } from "./MockupProductSelector";
import type { PersonalizationArea } from "./MultiAreaManager";
import type { Product } from "@/hooks/useProducts";

// Product type imported from useProducts

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

export interface MockupClient {
  id: string;
  name: string;
  razao_social?: string;
  nome_fantasia?: string;
  ramo?: string;
  logo_url?: string;
  cnpj?: string;
}

interface MockupConfigPanelProps {
  techniques: Technique[];
  techniques: Technique[];
  selectedProduct: Product | null;
  selectedTechnique: Technique | null;
  selectedClient: MockupClient | null;
  isLoadingData: boolean;
  isLoading: boolean;
  personalizationAreas: PersonalizationArea[];
  onProductSelect: (product: Product | null) => void;
  onTechniqueSelect: (technique: Technique | null) => void;
  onClientSelect: (client: MockupClient | null) => void;
  onGenerate: () => void;
  onReset: () => void;
  /** Techniques filtered by product's print areas */
  filteredTechniques: Technique[];
}

export function MockupConfigPanel({
  techniques,
  techniques,
  selectedProduct,
  selectedTechnique,
  selectedClient,
  isLoadingData,
  isLoading,
  personalizationAreas,
  onProductSelect,
  onTechniqueSelect,
  onClientSelect,
  onGenerate,
  onReset,
  filteredTechniques,
}: MockupConfigPanelProps) {
  const hasLogo = personalizationAreas.some(a => a.logoPreview);
  const stepsRemaining = [!selectedClient, !selectedProduct, !selectedTechnique, !hasLogo].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Configuração
        </CardTitle>
        <CardDescription>
          Selecione o produto, técnica e faça upload do logo do cliente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            {/* Client Selection — required, from external CRM */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">1</span>
                Empresa <span className="text-destructive">*</span>
              </Label>
              <MockupClientSelector
                selectedClient={selectedClient}
                onClientSelect={onClientSelect}
              />
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">2</span>
                Produto
              </Label>
              <MockupProductSelector
                selectedProduct={selectedProduct}
                onSelect={onProductSelect}
              />
            </div>

            {/* Technique Selection — filtered by product */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">3</span>
                Técnica de Personalização
                {selectedTechnique && (
                  <TechniqueTooltip technique={selectedTechnique}>
                    <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                  </TechniqueTooltip>
                )}
              </Label>
              <Select
                value={selectedTechnique?.id || ""}
                onValueChange={(value) => {
                  // Search in both filtered and full list to handle edge cases
                  const technique = techniques.find((t) => t.id === value);
                  onTechniqueSelect(technique || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma técnica..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredTechniques.length > 0 ? (
                    <>
                      {selectedProduct && filteredTechniques.length < techniques.length && (
                        <div className="px-2 py-1.5 text-[10px] text-muted-foreground bg-muted/50">
                          Técnicas compatíveis com {selectedProduct.name}
                        </div>
                      )}
                      {filteredTechniques.map((technique) => (
                        <TechniqueTooltip key={technique.id} technique={technique}>
                          <SelectItem value={technique.id} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Paintbrush className="h-3.5 w-3.5 text-primary" />
                              {technique.name}
                            </div>
                          </SelectItem>
                        </TechniqueTooltip>
                      ))}
                    </>
                  ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      {selectedProduct
                        ? "Nenhuma técnica disponível para este produto"
                        : "Selecione um produto primeiro"}
                    </div>
                  )}
                </SelectContent>
              </Select>
              {selectedProduct && filteredTechniques.length > 0 && filteredTechniques.length < techniques.length && (
                <p className="text-[10px] text-muted-foreground">
                  {filteredTechniques.length} de {techniques.length} técnicas compatíveis
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <GenerateButton
                onClick={onGenerate}
                isLoading={isLoading}
                isReady={!!(selectedClient && selectedProduct && selectedTechnique && hasLogo)}
                stepsRemaining={stepsRemaining}
                disabled={!selectedClient || !selectedProduct || !selectedTechnique || !hasLogo || isLoading}
                className="flex-1"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={onReset} aria-label="Limpar formulário">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpar formulário</TooltipContent>
              </Tooltip>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
