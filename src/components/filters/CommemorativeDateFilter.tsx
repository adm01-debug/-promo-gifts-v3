import { useActiveCommemorativeDates, CommemorativeDate } from "@/hooks/useCommemorativeDates";
import { Calendar, Gift, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CommemorativeDateFilterProps {
  selectedDate: string | null;
  onSelectDate: (slug: string | null) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Componente de filtro para datas comemorativas ativas
 * Mostra apenas datas que estão no período de campanha (baseado em campaign_start_days)
 */
export function CommemorativeDateFilter({
  selectedDate,
  onSelectDate,
  className,
  compact = false,
}: CommemorativeDateFilterProps) {
  const { data: activeDates, isLoading, error } = useActiveCommemorativeDates();

  // Não renderiza nada se não há datas ativas ou erro
  if (error) {
    console.error("Erro ao carregar datas comemorativas:", error);
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-3/4 rounded-lg" />
      </div>
    );
  }

  if (!activeDates?.length) {
    return null; // Sem datas ativas, não mostra o filtro
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Botão limpar se tiver seleção */}
      {selectedDate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Limpar
          </button>
        </div>
      )}

      {/* Lista de datas */}
      <ScrollArea className={cn("pr-2", compact ? "max-h-40" : "max-h-56")}>
        <div className="space-y-1.5">
          {activeDates.map((date) => (
            <CommemorativeDateItem
              key={date.id}
              date={date}
              isSelected={selectedDate === date.slug}
              onSelect={() => onSelectDate(selectedDate === date.slug ? null : date.slug)}
              compact={compact}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface CommemorativeDateItemProps {
  date: CommemorativeDate;
  isSelected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

function CommemorativeDateItem({ date, isSelected, onSelect, compact }: CommemorativeDateItemProps) {
  const daysUntilText = getDaysUntilText(date.days_until);
  const isToday = date.days_until === 0;
  const isThisWeek = date.days_until !== null && date.days_until <= 7;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onSelect}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 transition-all",
              "border border-transparent",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "hover:bg-muted/80 hover:border-border",
              isToday && !isSelected && "bg-accent/50 border-accent",
              date.is_featured && !isSelected && "ring-1 ring-primary/20"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">

              {/* Nome da data */}
              <span className={cn("truncate", compact && "text-xs")}>
                {date.name}
              </span>

              {/* Badge de destaque */}
              {date.is_featured && !compact && (
                <Sparkles className="h-3 w-3 text-yellow-500 flex-shrink-0" />
              )}
            </div>

            {/* Countdown */}
            {daysUntilText && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0",
                  isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : isToday
                    ? "bg-green-500/20 text-green-700 dark:text-green-400"
                    : isThisWeek
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {daysUntilText}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-medium">{date.name}</p>
            {date.formatted_date && (
              <p className="text-xs text-muted-foreground">{date.formatted_date}</p>
            )}
            {date.product_count !== undefined && (
              <p className="text-xs">
                <span className="text-primary font-medium">{date.product_count}</span> produtos
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getDaysUntilText(daysUntil: number | null): string | null {
  if (daysUntil === null) return null;
  if (daysUntil === 0) return "Hoje!";
  if (daysUntil === 1) return "Amanhã";
  if (daysUntil <= 7) return `${daysUntil}d`;
  if (daysUntil <= 30) return `${Math.ceil(daysUntil / 7)}sem`;
  return `${Math.ceil(daysUntil / 30)}m`;
}

export default CommemorativeDateFilter;
