import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Calculator, 
  ArrowRight,
  Info,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { invokeExternalDb } from "@/lib/external-db";

interface PriceTableRow {
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

interface InlinePriceCalculatorProps {
  productId?: string;
  variantId?: string;
  basePrice: number;
  minQuantity?: number;
  productName: string;
  className?: string;
}

interface VariantSalePrice {
  id: string;
  variant_id?: string;
  product_id?: string;
  price_list_id?: string;
  sale_price?: number | null;
  min_quantity?: number | null;
  is_active?: boolean;
}

// Fallback price tiers when no external data
const calculateFallbackTiers = (basePrice: number, minQty: number): PriceTableRow[] => {
  const tiers = [
    { qty: minQty, discount: 0 },
    { qty: 50, discount: 5 },
    { qty: 100, discount: 10 },
    { qty: 250, discount: 15 },
    { qty: 500, discount: 20 },
    { qty: 1000, discount: 25 },
  ].filter(t => t.qty >= minQty);

  return tiers.map(tier => {
    const unitPrice = basePrice * (1 - tier.discount / 100);
    return {
      quantity: tier.qty,
      unitPrice,
      total: unitPrice * tier.qty,
      discount: tier.discount,
    };
  });
};

// Extract price tiers from variant_sale_prices records
const extractPriceTiersFromSalePrices = (salePrices: VariantSalePrice[], basePrice: number): PriceTableRow[] => {
  const tiers: PriceTableRow[] = [];
  
  for (const sp of salePrices) {
    const price = sp.sale_price;
    const qty = sp.min_quantity;
    
    if (price != null && price > 0) {
      const quantity = qty != null && qty > 0 ? qty : 1;
      const unitPrice = Number(price);
      
      tiers.push({
        quantity,
        unitPrice,
        total: unitPrice * quantity,
        discount: 0, // Will calculate after sorting
      });
    }
  }
  
  // Sort by quantity
  tiers.sort((a, b) => a.quantity - b.quantity);
  
  // Calculate discounts based on first tier price (or basePrice)
  const referencePrice = tiers.length > 0 ? tiers[0].unitPrice : basePrice;
  tiers.forEach((tier, idx) => {
    if (idx === 0) {
      tier.discount = 0;
    } else if (referencePrice > 0) {
      tier.discount = Math.max(0, Math.round((1 - tier.unitPrice / referencePrice) * 100));
    }
  });
  
  return tiers;
};

export function InlinePriceCalculator({
  productId,
  variantId,
  basePrice,
  minQuantity = 1,
  productName: _productName,
  className,
}: InlinePriceCalculatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customQuantity, setCustomQuantity] = useState<number>(minQuantity);
  const [priceTiers, setPriceTiers] = useState<PriceTableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setHasExternalData] = useState(false);
  
  // Fetch price tiers from external database (variant_sale_prices table)
  useEffect(() => {
    async function fetchPriceTiers() {
      if (!productId) {
        setPriceTiers(calculateFallbackTiers(basePrice, minQuantity));
        return;
      }

      setIsLoading(true);
      try {
        let variantIds: string[] = [];

        // If we have a specific variantId, use it directly
        if (variantId) {
          variantIds = [variantId];
        } else {
          // Otherwise, get all variant IDs for this product
          const variantsResponse = await invokeExternalDb({
            table: "product_variants",
            operation: "select",
            select: "id",
            filters: { product_id: productId, is_active: true },
            range: [0, 20],
          });

          const variants = variantsResponse?.data?.records || variantsResponse?.records || [];
          variantIds = variants.map((v: { id: string }) => v.id);
        }

        if (variantIds.length === 0) {
          setPriceTiers(calculateFallbackTiers(basePrice, minQuantity));
          setIsLoading(false);
          return;
        }

        // Fetch sale prices for the first variant (they should share the same price structure)
        const response = await invokeExternalDb({
          table: "variant_sale_prices",
          operation: "select",
          filters: { variant_id: variantIds[0], is_active: true },
          range: [0, 20],
        });

        const records = response?.data?.records || response?.records || [];
        
        if (records.length > 0) {
          const salePrices = records as VariantSalePrice[];
          const tiers = extractPriceTiersFromSalePrices(salePrices, basePrice);
          
          if (tiers.length > 0) {
            setPriceTiers(tiers);
            setHasExternalData(true);
          } else {
            setPriceTiers(calculateFallbackTiers(basePrice, minQuantity));
          }
        } else {
          setPriceTiers(calculateFallbackTiers(basePrice, minQuantity));
        }
      } catch (error) {
        console.error("Error fetching price tiers:", error);
        setPriceTiers(calculateFallbackTiers(basePrice, minQuantity));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPriceTiers();
  }, [productId, variantId, basePrice, minQuantity]);
  
  // Calculate price for custom quantity
  const getCustomPrice = (qty: number): { unitPrice: number; discount: number } => {
    if (priceTiers.length === 0) {
      return { unitPrice: basePrice, discount: 0 };
    }
    // Find applicable tier (highest min_quantity that is <= qty)
    const applicableTier = [...priceTiers].reverse().find(t => qty >= t.quantity);
    if (applicableTier) {
      return { 
        unitPrice: applicableTier.unitPrice, 
        discount: applicableTier.discount || 0 
      };
    }
    return { unitPrice: priceTiers[0]?.unitPrice || basePrice, discount: 0 };
  };
  
  const customPriceInfo = getCustomPrice(customQuantity);
  const customTotal = customPriceInfo.unitPrice * customQuantity;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-primary/5 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Calculator className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Tabela de Preços</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Veja os descontos por quantidade
                  </p>
                </div>
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            {/* Price tiers table */}
            <div className="overflow-hidden rounded-lg border border-border">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando preços...</span>
                </div>
              ) : priceTiers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhuma tabela de preços disponível
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Quantidade</th>
                      <th className="px-4 py-3 text-right font-medium">Preço/un</th>
                      <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Total</th>
                      <th className="px-4 py-3 text-right font-medium">Desconto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceTiers.map((tier, idx) => (
                      <tr 
                        key={`tier-${idx}-${tier.quantity}`}
                        className={cn(
                          "border-t border-border/50 transition-colors",
                          idx === 0 && "bg-primary/5",
                          idx > 0 && "hover:bg-muted/30"
                        )}
                      >
                        <td className="px-4 py-3 font-medium">
                          {tier.quantity.toLocaleString('pt-BR')} un
                          {idx === 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">Mínimo</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatPrice(tier.unitPrice)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                          {formatPrice(tier.total)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tier.discount ? (
                            <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                              -{tier.discount}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Separator />

            {/* Custom quantity calculator */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-sm">Calcule seu pedido</h4>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Digite a quantidade desejada para ver o preço aplicado
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="custom-qty" className="text-sm">Quantidade</Label>
                  <Input
                    id="custom-qty"
                    type="number"
                    min={minQuantity}
                    value={customQuantity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomQuantity(Math.max(minQuantity, parseInt(e.target.value) || minQuantity))}
                    className="h-12"
                  />
                </div>
                
                <div className="flex items-end">
                  <ArrowRight className="h-5 w-5 text-muted-foreground mb-4 hidden sm:block" />
                </div>
                
                <div className="flex-1 space-y-2">
                  <Label className="text-sm">Resultado</Label>
                  <div className="h-12 px-4 rounded-lg bg-success/10 border border-success/20 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-lg text-success">
                        {formatPrice(customTotal)}
                      </span>
                      {customPriceInfo.discount > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-success/20 text-success text-xs">
                          -{customPriceInfo.discount}%
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      ({formatPrice(customPriceInfo.unitPrice)}/un)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button className="w-full gap-2" size="lg">
              <Calculator className="h-4 w-4" />
              Adicionar {customQuantity.toLocaleString('pt-BR')} un ao Orçamento
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
