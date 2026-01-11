import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitCompare,
  X,
  ArrowLeftRight,
  Check,
  Minus,
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface ComparisonItem {
  id: string;
  name: string;
  image?: string;
  attributes: Record<string, string | number | boolean | null>;
}

export interface ComparisonModeProps {
  items: ComparisonItem[];
  maxItems?: number;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  attributeLabels?: Record<string, string>;
  highlightDifferences?: boolean;
  className?: string;
}

export interface ComparisonFloatingBarProps {
  itemCount: number;
  maxItems?: number;
  onOpenComparison: () => void;
  onClear: () => void;
  className?: string;
}

export interface UseComparisonOptions<T extends { id: string }> {
  maxItems?: number;
  storageKey?: string;
}

// ============================================================================
// HOOK: useComparison
// ============================================================================

export function useComparison<T extends { id: string }>({
  maxItems = 4,
  storageKey,
}: UseComparisonOptions<T> = {}) {
  const [items, setItems] = React.useState<T[]>(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(`comparison_${storageKey}`);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to load comparison items:", e);
      }
    }
    return [];
  });

  // Persist to storage
  React.useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(`comparison_${storageKey}`, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save comparison items:", e);
      }
    }
  }, [items, storageKey]);

  const addItem = React.useCallback((item: T) => {
    setItems(prev => {
      if (prev.some(i => i.id === item.id)) return prev;
      if (prev.length >= maxItems) return prev;
      return [...prev, item];
    });
  }, [maxItems]);

  const removeItem = React.useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const toggleItem = React.useCallback((item: T) => {
    setItems(prev => {
      const exists = prev.some(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      if (prev.length >= maxItems) return prev;
      return [...prev, item];
    });
  }, [maxItems]);

  const isInComparison = React.useCallback((id: string) => {
    return items.some(i => i.id === id);
  }, [items]);

  const clearAll = React.useCallback(() => {
    setItems([]);
  }, []);

  const canAdd = items.length < maxItems;

  return {
    items,
    addItem,
    removeItem,
    toggleItem,
    isInComparison,
    clearAll,
    canAdd,
    count: items.length,
    maxItems,
  };
}

// ============================================================================
// COMPARISON TABLE
// ============================================================================

export function ComparisonTable({
  items,
  onRemoveItem,
  onClearAll,
  attributeLabels = {},
  highlightDifferences = true,
  className,
}: ComparisonModeProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(["all"]));

  // Get all unique attribute keys
  const allAttributes = React.useMemo(() => {
    const attrs = new Set<string>();
    items.forEach(item => {
      Object.keys(item.attributes).forEach(key => attrs.add(key));
    });
    return Array.from(attrs);
  }, [items]);

  // Check if values are different for an attribute
  const hasDifference = (attrKey: string) => {
    const values = items.map(item => item.attributes[attrKey]);
    const first = values[0];
    return values.some(v => v !== first);
  };

  // Format value for display
  const formatValue = (value: string | number | boolean | null) => {
    if (value === null || value === undefined) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <X className="h-4 w-4 text-red-500" />
      );
    }
    return String(value);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <GitCompare className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum item para comparar</h3>
        <p className="text-muted-foreground text-sm">
          Adicione itens à comparação para ver as diferenças
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Comparação</h3>
          <Badge variant="secondary">{items.length} itens</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Compartilhar
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Comparison Table */}
      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          <table className="w-full border-collapse">
            {/* Items Header */}
            <thead>
              <tr>
                <th className="sticky left-0 bg-background p-3 text-left font-medium text-muted-foreground border-b w-48">
                  Atributo
                </th>
                {items.map(item => (
                  <th key={item.id} className="p-3 border-b min-w-[180px]">
                    <div className="flex flex-col items-center gap-2">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                      )}
                      <span className="font-semibold text-sm">{item.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Attributes */}
            <tbody>
              {allAttributes.map(attrKey => {
                const isDifferent = hasDifference(attrKey);
                return (
                  <tr
                    key={attrKey}
                    className={cn(
                      "border-b transition-colors",
                      highlightDifferences && isDifferent && "bg-amber-50 dark:bg-amber-950/20"
                    )}
                  >
                    <td className="sticky left-0 bg-inherit p-3 font-medium text-sm">
                      <div className="flex items-center gap-2">
                        {attributeLabels[attrKey] || attrKey}
                        {highlightDifferences && isDifferent && (
                          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                            Diferente
                          </Badge>
                        )}
                      </div>
                    </td>
                    {items.map(item => (
                      <td key={item.id} className="p-3 text-center text-sm">
                        {formatValue(item.attributes[attrKey])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}

// ============================================================================
// FLOATING COMPARISON BAR
// ============================================================================

export function ComparisonFloatingBar({
  itemCount,
  maxItems = 4,
  onOpenComparison,
  onClear,
  className,
}: ComparisonFloatingBarProps) {
  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
            "bg-primary text-primary-foreground rounded-full shadow-lg",
            "px-4 py-2 flex items-center gap-3",
            className
          )}
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span className="font-medium">
            {itemCount} de {maxItems} para comparar
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenComparison}
              className="rounded-full"
            >
              Comparar agora
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClear}
              className="h-8 w-8 rounded-full hover:bg-primary-foreground/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// COMPARISON TOGGLE BUTTON
// ============================================================================

export interface ComparisonToggleProps {
  isSelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ComparisonToggle({
  isSelected,
  onToggle,
  disabled = false,
  size = "md",
  className,
}: ComparisonToggleProps) {
  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Button
      variant={isSelected ? "default" : "outline"}
      size="icon"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        sizeClasses[size],
        "rounded-full transition-all",
        isSelected && "bg-primary text-primary-foreground",
        className
      )}
      aria-label={isSelected ? "Remover da comparação" : "Adicionar à comparação"}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isSelected ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        {isSelected ? (
          <Check className={iconSizes[size]} />
        ) : (
          <Plus className={iconSizes[size]} />
        )}
      </motion.div>
    </Button>
  );
}
