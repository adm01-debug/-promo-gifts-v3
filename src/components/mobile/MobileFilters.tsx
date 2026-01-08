import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Filter, 
  X, 
  ChevronDown, 
  Check, 
  RotateCcw,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  multiSelect?: boolean;
}

interface MobileFiltersProps {
  groups: FilterGroup[];
  activeFilters: Record<string, string[]>;
  onFilterChange: (groupId: string, values: string[]) => void;
  onClear: () => void;
  onApply: () => void;
  className?: string;
}

export function MobileFilters({
  groups,
  activeFilters,
  onFilterChange,
  onClear,
  onApply,
  className
}: MobileFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const activeCount = Object.values(activeFilters).flat().length;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleOption = (groupId: string, value: string, multiSelect = true) => {
    const current = activeFilters[groupId] || [];
    
    if (multiSelect) {
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      onFilterChange(groupId, updated);
    } else {
      onFilterChange(groupId, current.includes(value) ? [] : [value]);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={cn("relative gap-2", className)}
      >
        <SlidersHorizontal className="w-4 h-4" />
        <span>Filtros</span>
        {activeCount > 0 && (
          <Badge 
            variant="default" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {activeCount}
          </Badge>
        )}
      </Button>

      {/* Bottom sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Filtros</h3>
                  {activeCount > 0 && (
                    <Badge variant="secondary">{activeCount} ativos</Badge>
                  )}
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Filter groups */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {groups.map((group) => {
                  const isExpanded = expandedGroups.includes(group.id);
                  const activeInGroup = activeFilters[group.id] || [];

                  return (
                    <div 
                      key={group.id}
                      className="border border-border rounded-xl overflow-hidden"
                    >
                      {/* Group header */}
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{group.label}</span>
                          {activeInGroup.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {activeInGroup.length}
                            </Badge>
                          )}
                        </div>
                        <ChevronDown 
                          className={cn(
                            "w-5 h-5 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      {/* Options */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 pt-0 space-y-2">
                              {group.options.map((option) => {
                                const isActive = activeInGroup.includes(option.value);

                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => toggleOption(
                                      group.id, 
                                      option.value, 
                                      group.multiSelect
                                    )}
                                    className={cn(
                                      "w-full flex items-center justify-between p-3 rounded-lg",
                                      "border transition-colors",
                                      isActive 
                                        ? "border-primary bg-primary/5" 
                                        : "border-border hover:bg-muted/50"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        "w-5 h-5 rounded-md border-2 flex items-center justify-center",
                                        isActive 
                                          ? "border-primary bg-primary" 
                                          : "border-muted-foreground/30"
                                      )}>
                                        {isActive && (
                                          <Check className="w-3 h-3 text-primary-foreground" />
                                        )}
                                      </div>
                                      <span className={cn(
                                        isActive && "font-medium"
                                      )}>
                                        {option.label}
                                      </span>
                                    </div>
                                    {option.count !== undefined && (
                                      <span className="text-sm text-muted-foreground">
                                        ({option.count})
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-background">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClear}
                    className="flex-1 gap-2"
                    disabled={activeCount === 0}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Limpar
                  </Button>
                  <Button
                    onClick={() => {
                      onApply();
                      setIsOpen(false);
                    }}
                    className="flex-1"
                  >
                    Aplicar filtros
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Active filters chips
interface ActiveFiltersChipsProps {
  filters: Record<string, string[]>;
  groups: FilterGroup[];
  onRemove: (groupId: string, value: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFiltersChips({
  filters,
  groups,
  onRemove,
  onClearAll,
  className
}: ActiveFiltersChipsProps) {
  const activeFilters = Object.entries(filters)
    .flatMap(([groupId, values]) => {
      const group = groups.find(g => g.id === groupId);
      return values.map(value => {
        const option = group?.options.find(o => o.value === value);
        return {
          groupId,
          value,
          label: option?.label || value,
          groupLabel: group?.label || groupId
        };
      });
    });

  if (activeFilters.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {activeFilters.map(({ groupId, value, label, groupLabel }) => (
        <motion.div
          key={`${groupId}-${value}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm"
        >
          <span className="text-muted-foreground text-xs">{groupLabel}:</span>
          <span className="font-medium">{label}</span>
          <button
            onClick={() => onRemove(groupId, value)}
            className="ml-1 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      ))}

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="px-2.5 py-1 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Limpar todos
        </button>
      )}
    </div>
  );
}
