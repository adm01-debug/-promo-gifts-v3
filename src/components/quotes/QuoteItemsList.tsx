import { useState } from "react";
import { Trash2, Palette, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { QuoteItem, PersonalizationTechnique, QuoteItemPersonalization } from "@/hooks/useQuotes";
import { QuotePersonalizationSelector } from "./QuotePersonalizationSelector";

interface QuoteItemsListProps {
  items: QuoteItem[];
  techniques: PersonalizationTechnique[];
  onItemUpdate: (index: number, item: QuoteItem) => void;
  onItemRemove: (index: number) => void;
}

export function QuoteItemsList({ items, techniques, onItemUpdate, onItemRemove }: QuoteItemsListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const item = items[index];
    onItemUpdate(index, { ...item, quantity: Math.max(1, quantity) });
  };

  const handlePersonalizationAdd = (index: number, personalization: QuoteItemPersonalization) => {
    const item = items[index];
    const personalizations = [...(item.personalizations || []), personalization];
    onItemUpdate(index, { ...item, personalizations });
  };

  const handlePersonalizationRemove = (itemIndex: number, persIndex: number) => {
    const item = items[itemIndex];
    const personalizations = (item.personalizations || []).filter((_, i) => i !== persIndex);
    onItemUpdate(itemIndex, { ...item, personalizations });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const calculateItemTotal = (item: QuoteItem) => {
    const baseTotal = item.quantity * item.unit_price;
    const personalizationTotal = (item.personalizations || []).reduce(
      (sum, p) => sum + (p.total_cost || 0),
      0
    );
    return baseTotal + personalizationTotal;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
        <Palette className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          Nenhum produto adicionado
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Clique em "Adicionar Produto" para começar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card key={item.id || item.product_id || `item-${index}`} className="overflow-hidden">
          <div className="flex items-start gap-4 p-4">
            {/* Drag Handle */}
            <div className="pt-2 text-muted-foreground/50 cursor-grab">
              <GripVertical className="h-5 w-5" />
            </div>

            {/* Product Image */}
            <div className="shrink-0">
              {item.product_image_url ? (
                <img
                  src={item.product_image_url}
                  alt={item.product_name}
                  className="w-16 h-16 object-cover rounded-md"
                />
              ) : (
                <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                  <Palette className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-medium">{item.product_name}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{item.product_sku}</span>
                    {item.color_name && (
                      <>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded-full border"
                            style={{ backgroundColor: item.color_hex }}
                          />
                          <span>{item.color_name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onItemRemove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quantity and Price */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Qtd:</span>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    className="w-20 h-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">×</span>
                  <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">=</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(calculateItemTotal(item))}
                  </span>
                </div>
              </div>

              {/* Personalizations Badge */}
              {(item.personalizations?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.personalizations?.map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {p.technique_name || `Técnica ${i + 1}`}
                      <button
                        onClick={() => handlePersonalizationRemove(index, i)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Expandable Personalization Section */}
          <Collapsible open={expandedItems.has(index)}>
            <CollapsibleTrigger asChild>
              <button
                onClick={() => toggleExpanded(index)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                <Palette className="h-4 w-4" />
                Técnicas de Personalização
                {expandedItems.has(index) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 bg-muted/30 border-t">
                <QuotePersonalizationSelector
                  techniques={techniques}
                  quantity={item.quantity}
                  onAdd={(personalization) => handlePersonalizationAdd(index, personalization)}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}
