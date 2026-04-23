import { AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { diagnoseMaskedSuffix, formatDisplaySuffix } from "@/lib/masked-suffix";

interface Props {
  /** Sufixo cru retornado pelo backend (pode ser null, curto ou completo). */
  suffix: string | null | undefined;
  /** Nome do secret — usado para personalizar a mensagem de orientação. */
  secretName?: string;
  /** Quando true, mostra o badge mesmo no estado válido (default: false). */
  showWhenValid?: boolean;
  /** Mostra o sufixo formatado ao lado do ícone (default: true). */
  showSuffix?: boolean;
  className?: string;
}

/**
 * Renderiza o sufixo mascarado com um indicador visual de saúde:
 * - válido (4+ chars): nenhum aviso (a menos que showWhenValid)
 * - curto (<4 chars): chip âmbar com tooltip explicativo
 * - ausente: chip destrutivo com tooltip orientando re-salvar
 *
 * Sempre acessível: o tooltip vira `aria-description` para leitores de tela.
 */
export function MaskedSuffixBadge({
  suffix,
  secretName,
  showWhenValid = false,
  showSuffix = true,
  className,
}: Props) {
  const diagnosis = diagnoseMaskedSuffix(suffix, { secretName });
  const display = formatMaskedSuffix(suffix);

  if (diagnosis.status === "valid" && !showWhenValid) {
    return showSuffix ? (
      <span className={cn("font-mono text-xs text-muted-foreground", className)} aria-label={diagnosis.message}>
        {display}
      </span>
    ) : null;
  }

  const tone =
    diagnosis.status === "missing"
      ? {
          icon: ShieldAlert,
          chip: "bg-destructive/10 border-destructive/40 text-destructive",
          ring: "ring-destructive/30",
        }
      : diagnosis.status === "short"
      ? {
          icon: AlertTriangle,
          chip: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300",
          ring: "ring-amber-500/30",
        }
      : {
          icon: CheckCircle2,
          chip: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
          ring: "ring-emerald-500/30",
        };

  const Icon = tone.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          aria-live="polite"
          aria-label={diagnosis.message}
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ring-1 cursor-help",
            tone.chip,
            tone.ring,
            className,
          )}
        >
          <Icon className="h-3 w-3 shrink-0" aria-hidden />
          {showSuffix && <span className="font-mono">{display}</span>}
          <span className="hidden sm:inline">— {diagnosis.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs text-xs leading-relaxed">
        <p className="font-medium mb-1">{diagnosis.label}</p>
        <p className="text-muted-foreground">{diagnosis.message}</p>
      </TooltipContent>
    </Tooltip>
  );
}
