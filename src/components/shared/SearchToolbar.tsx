import { ReactNode, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Filter, SlidersHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = "Buscar...",
      isLoading = false,
      size = "md",
      className,
    },
    ref
  ) => {
    const sizeStyles = {
      sm: "h-9 text-sm pl-9",
      md: "h-10 pl-10",
      lg: "h-12 text-lg pl-12",
    };

    const iconStyles = {
      sm: "w-4 h-4 left-2.5",
      md: "w-5 h-5 left-3",
      lg: "w-6 h-6 left-3",
    };

    return (
      <div className={cn("relative", className)}>
        <div className={cn("absolute top-1/2 -translate-y-1/2 text-muted-foreground", iconStyles[size])}>
          {isLoading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Search />
          )}
        </div>
        <Input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(sizeStyles[size], value && "pr-10")}
        />
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={() => {
                onChange("");
                onClear?.();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SearchBar.displayName = "SearchBar";

// Toolbar component for filters and actions
interface ToolbarProps {
  children: ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ToolbarGroup({ children, className }: ToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

// Filter Button with count badge
interface FilterButtonProps {
  activeCount?: number;
  onClick?: () => void;
  label?: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
}

export function FilterButton({
  activeCount = 0,
  onClick,
  label = "Filtros",
  variant = "outline",
  size = "default",
}: FilterButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={onClick} className="gap-2">
      <Filter className="w-4 h-4" />
      {label}
      {activeCount > 0 && (
        <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
          {activeCount}
        </Badge>
      )}
    </Button>
  );
}

// Advanced Filters Bar
interface ActiveFilter {
  id: string;
  label: string;
  value: string;
}

interface ActiveFiltersBarProps {
  filters: ActiveFilter[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFiltersBar({
  filters,
  onRemove,
  onClearAll,
  className,
}: ActiveFiltersBarProps) {
  if (filters.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <span className="text-sm text-muted-foreground">Filtros ativos:</span>
      {filters.map((filter) => (
        <Badge
          key={filter.id}
          variant="secondary"
          className="gap-1 pr-1"
        >
          <span className="text-muted-foreground">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemove(filter.id)}
            className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-7 text-xs text-muted-foreground"
      >
        Limpar todos
      </Button>
    </motion.div>
  );
}

// Tabs-style filter pills
interface FilterPill {
  id: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  pills: FilterPill[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export function FilterPills({ pills, activeId, onChange, className }: FilterPillsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {pills.map((pill) => (
        <motion.button
          key={pill.id}
          onClick={() => onChange(pill.id)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            "border",
            activeId === pill.id
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
          )}
          whileTap={{ scale: 0.95 }}
        >
          {pill.label}
          {pill.count !== undefined && (
            <span
              className={cn(
                "ml-2 px-1.5 py-0.5 rounded-full text-xs",
                activeId === pill.id
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {pill.count}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
}
