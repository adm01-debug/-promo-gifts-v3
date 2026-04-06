/**
 * Configuração centralizada de status de orçamentos
 * Fonte única de verdade para labels, cores e estilos de cada status.
 */

import type { QuoteStatus } from "@/types/quote";

export interface QuoteStatusConfig {
  label: string;
  /** HSL color token for charts / icons */
  color: string;
  /** Badge variant for QuoteViewPage */
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  /** Tailwind classes for list badges (bg + text + border) */
  badgeClassName: string;
  /** Lucide icon name hint (optional, for future use) */
  icon?: string;
}

export const QUOTE_STATUS_CONFIG: Record<string, QuoteStatusConfig> = {
  draft: {
    label: "Rascunho",
    color: "hsl(var(--muted-foreground))",
    badgeVariant: "secondary",
    badgeClassName: "bg-warning/15 text-warning border-warning/30",
  },
  pending: {
    label: "Pendente",
    color: "hsl(var(--warning))",
    badgeVariant: "outline",
    badgeClassName: "bg-info/15 text-info border-info/30",
  },
  sent: {
    label: "Enviado",
    color: "hsl(var(--info))",
    badgeVariant: "default",
    badgeClassName: "bg-primary/15 text-primary border-primary/30",
  },
  approved: {
    label: "Aprovado",
    color: "hsl(var(--success))",
    badgeVariant: "default",
    badgeClassName: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  converted: {
    label: "Convertido em Pedido",
    color: "hsl(var(--success))",
    badgeVariant: "default",
    badgeClassName: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  rejected: {
    label: "Rejeitado",
    color: "hsl(var(--destructive))",
    badgeVariant: "destructive",
    badgeClassName: "bg-destructive/15 text-destructive border-destructive/30",
  },
  expired: {
    label: "Expirado",
    color: "hsl(var(--muted-foreground))",
    badgeVariant: "secondary",
    badgeClassName: "bg-muted text-muted-foreground border-muted",
  },
};

/** Helper: get status label with fallback */
export function getQuoteStatusLabel(status: string): string {
  return QUOTE_STATUS_CONFIG[status]?.label || status;
}

/** Helper: get status color for charts */
export function getQuoteStatusColor(status: string): string {
  return QUOTE_STATUS_CONFIG[status]?.color || "hsl(var(--muted-foreground))";
}
