import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NormalizedSecretError } from "./secretErrors";

interface Props {
  error: NormalizedSecretError;
  onRetry?: () => void;
  retryLabel?: string;
  retryDisabled?: boolean;
  className?: string;
  /** Compact = inline near a field; expanded = standalone block. */
  variant?: "compact" | "expanded";
}

/**
 * Single source of truth for rendering credential/connection errors.
 * Same chip + headline + description + hint + retry button everywhere.
 */
export function SecretErrorAlert({
  error,
  onRetry,
  retryLabel = "Tentar novamente",
  retryDisabled,
  className,
  variant = "compact",
}: Props) {
  const showRetry = !!onRetry && error.retryable;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-destructive/30 bg-destructive/5 animate-in fade-in duration-200",
        variant === "expanded" ? "p-3 space-y-2" : "px-2.5 py-2 text-xs",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 text-destructive min-w-0">
          <AlertCircle className={cn("shrink-0", variant === "expanded" ? "h-4 w-4 mt-0.5" : "h-3.5 w-3.5 mt-0.5")} />
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="border-destructive/40 text-destructive text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0">
                {error.categoryLabel}
              </Badge>
              {variant === "expanded" && (
                <span className="font-semibold text-foreground text-sm">{error.title}</span>
              )}
            </div>
            <p className="text-destructive break-words leading-snug">
              {error.description}
            </p>
            {error.hint && (
              <p className="text-muted-foreground break-words leading-snug">
                {error.hint}
              </p>
            )}
          </div>
        </div>
        {showRetry && (
          <Button
            size="sm"
            variant="outline"
            className={cn("shrink-0", variant === "expanded" ? "h-8" : "h-7 px-2")}
            onClick={onRetry}
            disabled={retryDisabled}
          >
            <RefreshCw className={cn("mr-1", variant === "expanded" ? "h-3.5 w-3.5" : "h-3 w-3")} />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
