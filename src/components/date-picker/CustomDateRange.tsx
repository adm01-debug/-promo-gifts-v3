import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, startOfWeek, endOfWeek, isAfter, isBefore, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { DateRange } from "react-day-picker";

// ============================================================================
// TYPES
// ============================================================================

export interface PresetRange {
  id: string;
  label: string;
  getRange: () => DateRange;
}

export interface CustomDateRangeProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  presets?: PresetRange[];
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  showCompare?: boolean;
  onCompareChange?: (compareRange: DateRange | undefined) => void;
  compareValue?: DateRange;
}

// ============================================================================
// DEFAULT PRESETS
// ============================================================================

export const defaultPresets: PresetRange[] = [
  {
    id: "today",
    label: "Hoje",
    getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    id: "yesterday",
    label: "Ontem",
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    id: "last7days",
    label: "Últimos 7 dias",
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    id: "last30days",
    label: "Últimos 30 dias",
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    id: "thisWeek",
    label: "Esta semana",
    getRange: () => ({
      from: startOfWeek(new Date(), { locale: ptBR }),
      to: endOfWeek(new Date(), { locale: ptBR }),
    }),
  },
  {
    id: "lastWeek",
    label: "Semana passada",
    getRange: () => {
      const lastWeek = subDays(new Date(), 7);
      return {
        from: startOfWeek(lastWeek, { locale: ptBR }),
        to: endOfWeek(lastWeek, { locale: ptBR }),
      };
    },
  },
  {
    id: "thisMonth",
    label: "Este mês",
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    id: "lastMonth",
    label: "Mês passado",
    getRange: () => {
      const lastMonth = subDays(startOfMonth(new Date()), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    id: "thisYear",
    label: "Este ano",
    getRange: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
  {
    id: "last90days",
    label: "Últimos 90 dias",
    getRange: () => ({
      from: subDays(new Date(), 89),
      to: new Date(),
    }),
  },
];

// ============================================================================
// CUSTOM DATE RANGE COMPONENT
// ============================================================================

export function CustomDateRange({
  value,
  onChange,
  presets = defaultPresets,
  minDate,
  maxDate,
  placeholder = "Selecione um período",
  className,
  disabled = false,
  showCompare = false,
  onCompareChange,
  compareValue,
}: CustomDateRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);
  const [manualFrom, setManualFrom] = React.useState("");
  const [manualTo, setManualTo] = React.useState("");
  const [isComparing, setIsComparing] = React.useState(false);

  // Format the display text
  const displayText = React.useMemo(() => {
    if (!value?.from) return placeholder;
    
    if (selectedPreset) {
      const preset = presets.find(p => p.id === selectedPreset);
      if (preset) return preset.label;
    }

    const fromStr = format(value.from, "dd/MM/yyyy", { locale: ptBR });
    const toStr = value.to ? format(value.to, "dd/MM/yyyy", { locale: ptBR }) : fromStr;
    
    return `${fromStr} - ${toStr}`;
  }, [value, selectedPreset, presets, placeholder]);

  // Handle preset selection
  const handlePresetSelect = (preset: PresetRange) => {
    const range = preset.getRange();
    onChange(range);
    setSelectedPreset(preset.id);
    setIsOpen(false);
  };

  // Handle calendar selection
  const handleCalendarSelect = (range: DateRange | undefined) => {
    onChange(range);
    setSelectedPreset(null);
  };

  // Handle manual date input
  const handleManualInput = () => {
    const fromParts = manualFrom.split("/");
    const toParts = manualTo.split("/");

    if (fromParts.length === 3 && toParts.length === 3) {
      const from = new Date(
        parseInt(fromParts[2]),
        parseInt(fromParts[1]) - 1,
        parseInt(fromParts[0])
      );
      const to = new Date(
        parseInt(toParts[2]),
        parseInt(toParts[1]) - 1,
        parseInt(toParts[0])
      );

      if (isValid(from) && isValid(to)) {
        onChange({ from, to });
        setSelectedPreset(null);
      }
    }
  };

  // Validate date range
  const isDisabledDate = (date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal min-w-[240px]",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="w-40 border-r p-2 space-y-1">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Período rápido
            </p>
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                  "hover:bg-muted focus:bg-muted focus:outline-none",
                  selectedPreset === preset.id && "bg-primary/10 text-primary font-medium"
                )}
              >
                <div className="flex items-center justify-between">
                  {preset.label}
                  {selectedPreset === preset.id && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              disabled={isDisabledDate}
              locale={ptBR}
              className="rounded-md"
            />

            <Separator className="my-3" />

            {/* Manual Input */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">De</label>
                <Input
                  placeholder="dd/mm/aaaa"
                  value={manualFrom}
                  onChange={(e) => setManualFrom(e.target.value)}
                  onBlur={handleManualInput}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Até</label>
                <Input
                  placeholder="dd/mm/aaaa"
                  value={manualTo}
                  onChange={(e) => setManualTo(e.target.value)}
                  onBlur={handleManualInput}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Compare Option */}
            {showCompare && (
              <div className="mt-3 pt-3 border-t">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isComparing}
                    onChange={(e) => {
                      setIsComparing(e.target.checked);
                      if (!e.target.checked) {
                        onCompareChange?.(undefined);
                      }
                    }}
                    className="rounded"
                  />
                  Comparar com período anterior
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange(undefined);
                  setSelectedPreset(null);
                  setIsOpen(false);
                }}
              >
                Limpar
              </Button>
              <Button size="sm" onClick={() => setIsOpen(false)}>
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// SIMPLE DATE RANGE DISPLAY
// ============================================================================

export interface DateRangeDisplayProps {
  range?: DateRange;
  showIcon?: boolean;
  className?: string;
}

export function DateRangeDisplay({ range, showIcon = true, className }: DateRangeDisplayProps) {
  if (!range?.from) return null;

  const fromStr = format(range.from, "dd MMM yyyy", { locale: ptBR });
  const toStr = range.to ? format(range.to, "dd MMM yyyy", { locale: ptBR }) : fromStr;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {showIcon && <CalendarIcon className="h-4 w-4 text-muted-foreground" />}
      <span>
        {fromStr} — {toStr}
      </span>
    </div>
  );
}
