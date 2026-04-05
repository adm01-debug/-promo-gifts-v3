import { useState } from "react";
import { Package, ChevronDown, ChevronUp, ExternalLink, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface KitComponent {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  imageUrl?: string;
  unitPrice?: number;
  category?: string;
}

interface KitVisualCompositionProps {
  kitName: string;
  kitSku?: string;
  kitPrice: number;
  components: KitComponent[];
  className?: string;
  onComponentClick?: (componentId: string) => void;
  compact?: boolean;
}

export function KitVisualComposition({
  kitName,
  kitSku,
  kitPrice,
  components,
  className,
  onComponentClick,
  compact = false,
}: KitVisualCompositionProps) {
  const [isOpen, setIsOpen] = useState(!compact);

  const totalComponentsPrice = components.reduce(
    (sum, c) => sum + (c.unitPrice || 0) * c.quantity,
    0
  );

  const savings = totalComponentsPrice > 0 ? totalComponentsPrice - kitPrice : 0;
  const savingsPercent = totalComponentsPrice > 0 
    ? ((savings / totalComponentsPrice) * 100).toFixed(0) 
    : "0";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("cursor-help gap-1", className)}>
              <Layers className="h-3 w-3" />
              Kit ({components.length} itens)
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="w-64 p-0">
            <div className="p-3 border-b">
              <p className="font-medium text-sm">{kitName}</p>
              <p className="text-xs text-muted-foreground">{kitSku}</p>
            </div>
            <ScrollArea className="max-h-48">
              <div className="p-2 space-y-1">
                {components.map((comp, i) => (
                  <div key={i} className="flex items-center gap-2 p-1">
                    {comp.imageUrl ? (
                      <img
                        src={comp.imageUrl}
                        alt={comp.name}
                        className="w-8 h-8 rounded object-cover" loading="lazy" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{comp.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {comp.quantity}x
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {savings > 0 && (
              <div className="p-2 border-t bg-success/5">
                <p className="text-xs text-success text-center">
                  Economia de {formatCurrency(savings)} ({savingsPercent}%)
                </p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={className}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Composição do Kit
                <Badge variant="secondary">{components.length} itens</Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Components list */}
            <div className="space-y-2">
              {components.map((component, index) => (
                <div
                  key={component.id || index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg bg-muted/50 transition-colors",
                    onComponentClick && "hover:bg-muted cursor-pointer"
                  )}
                  onClick={() => onComponentClick?.(component.id)}
                >
                  {/* Image */}
                  {component.imageUrl ? (
                    <img
                      src={component.imageUrl}
                      alt={component.name}
                      className="w-12 h-12 rounded-lg object-cover border" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{component.name}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {component.sku}
                    </p>
                    {component.category && (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {component.category}
                      </Badge>
                    )}
                  </div>

                  {/* Quantity and Price */}
                  <div className="text-right">
                    <Badge variant="secondary" className="mb-1">
                      {component.quantity}x
                    </Badge>
                    {component.unitPrice && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(component.unitPrice * component.quantity)}
                      </p>
                    )}
                  </div>

                  {onComponentClick && (
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor separado</span>
                <span className="line-through text-muted-foreground">
                  {formatCurrency(totalComponentsPrice)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Preço do Kit</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(kitPrice)}
                </span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-primary/20">
                  <span className="text-green-600 font-medium">Você economiza</span>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {formatCurrency(savings)} ({savingsPercent}%)
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// Simple badge for product cards
export function KitBadge({ itemCount }: { itemCount: number }) {
  return (
    <Badge variant="secondary" className="gap-1">
      <Layers className="h-3 w-3" />
      Kit • {itemCount} itens
    </Badge>
  );
}
