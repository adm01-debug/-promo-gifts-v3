/**
 * PriceFreshnessBadge
 *
 * Visual indicator showing when the supplier last updated this product's price.
 * Three variants:
 *  - `inline`: full text + icon (PDP, Quick View)
 *  - `compact`: shortened "há Nd" (sticky header, quote builder line)
 *  - `icon-only`: icon w/ aria-label (catalog cards, table)
 *
 * In `compact` and `icon-only` variants, the badge only renders for
 * `aging`/`stale` statuses to avoid noise on freshly-updated products.
 */
import { AlertTriangle, Clock, CheckCircle2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  getPriceFreshness,
  type PriceFreshnessStatus,
} from "@/utils/price-freshness";

export interface PriceFreshnessBadgeProps {
  priceUpdatedAt?: string | Date | null;
  thresholdDays?: number | null;
  variant?: "inline" | "compact" | "icon-only" | "pdp";
  className?: string;
  /** Force render even when status is `fresh`/`unknown` in compact/icon-only variants. */
  alwaysShow?: boolean;
}

const STATUS_STYLES: Record<
  PriceFreshnessStatus,
  { color: string; Icon: typeof Clock }
> = {
  fresh: { color: "text-emerald-600 dark:text-emerald-500", Icon: CheckCircle2 },
  aging: { color: "text-muted-foreground", Icon: Clock },
  stale: { color: "text-amber-600 dark:text-amber-500", Icon: AlertTriangle },
  unknown: { color: "text-muted-foreground", Icon: HelpCircle },
};

function formatCompactRelative(days: number | null): string {
  if (days === null) return "—";
  if (days <= 0) return "hoje";
  if (days < 30) return `há ${days}d`;
  if (days < 365) return `há ${Math.floor(days / 30)}m`;
  return `há ${Math.floor(days / 365)}a`;
}

function formatAbsoluteDate(value: string | Date): string | null {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatRelativeDaysShort(days: number | null): string {
  if (days === null) return "";
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  return `há ${days} dias`;
}

export function PriceFreshnessBadge({
  priceUpdatedAt,
  thresholdDays,
  variant = "inline",
  className,
  alwaysShow = false,
}: PriceFreshnessBadgeProps) {
  const freshness = getPriceFreshness(priceUpdatedAt, thresholdDays);
  const { Icon, color } = STATUS_STYLES[freshness.status];

  // Quiet variants only render when there's something worth flagging.
  if (
    !alwaysShow &&
    (variant === "compact" || variant === "icon-only") &&
    !freshness.shouldWarn
  ) {
    return null;
  }

  const ariaLabel = freshness.label;

  let body: React.ReactNode;
  if (variant === "icon-only") {
    body = (
      <span
        role="status"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center",
          color,
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  } else if (variant === "compact") {
    body = (
      <span
        role="status"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium",
          color,
          className,
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span className="tabular-nums">
          {formatCompactRelative(freshness.daysSinceUpdate)}
        </span>
      </span>
    );
  } else if (variant === "pdp") {
    const absolute = priceUpdatedAt ? formatAbsoluteDate(priceUpdatedAt) : null;
    const relative = formatRelativeDaysShort(freshness.daysSinceUpdate);

    if (freshness.status === "stale") {
      body = (
        <div
          role="status"
          aria-label={ariaLabel}
          className={cn(
            "inline-flex items-start gap-2.5 rounded-xl border-[1.5px] border-amber-300 bg-amber-100/80 px-3.5 py-2.5 text-amber-900 dark:border-amber-500/60 dark:bg-amber-500/15 dark:text-amber-200",
            className,
          )}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="font-display font-semibold text-sm">
              Preço pode estar defasado
            </span>
            {absolute && (
              <span className="text-xs text-amber-800/90 dark:text-amber-200/80 tabular-nums">
                Última atualização: {absolute} ({relative})
              </span>
            )}
            <span className="text-[11px] text-amber-800/80 dark:text-amber-200/70">
              Confirme com o fornecedor antes de fechar o orçamento.
            </span>
          </div>
        </div>
      );
    } else if (freshness.status === "aging" && absolute) {
      body = (
        <span
          role="status"
          aria-label={ariaLabel}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
            className,
          )}
        >
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">
            Preço atualizado em {absolute} · confirme se necessário
          </span>
        </span>
      );
    } else if (freshness.status === "fresh" && absolute) {
      body = (
        <span
          role="status"
          aria-label={ariaLabel}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400",
            className,
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">
            Preço atualizado em {absolute} · {relative}
          </span>
        </span>
      );
    } else {
      // unknown / invalid date
      body = (
        <span
          role="status"
          aria-label={ariaLabel}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground",
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Data de atualização não informada</span>
        </span>
      );
    }
  } else {
    body = (
      <span
        role="status"
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-medium",
          color,
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{freshness.label}</span>
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{body}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {freshness.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
