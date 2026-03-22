import { useState } from "react";
import { Package, Image as ImageIcon, Check, ChevronDown, ChevronUp, Palette, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { KitComponent } from "@/types/product-catalog";

interface KitCompositionProps {
  items: KitComponent[];
  onSelectItems?: (selectedItems: KitComponent[]) => void;
}

export function KitComposition({ items, onSelectItems }: KitCompositionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  const toggleItem = (itemId: string) => {
    const newSelected = selectedItems.includes(itemId)
      ? selectedItems.filter((id) => id !== itemId)
      : [...selectedItems, itemId];
    
    setSelectedItems(newSelected);
    setSelectAll(newSelected.length === items.length);
    onSelectItems?.(items.filter((item) => newSelected.includes(item.id)));
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
      onSelectItems?.([]);
    } else {
      const allIds = items.map((item) => item.id);
      setSelectedItems(allIds);
      onSelectItems?.(items);
    }
    setSelectAll(!selectAll);
  };

  const totalComponents = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="card-elevated overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-secondary/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-warning" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-semibold text-foreground">
                Composição do KIT
              </h3>
              <p className="text-sm text-muted-foreground">
                {items.length} {items.length === 1 ? 'componente' : 'componentes'} • {totalComponents} {totalComponents === 1 ? 'peça' : 'peças'}
              </p>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border">
            {/* Header actions */}
            {onSelectItems && (
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/30">
                <span className="text-sm text-muted-foreground">
                  {selectedItems.length} de {items.length} selecionados
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className={cn(selectAll && "bg-primary/10 text-primary")}
                >
                  {selectAll ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Desmarcar Todos
                    </>
                  ) : (
                    "Selecionar Todos"
                  )}
                </Button>
              </div>
            )}

            {/* Items list */}
            <div className="divide-y divide-border">
              {items.map((item) => {
                const isSelected = selectedItems.includes(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItems && toggleItem(item.id)}
                    className={cn(
                      "flex items-center gap-4 w-full p-4 text-left transition-colors",
                      onSelectItems ? (isSelected ? "bg-primary/5" : "hover:bg-secondary/50") : "cursor-default"
                    )}
                  >
                    {/* Checkbox */}
                    {onSelectItems && (
                      <div
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-border"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    )}

                    {/* Item image */}
                    <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {item.quantity}x
                        </span>
                        <span className="text-sm text-foreground truncate">
                          {item.productName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-muted-foreground font-mono">
                          {item.sku || '—'}
                        </p>
                        {item.material && (
                          <span className="text-xs text-muted-foreground">• {item.material}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {item.isPackaging && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            <Package className="h-3 w-3 mr-0.5" />
                            Embalagem
                          </Badge>
                        )}
                        {item.isOptional && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Opcional
                          </Badge>
                        )}
                        {item.isReplaceable && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            <Settings2 className="h-3 w-3 mr-0.5" />
                            Substituível
                          </Badge>
                        )}
                        {item.allowsPersonalization && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary border-primary/30">
                            <Palette className="h-3 w-3 mr-0.5" />
                            Personalizável
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
