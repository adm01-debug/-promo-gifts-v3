import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  X,
  ChevronDown,
  Check,
  Calendar,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Types
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: "select" | "multiselect" | "range" | "date" | "daterange" | "search";
  options?: FilterOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface FilterValues {
  [key: string]: any;
}

// Filter Chip
interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
}

export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
    >
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

// Multi-Select Filter
interface MultiSelectFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredOptions = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-between min-w-[150px]",
            selected.length > 0 && "border-primary"
          )}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {label}
            {selected.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {selected.length}
              </Badge>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        {searchable && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
        )}
        <div className="max-h-64 overflow-auto p-2 space-y-1">
          {filteredOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
              />
              <span className="flex-1 text-sm">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({option.count})
                </span>
              )}
            </label>
          ))}
          {filteredOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhum resultado
            </p>
          )}
        </div>
        {selected.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              Limpar seleção
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Range Filter
interface RangeFilterProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
}

export function RangeFilter({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => String(v),
}: RangeFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = value[0] !== min || value[1] !== max;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between min-w-[150px]", isActive && "border-primary")}
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            {label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{formatValue(value[0])}</span>
            <span className="text-muted-foreground">até</span>
            <span className="font-medium">{formatValue(value[1])}</span>
          </div>
          <Slider
            min={min}
            max={max}
            step={step}
            value={value}
            onValueChange={(v) => onChange(v as [number, number])}
            className="w-full"
          />
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([min, max])}
            >
              Limpar
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Date Range Filter
interface DateRangeFilterProps {
  label: string;
  value: { from?: Date; to?: Date };
  onChange: (value: { from?: Date; to?: Date }) => void;
}

export function DateRangeFilter({ label, value, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const isActive = value.from || value.to;

  const formatRange = () => {
    if (value.from && value.to) {
      return `${format(value.from, "dd/MM", { locale: ptBR })} - ${format(value.to, "dd/MM", { locale: ptBR })}`;
    }
    if (value.from) {
      return `A partir de ${format(value.from, "dd/MM", { locale: ptBR })}`;
    }
    if (value.to) {
      return `Até ${format(value.to, "dd/MM", { locale: ptBR })}`;
    }
    return null;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-between min-w-[150px]", isActive && "border-primary")}
        >
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatRange() || label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="range"
          selected={{ from: value.from, to: value.to }}
          onSelect={(range) => onChange({ from: range?.from, to: range?.to })}
          locale={ptBR}
          numberOfMonths={2}
        />
        {isActive && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange({})}
            >
              Limpar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Filter Bar
interface FilterBarProps {
  filters: FilterConfig[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear: () => void;
}

export function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  const activeFiltersCount = Object.values(values).filter(
    (v) => v !== undefined && v !== null && (Array.isArray(v) ? v.length > 0 : true)
  ).length;

  const updateFilter = useCallback(
    (key: string, value: any) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange]
  );

  const removeFilter = useCallback(
    (key: string) => {
      const newValues = { ...values };
      delete newValues[key];
      onChange(newValues);
    },
    [values, onChange]
  );

  // Get active filter chips
  const activeChips: { key: string; label: string; value: string }[] = [];
  filters.forEach((filter) => {
    const value = values[filter.key];
    if (!value) return;

    if (filter.type === "multiselect" && Array.isArray(value) && value.length > 0) {
      const labels = value
        .map((v: string) => filter.options?.find((o) => o.value === v)?.label)
        .filter(Boolean);
      if (labels.length > 0) {
        activeChips.push({
          key: filter.key,
          label: filter.label,
          value: labels.length > 2 ? `${labels.length} itens` : labels.join(", "),
        });
      }
    } else if (filter.type === "range" && Array.isArray(value)) {
      const [min, max] = value;
      if (min !== filter.min || max !== filter.max) {
        activeChips.push({
          key: filter.key,
          label: filter.label,
          value: `${min} - ${max}`,
        });
      }
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((filter) => {
          if (filter.type === "multiselect" && filter.options) {
            return (
              <MultiSelectFilter
                key={filter.key}
                label={filter.label}
                options={filter.options}
                selected={values[filter.key] || []}
                onChange={(v) => updateFilter(filter.key, v)}
                searchable={filter.options.length > 10}
              />
            );
          }

          if (filter.type === "range") {
            return (
              <RangeFilter
                key={filter.key}
                label={filter.label}
                min={filter.min || 0}
                max={filter.max || 100}
                step={filter.step}
                value={values[filter.key] || [filter.min || 0, filter.max || 100]}
                onChange={(v) => updateFilter(filter.key, v)}
              />
            );
          }

          if (filter.type === "daterange") {
            return (
              <DateRangeFilter
                key={filter.key}
                label={filter.label}
                value={values[filter.key] || {}}
                onChange={(v) => updateFilter(filter.key, v)}
              />
            );
          }

          return null;
        })}

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive">
            <X className="h-4 w-4 mr-1" />
            Limpar ({activeFiltersCount})
          </Button>
        )}
      </div>

      <AnimatePresence>
        {activeChips.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center gap-2 flex-wrap overflow-hidden"
          >
            {activeChips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                onRemove={() => removeFilter(chip.key)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Collapsible Filter Section
interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-medium hover:text-primary transition-colors">
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
