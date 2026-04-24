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
  variant?: "inline" | "compact" | "icon-only";
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
