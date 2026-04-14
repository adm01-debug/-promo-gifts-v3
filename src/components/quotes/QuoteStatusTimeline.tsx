import { Check, Clock, Eye, FileText, RefreshCw, Send, ThumbsDown, ThumbsUp, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuoteStatusTimelineProps {
  status: string;
  createdAt?: string;
  updatedAt?: string;
  clientResponseAt?: string;
  isSyncing?: boolean;
}

const steps = [
  { key: "draft",       label: "Rascunho",      icon: FileText },
  { key: "pending",     label: "Pendente",       icon: Clock },
  { key: "syncing",     label: "Sincronizando",  icon: RefreshCw },
  { key: "sent",        label: "Enviado",        icon: Send },
];

// Pending = idx 1, Syncing = idx 2, Sent = idx 3
const statusOrder: Record<string, number> = {
  draft:    0,
  pending:  1,
  sent:     4, // além do último step → todos marcados como concluídos
  approved: 4,
  rejected: 4,
  expired:  4,
};

function formatTs(ts?: string) {
  if (!ts) return null;
  try {
    return format(new Date(ts), "dd/MM HH:mm", { locale: ptBR });
  } catch {
    return null;
  }
}

export function QuoteStatusTimeline({
  status,
  createdAt,
  updatedAt,
  clientResponseAt,
  isSyncing = false,
}: QuoteStatusTimelineProps) {
  // While syncing, force current index to 2 (Sincronizando)
  const baseIdx = statusOrder[status] ?? 0;
  const currentIdx = isSyncing ? 2 : baseIdx;

  const isRejected = status === "rejected";
  const isExpired  = status === "expired";
  const isFinalNegative = isRejected || isExpired;

  const displaySteps = steps.map((step, idx) => {
    // Last step adapts to rejected/expired when status demands it
    if (idx === steps.length - 1 && isRejected) {
      return { key: "rejected", label: "Rejeitado", icon: ThumbsDown };
    }
    if (idx === steps.length - 1 && isExpired) {
      return { key: "expired", label: "Expirado", icon: AlertTriangle };
    }
    return step;
  });

  return (
    <div className="flex items-center w-full gap-0">
      {displaySteps.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent   = idx === currentIdx;
        const Icon = step.icon;
        const isSync = step.key === "syncing";

        let timestamp: string | null = null;
        if (idx === 0) timestamp = formatTs(createdAt);
        else if (isCurrent && !isSyncing) timestamp = formatTs(updatedAt);
        if (idx === steps.length - 1 && (status === "approved" || isRejected)) {
          timestamp = formatTs(clientResponseAt || updatedAt);
        }

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && !isFinalNegative && !isSync && "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
                  isCurrent && isSync && "border-success bg-primary/10 text-primary ring-2 ring-primary/20",
                  isCurrent && isRejected && "border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20",
                  isCurrent && isExpired && "border-muted-foreground bg-muted text-muted-foreground ring-2 ring-muted-foreground/20",
                  !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground/40"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isCurrent && isSync ? (
                  <Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium whitespace-nowrap",
                  isCompleted && "text-primary",
                  isCurrent && !isFinalNegative && !isSync && "text-primary font-semibold",
                  isCurrent && isSync && "text-primary font-semibold",
                  isCurrent && isRejected && "text-destructive font-semibold",
                  isCurrent && isExpired && "text-muted-foreground font-semibold",
                  !isCompleted && !isCurrent && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
              {timestamp && (
                <span className="text-[10px] text-muted-foreground">{timestamp}</span>
              )}
            </div>

            {/* Connector line */}
            {idx < displaySteps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 rounded-full transition-all",
                  idx < currentIdx ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
