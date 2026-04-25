import { Database, AlertTriangle, Bug, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { resolveSource } from "./CredentialsSourceFilterContext";
import { useExplainMode } from "./ExplainModeContext";
import type { SecretStatus } from "@/hooks/useSecretsManager";

/**
 * CardSourceDiagnostic — modo debug por card.
 *
 * Mostra de onde cada credencial do card está vindo:
 *   - DB        → integration_credentials (SSOT, gravado via /admin/conexoes)
 *   - ENV       → Deno.env.get fallback (legado / bootstrap)
 *   - AUSENTE   → nem DB nem ENV — card aparecerá como "Sem credenciais"
 *
 * Visibilidade:
 *   - Sempre visível quando há credencial AUSENTE (ajuda a debugar config faltante)
 *   - Visível quando o "Explain Mode" estiver ligado (toggle no header)
 *   - Oculto em estado normal (não polui o card)
 */

type Field = { label: string; status: SecretStatus | undefined };

interface Props {
  /** Lista de credenciais do card (URL, Anon, Service). */
  fields: Field[];
  /** readOnly (gerenciado) — se true, não mostra nada. */
  readOnly?: boolean;
  className?: string;
}

const SOURCE_META = {
  db: {
    label: "DB",
    cls: "border-success/40 bg-success/10 text-success",
    description: "integration_credentials",
  },
  env: {
    label: "ENV",
    cls: "border-warning/40 bg-warning/10 text-warning",
    description: "Deno.env (fallback legado)",
  },
  none: {
    label: "AUSENTE",
    cls: "border-destructive/40 bg-destructive/10 text-destructive",
    description: "não configurado",
  },
} as const;

export function CardSourceDiagnostic({ fields, readOnly, className }: Props) {
  const { enabled: explainOn } = useExplainMode();

  if (readOnly) return null;

  const rows = fields.map((f) => ({
    label: f.label,
    source: resolveSource(f.status),
    suffix: f.status?.masked_suffix ?? null,
  }));

  const hasMissing = rows.some((r) => r.source === "none");
  const usesEnvFallback = rows.some((r) => r.source === "env");

  // Só renderiza se houver problema OU explain mode ligado
  if (!hasMissing && !usesEnvFallback && !explainOn) return null;

  const tone = hasMissing ? "destructive" : usesEnvFallback ? "warning" : "info";
  const Icon = hasMissing ? ShieldAlert : usesEnvFallback ? AlertTriangle : Bug;
  const title = hasMissing
    ? "Credencial faltando — diagnóstico de origem"
    : usesEnvFallback
      ? "Usando fallback ENV — recomenda-se migrar para o banco"
      : "Diagnóstico de origem (modo debug)";

  return (
    <Alert
      variant={tone === "destructive" ? "destructive" : "default"}
      className={
        tone === "warning"
          ? `border-warning/40 bg-warning/5 ${className ?? ""}`
          : tone === "info"
            ? `border-primary/30 bg-primary/5 ${className ?? ""}`
            : className
      }
    >
      <Icon className="h-4 w-4" />
      <AlertTitle className="text-sm">{title}</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 space-y-1.5 text-xs">
          {rows.map((r) => {
            const meta = SOURCE_META[r.source];
            return (
              <li key={r.label} className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono uppercase ${meta.cls}`}
                >
                  {meta.label}
                </Badge>
                <span className="font-medium">{r.label}</span>
                <span className="text-muted-foreground">→ {meta.description}</span>
                {r.suffix && (
                  <span className="ml-auto font-mono text-muted-foreground">
                    ••••{r.suffix}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {hasMissing && (
          <p className="mt-2 text-xs text-muted-foreground">
            <Database className="inline h-3 w-3 mr-1" aria-hidden="true" />
            Adicione o valor abaixo no campo correspondente — ele será gravado em <code className="text-[10px]">integration_credentials</code> e usado tanto pela UI quanto pelo catálogo.
          </p>
        )}
        {!hasMissing && usesEnvFallback && (
          <p className="mt-2 text-xs text-muted-foreground">
            Salve novamente para migrar do ENV para o banco e habilitar rotação/auditoria.
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
