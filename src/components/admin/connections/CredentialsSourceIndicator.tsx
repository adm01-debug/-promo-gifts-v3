/**
 * CredentialsSourceIndicator
 *
 * Indicador read-only no topo da zona Conexões em /admin/conexoes que torna
 * explícita a origem dos dados de credenciais exibidos na página:
 *
 *   Fonte: tabela `integration_credentials` (banco principal — SSOT)
 *   Lida via edge function `secrets-manager` (action: list)
 *
 * Mostra também:
 *   - Contagem por origem resolvida (DB · ENV fallback · ausente)
 *   - Data/hora da última atualização (max(updated_at) entre todos os secrets carregados)
 *   - Quem atualizou por último (updated_by_email do registro mais recente)
 *
 * Importante: é apenas leitura, não dispara invocações novas — recebe os
 * `secrets` já carregados pelo hook `useSecretsManager` do componente pai.
 */
import { useState } from "react";
import { Database, Clock, ShieldCheck, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { resolveSource } from "./CredentialsSourceFilterContext";
import type { SecretStatus } from "@/hooks/useSecretsManager";

interface Props {
  secrets: SecretStatus[];
  /** Mostra esqueleto enquanto a primeira carga está em andamento. */
  isLoading?: boolean;
  /**
   * Handler de refresh manual: deve invalidar o cache no servidor
   * (`secrets-manager` action `refresh_cache`) e em seguida re-listar
   * os secrets para refletir o estado mais recente. Quando ausente,
   * o botão de refresh não é renderizado.
   */
  onRefresh?: () => Promise<void> | void;
  className?: string;
}

const RTF = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function formatRelative(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  const diffMs = t - Date.now();
  const abs = Math.abs(diffMs);
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (abs < min) return "há poucos segundos";
  if (abs < hour) return RTF.format(Math.round(diffMs / min), "minute");
  if (abs < day) return RTF.format(Math.round(diffMs / hour), "hour");
  return RTF.format(Math.round(diffMs / day), "day");
}

function formatAbsolute(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function CredentialsSourceIndicator({ secrets, isLoading, onRefresh, className }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
      toast.success("Credenciais recarregadas", {
        description: "Cache do secrets-manager invalidado e integration_credentials re-listada.",
      });
    } catch (err) {
      toast.error("Falha ao recarregar credenciais", {
        description: err instanceof Error ? err.message : "Erro desconhecido.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const counts = secrets.reduce(
    (acc, s) => {
      const src = resolveSource(s);
      acc[src] = (acc[src] ?? 0) + 1;
      return acc;
    },
    { db: 0, env: 0, none: 0 } as Record<"db" | "env" | "none", number>,
  );

  // Pega o secret mais recentemente atualizado (apenas os com updated_at)
  const latest = secrets
    .filter((s) => !!s.updated_at)
    .sort((a, b) => (b.updated_at! > a.updated_at! ? 1 : -1))[0];

  const relative = formatRelative(latest?.updated_at ?? null);
  const absolute = formatAbsolute(latest?.updated_at ?? null);

  return (
    <div
      className={[
        "rounded-lg border bg-card px-4 py-3",
        "flex items-start gap-3 flex-wrap",
        className ?? "",
      ].join(" ")}
      role="status"
      aria-live="polite"
      data-testid="credentials-source-indicator"
    >
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Database className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-[260px] space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium leading-none">
            Fonte das credenciais
          </p>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono uppercase border-success/40 bg-success/10 text-success cursor-help"
                >
                  <ShieldCheck className="h-3 w-3 mr-1" aria-hidden="true" />
                  SSOT
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Single Source of Truth: os valores exibidos vêm da tabela
                <code className="mx-1 font-mono">integration_credentials</code>
                lida via edge function
                <code className="mx-1 font-mono">secrets-manager</code>
                (action <code className="font-mono">list</code>). Os segredos
                permanecem mascarados — apenas o sufixo é retornado ao
                navegador.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <p className="text-xs text-muted-foreground">
          Lista, badges e máscaras desta página vêm de{" "}
          <code className="text-[11px] font-mono text-foreground">
            integration_credentials
          </code>{" "}
          via{" "}
          <code className="text-[11px] font-mono text-foreground">
            secrets-manager
          </code>
          . Valores nunca trafegam em texto puro para o frontend.
        </p>

        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  tabIndex={0}
                  className="text-[10px] font-mono uppercase border-success/40 bg-success/10 text-success cursor-help focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`${counts.db} credenciais com origem DB`}
                >
                  DB · {counts.db}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                <p className="font-semibold">Origem: banco (SSOT)</p>
                <p>
                  Valor persistido em{" "}
                  <code className="font-mono">integration_credentials</code> e
                  resolvido pelo <code className="font-mono">secrets-manager</code>.
                </p>
                <p className="text-muted-foreground">
                  ✅ Nada a fazer — auditável, rotacionável e versionado pelo painel.
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  tabIndex={0}
                  className="text-[10px] font-mono uppercase border-warning/40 bg-warning/10 text-warning cursor-help focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`${counts.env} credenciais com origem ENV`}
                >
                  ENV · {counts.env}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                <p className="font-semibold">Origem: variável de ambiente (legado)</p>
                <p>
                  Valor lido via <code className="font-mono">Deno.env.get()</code>{" "}
                  porque o registro ainda não existe em{" "}
                  <code className="font-mono">integration_credentials</code>.
                </p>
                <p className="text-muted-foreground">
                  ⚠ Abra o card correspondente e clique em <strong>Salvar</strong> para
                  migrar para o banco e liberar rotação/auditoria.
                </p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  tabIndex={0}
                  className="text-[10px] font-mono uppercase border-destructive/40 bg-destructive/10 text-destructive cursor-help focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`${counts.none} credenciais ausentes`}
                >
                  AUSENTE · {counts.none}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                <p className="font-semibold">Sem valor em DB nem em ENV</p>
                <p>
                  O <code className="font-mono">secrets-manager</code> não encontrou
                  o segredo em nenhuma das duas fontes — a integração que depende
                  dele ficará inativa.
                </p>
                <p className="text-muted-foreground">
                  🔧 Preencha o campo correspondente no card e salve para gravar em{" "}
                  <code className="font-mono">integration_credentials</code>.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div
        className="flex items-center gap-2 text-xs text-muted-foreground shrink-0"
        title={absolute ? `Última gravação em ${absolute}` : undefined}
      >
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {isLoading && secrets.length === 0 ? (
          <span className="italic">Carregando…</span>
        ) : !relative ? (
          <span>Sem atualização registrada</span>
        ) : (
          <span>
            <span className="font-medium text-foreground">Atualizado {relative}</span>
            {absolute && (
              <span className="ml-1 hidden md:inline text-muted-foreground/80">
                · {absolute}
              </span>
            )}
            {latest?.updated_by_email && (
              <span className="ml-1 hidden lg:inline">
                · por <span className="font-mono">{latest.updated_by_email}</span>
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
