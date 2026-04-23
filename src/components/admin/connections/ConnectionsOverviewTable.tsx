import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  RefreshCw,
  Database,
  Briefcase,
  Workflow,
  Plug,
  Webhook,
  Loader2,
  PlayCircle,
  Clock,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionStatusBadge } from "./ConnectionStatusBadge";
import { LatencyBadge } from "./LatencyBadge";
import { useConnectionsOverview, type OverviewRow } from "@/hooks/useConnectionsOverview";
import { useConnectionTester, type ConnectionType } from "@/hooks/useConnectionTester";
import { ConnectionsOverviewFilters } from "./ConnectionsOverviewFilters";
import { applyFilters, useConnectionsOverviewFilters } from "@/hooks/useConnectionsOverviewFilters";
import { ConnectionTestDetailsDialog } from "./ConnectionTestDetailsDialog";
import { useConsecutiveFailures } from "@/hooks/useConsecutiveFailures";
import { CONSECUTIVE_FAILURE_THRESHOLD } from "@/lib/connections-config";

const TYPE_META: Record<string, { label: string; Icon: typeof Database }> = {
  supabase: { label: "Banco", Icon: Database },
  bitrix24: { label: "Bitrix24", Icon: Briefcase },
  n8n: { label: "n8n", Icon: Workflow },
  mcp: { label: "MCP", Icon: Plug },
  webhook_outbound: { label: "Webhook", Icon: Webhook },
};

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  if (diff < 5_000) return "agora há pouco";
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

function rowStatus(r: OverviewRow): "active" | "degraded" | "error" | "unconfigured" | "disabled" {
  if (r.status === "disabled") return "disabled";
  if (!r.last_test_at) return "unconfigured";
  return r.last_test_ok ? "active" : "error";
}

export function ConnectionsOverviewTable() {
  const { rows, loading, refreshing, refresh, patchRow } = useConnectionsOverview(30000);
  const { test } = useConnectionTester();
  const filterState = useConnectionsOverviewFilters();
  const { filters, activeCount, reset } = filterState;
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [bulkTesting, setBulkTesting] = useState(false);
  const [detailsRow, setDetailsRow] = useState<OverviewRow | null>(null);
  const { map: failuresMap } = useConsecutiveFailures(rows, 30000);

  const filtered = useMemo(
    () => applyFilters(rows, filters, failuresMap),
    [rows, filters, failuresMap],
  );

  async function runTest(row: OverviewRow) {
    setTestingKey(row.key);
    try {
      const res = await test(row.type as ConnectionType, {
        env_key: row.env_key ?? undefined,
        connectionId: row.id ?? undefined,
      });
      patchRow(row.key, {
        last_test_at: res.tested_at ?? new Date().toISOString(),
        last_test_ok: res.ok,
        last_test_message: res.ok ? res.message ?? null : res.error ?? null,
        last_latency_ms: res.latency_ms ?? null,
      });
    } finally {
      setTestingKey(null);
    }
  }

  async function runAll() {
    setBulkTesting(true);
    try {
      const queue = [...filtered];
      const concurrency = 3;
      const workers = Array.from({ length: concurrency }, async () => {
        while (queue.length) {
          const next = queue.shift();
          if (!next) return;
          await runTest(next);
        }
      });
      await Promise.all(workers);
      await refresh();
    } finally {
      setBulkTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Visão geral das conexões</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Última verificação persistida de cada integração. Atualiza automaticamente a cada 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={runAll}
            disabled={bulkTesting || filtered.length === 0}
          >
            {bulkTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Testar {activeCount > 0 ? "filtradas" : "todas"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ConnectionsOverviewFilters
          filters={filters}
          toggleType={filterState.toggleType}
          setStatus={filterState.setStatus}
          setWindow={filterState.setWindow}
          removeType={filterState.removeType}
          setOnlyConsecutiveFailures={filterState.setOnlyConsecutiveFailures}
          reset={filterState.reset}
          activeCount={activeCount}
          totalCount={rows.length}
          filteredCount={filtered.length}
        />

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center">
            <Clock className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {activeCount > 0
                ? "Nenhuma conexão corresponde aos filtros"
                : "Nenhuma conexão cadastrada"}
            </p>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="h-8 text-xs">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <TooltipProvider delayDuration={200}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[150px]">Última verificação</TableHead>
                  <TableHead className="w-[110px]">Falhas seguidas</TableHead>
                  <TableHead className="w-[90px]">Latência</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const meta = TYPE_META[row.type] ?? { label: row.type, Icon: Plug };
                  const Icon = meta.Icon;
                  const isTesting = testingKey === row.key;
                  const message = row.last_test_message;
                  const failure = failuresMap.get(row.key);
                  const failCount = failure?.count ?? 0;
                  const overThreshold = failCount > CONSECUTIVE_FAILURE_THRESHOLD;
                  return (
                    <TableRow
                      key={row.key}
                      className={cn(
                        overThreshold && "bg-destructive/5 border-l-2 border-l-destructive",
                      )}
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="truncate max-w-[260px]" title={row.name}>
                          {row.name}
                        </div>
                        {row.env_key && (
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                            {row.env_key}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isTesting ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Testando...
                          </span>
                        ) : (
                          <ConnectionStatusBadge status={rowStatus(row)} />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatRelative(row.last_test_at)}
                      </TableCell>
                      <TableCell>
                        {failCount === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                                  overThreshold
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-warning/10 text-warning",
                                )}
                                aria-label={`${failCount} falhas consecutivas`}
                              >
                                {overThreshold && <AlertTriangle className="h-3 w-3" />}
                                {failCount}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">
                                {failure?.since
                                  ? `${failCount} ${failCount === 1 ? "falha consecutiva" : "falhas consecutivas"} desde ${formatRelative(failure.since)}`
                                  : `${failCount} ${failCount === 1 ? "falha consecutiva" : "falhas consecutivas"} — nunca houve sucesso registrado`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <LatencyBadge ms={row.last_latency_ms} />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        {message ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => row.last_test_at && setDetailsRow(row)}
                                className={cn(
                                  "block truncate text-left text-xs underline decoration-dotted underline-offset-2 hover:opacity-80 transition-opacity max-w-full",
                                  row.last_test_ok ? "text-muted-foreground" : "text-destructive",
                                )}
                                aria-label="Ver detalhes do último teste"
                              >
                                {message}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md">
                              <p className="text-xs whitespace-pre-wrap break-words">{message}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          {row.last_test_at && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setDetailsRow(row)}
                                  aria-label="Ver detalhes do último teste"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Ver detalhes do último teste</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => runTest(row)}
                            disabled={isTesting || bulkTesting}
                          >
                            {isTesting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PlayCircle className="h-3.5 w-3.5" />
                            )}
                            Testar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TooltipProvider>
        )}
      </CardContent>
      {detailsRow && (
        <ConnectionTestDetailsDialog
          open={!!detailsRow}
          onOpenChange={(v) => { if (!v) setDetailsRow(null); }}
          connectionType={detailsRow.type as ConnectionType}
          connectionLabel={detailsRow.name}
          envKey={detailsRow.env_key ?? undefined}
          connectionId={detailsRow.id ?? undefined}
        />
      )}
    </Card>
  );
}
