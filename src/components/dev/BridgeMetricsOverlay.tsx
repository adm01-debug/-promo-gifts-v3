/**
 * Overlay flutuante (somente preview/dev) que mostra cada chamada de bridge
 * em tempo real — latência, payload de resposta, status e request-id — para
 * identificar rapidamente quais queries estão causando o gargalo, sem
 * precisar abrir o painel /admin/telemetria.
 *
 * • Não é montado em produção (`import.meta.env.PROD === true` → render null).
 * • Toggle: tecla **`** (acento grave) ou clique no botão flutuante.
 * • Estado de visibilidade persiste em localStorage entre reloads.
 * • Zero custo quando colapsado: usa o mesmo `subscribeBridgeCalls` já throttled.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { shouldShowDevInfraMessages } from '@/lib/system/dev-infra-messages';
import {
  getBridgeSamples,
  subscribeBridgeCalls,
  clearBridgeSamples,
  type BridgeCallSample,
} from '@/lib/telemetry/bridgeCallMetrics';
import {
  getLongTaskEvents,
  subscribeLongTasks,
  clearLongTaskEvents,
  describeLongTask,
  type LongTaskEvent,
} from '@/lib/telemetry/longTaskWatchdog';

const STORAGE_KEY = 'lov:bridge-metrics-overlay:open';
const MAX_VISIBLE = 60;

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(2)}MB`;
}

function latencyClass(ms: number): string {
  if (ms < 200) return 'text-emerald-400';
  if (ms < 600) return 'text-amber-400';
  if (ms < 1500) return 'text-orange-400';
  return 'text-red-400';
}

function bridgeBadge(b: BridgeCallSample['bridge']): string {
  return b === 'external-db-bridge'
    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
    : 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40';
}

function shortReqId(id?: string): string {
  if (!id) return '—';
  return id.length > 8 ? id.slice(0, 8) : id;
}

export default function BridgeMetricsOverlay() {
  // Hard guard: nunca renderiza em build de produção.
  if (import.meta.env.PROD) return null;

  // Defesa em profundidade — gate SSOT (env > localStorage > role `dev`).
  // Mesmo que alguém monte o overlay fora do <DevOnlyBridgeOverlay />,
  // usuários comuns (agente/supervisor) NÃO veem o painel nem podem
  // ativar o atalho `` ` ``.
  const { isDev } = useAuth();
  const allowed = shouldShowDevInfraMessages(isDev);

  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'slow' | 'errors'>('all');
  const [tab, setTab] = useState<'calls' | 'longtasks'>('calls');

  // Subscrição compartilhada (já é throttled em 100ms). Quando colapsado,
  // skipamos o snapshot para zero overhead durante navegação.
  const samples = useSyncExternalStore(
    subscribeBridgeCalls,
    () => (open && !paused ? getBridgeSamples() : EMPTY),
    () => EMPTY,
  );

  // Long tasks: lazy-start o PerformanceObserver na 1ª subscription.
  const longTasks = useSyncExternalStore(
    subscribeLongTasks,
    () => (open && !paused ? getLongTaskEvents() : EMPTY_LT),
    () => EMPTY_LT,
  );

  const listRef = useRef<HTMLDivElement>(null);

  // Toggle por teclado: ` (backtick). Só registra o listener quando o gate aprova.
  useEffect(() => {
    if (!allowed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '`' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      e.preventDefault();
      setOpen(v => {
        const next = !v;
        try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* noop */ }
        return next;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowed]);

  // Resumo agregado das amostras visíveis (últimas N).
  const { visible, summary } = useMemo(() => {
    let arr = samples.slice(-MAX_VISIBLE * 3); // pega janela maior antes do filtro
    if (filter === 'slow') arr = arr.filter(s => s.durationMs >= 600);
    else if (filter === 'errors') arr = arr.filter(s => !s.ok);
    arr = arr.slice(-MAX_VISIBLE).reverse();

    const all = samples;
    const last20 = all.slice(-20);
    const avg = last20.length
      ? Math.round(last20.reduce((a, s) => a + s.durationMs, 0) / last20.length)
      : 0;
    const totalResp = last20.reduce((a, s) => a + s.respBytes, 0);
    const errors = all.filter(s => !s.ok).length;
    return {
      visible: arr,
      summary: { total: all.length, avg, totalResp, errors, last20: last20.length },
    };
  }, [samples, filter]);

  // Gate SSOT: usuários sem permissão não veem botão flutuante nem painel.
  if (!allowed) return null;

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Abrir métricas de bridge (preview)"
        onClick={() => {
          setOpen(true);
          try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* noop */ }
        }}
        className="fixed bottom-4 right-4 z-[9999] flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/80 px-3 text-xs font-mono text-white shadow-lg backdrop-blur hover:bg-black"
        style={{ pointerEvents: 'auto' }}
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        bridge metrics · `
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex max-h-[70vh] w-[480px] flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 text-xs font-mono text-zinc-100 shadow-2xl backdrop-blur"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-900/80 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="font-semibold">Bridge metrics</span>
          <span className="text-zinc-500">· preview only</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPaused(p => !p)}
            className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${paused ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
            title="Pausar atualização (calls continuam sendo gravadas)"
          >
            {paused ? 'paused' : 'live'}
          </button>
          <button
            type="button"
            onClick={() => clearBridgeSamples()}
            className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300 hover:bg-white/10"
            title="Limpar amostras"
          >
            clear
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              try { localStorage.setItem(STORAGE_KEY, '0'); } catch { /* noop */ }
            }}
            className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300 hover:bg-white/10"
            title="Fechar (`)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 border-b border-white/5 bg-zinc-900/40 px-3 py-2 text-[10px]">
        <div>
          <div className="text-zinc-500">total</div>
          <div className="font-semibold tabular-nums">{summary.total}</div>
        </div>
        <div>
          <div className="text-zinc-500">avg (last {summary.last20})</div>
          <div className={`font-semibold tabular-nums ${latencyClass(summary.avg)}`}>{summary.avg}ms</div>
        </div>
        <div>
          <div className="text-zinc-500">resp (last {summary.last20})</div>
          <div className="font-semibold tabular-nums">{formatBytes(summary.totalResp)}</div>
        </div>
        <div>
          <div className="text-zinc-500">errors</div>
          <div className={`font-semibold tabular-nums ${summary.errors > 0 ? 'text-red-400' : ''}`}>{summary.errors}</div>
        </div>
      </div>

      {/* Tab switcher + filtros contextuais */}
      <div className="flex items-center gap-1 border-b border-white/5 px-3 py-1.5 text-[10px] uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setTab('calls')}
          className={`rounded px-2 py-0.5 ${tab === 'calls' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
        >
          calls
        </button>
        <button
          type="button"
          onClick={() => setTab('longtasks')}
          className={`rounded px-2 py-0.5 ${tab === 'longtasks' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
          title="Long tasks (PerformanceObserver) correlacionadas com bridge calls"
        >
          longtasks
          {longTasks.length > 0 && (
            <span className="ml-1 rounded bg-red-500/30 px-1 text-[9px] text-red-200">{longTasks.length}</span>
          )}
        </button>

        {tab === 'calls' && (
          <div className="ml-auto flex gap-1">
            {(['all', 'slow', 'errors'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded px-2 py-0.5 ${filter === f ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-200'}`}
              >
                {f === 'slow' ? '≥600ms' : f}
              </button>
            ))}
          </div>
        )}
        {tab === 'longtasks' && (
          <button
            type="button"
            onClick={() => clearLongTaskEvents()}
            className="ml-auto rounded bg-white/5 px-2 py-0.5 text-zinc-300 hover:bg-white/10"
          >
            clear
          </button>
        )}
      </div>

      {/* Body */}
      <div ref={listRef} className="flex-1 overflow-auto">
        {tab === 'calls' && (
          visible.length === 0 ? (
            <div className="px-3 py-6 text-center text-zinc-500">
              Sem chamadas {filter !== 'all' ? `(${filter})` : 'ainda'}. Navegue pela app.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {visible.map(s => (
                <li key={s.id} className="px-3 py-1.5 hover:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className={`shrink-0 rounded border px-1 text-[9px] uppercase ${bridgeBadge(s.bridge)}`}>
                        {s.bridge === 'external-db-bridge' ? 'ext' : 'crm'}
                      </span>
                      <span className="truncate text-zinc-200">{s.op}</span>
                      {s.target && <span className="truncate text-zinc-500">·{s.target}</span>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 tabular-nums">
                      <span className={latencyClass(s.durationMs)}>{s.durationMs}ms</span>
                      <span className="text-zinc-400">{formatBytes(s.respBytes)}</span>
                      {!s.ok && (
                        <span className="rounded bg-red-500/20 px-1 text-[9px] text-red-300">
                          {s.status ?? 'err'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-zinc-500">
                    <span title={s.requestId}>req={shortReqId(s.requestId)}</span>
                    {s.serverRequestId && s.serverRequestId !== s.requestId && (
                      <span className="text-amber-400" title={`server=${s.serverRequestId}`}>≠srv</span>
                    )}
                    <span>req:{formatBytes(s.reqBytes)}</span>
                    {s.errorMessage && <span className="truncate text-red-400">{s.errorMessage}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'longtasks' && (
          longTasks.length === 0 ? (
            <div className="px-3 py-6 text-center text-zinc-500">
              Nenhuma long task ≥80ms detectada. Interaja com a UI para reproduzir.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {[...longTasks].slice(-50).reverse().map(lt => (
                <li key={lt.id} className="px-3 py-1.5 hover:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 rounded border border-red-500/40 bg-red-500/20 px-1 text-[9px] uppercase text-red-300">jank</span>
                      <span className="truncate text-zinc-200">
                        {new Date(lt.startedAtWallMs).toISOString().slice(11, 23)}
                      </span>
                      {lt.attribution.length > 0 && (
                        <span className="truncate text-zinc-500">·{lt.attribution.join('|')}</span>
                      )}
                    </div>
                    <span className={`shrink-0 tabular-nums ${latencyClass(lt.durationMs)}`}>
                      {lt.durationMs}ms
                    </span>
                  </div>
                  {lt.overlappingCalls.length > 0 && (
                    <div className="mt-1 ml-2 border-l border-amber-500/40 pl-2 text-[10px]">
                      <div className="text-amber-400">↳ em voo durante o bloqueio:</div>
                      <ul className="mt-0.5 space-y-0.5">
                        {lt.overlappingCalls.map(c => (
                          <li key={c.id} className="flex items-center gap-1.5 text-zinc-300">
                            <span className={`rounded border px-1 text-[9px] uppercase ${bridgeBadge(c.bridge)}`}>
                              {c.bridge === 'external-db-bridge' ? 'ext' : 'crm'}
                            </span>
                            <span className="truncate">{c.op}{c.target ? `·${c.target}` : ''}</span>
                            <span className={`ml-auto tabular-nums ${latencyClass(c.durationMs)}`}>{c.durationMs}ms</span>
                            <span className="tabular-nums text-zinc-500">{formatBytes(c.respBytes)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lt.recentlyCompletedCalls.length > 0 && (
                    <div className="mt-1 ml-2 border-l border-zinc-500/40 pl-2 text-[10px]">
                      <div className="text-zinc-400">↳ acabou de chegar (≤50ms antes):</div>
                      <ul className="mt-0.5 space-y-0.5">
                        {lt.recentlyCompletedCalls.map(c => (
                          <li key={c.id} className="flex items-center gap-1.5 text-zinc-300">
                            <span className="truncate">{c.op}{c.target ? `·${c.target}` : ''}</span>
                            <span className="ml-auto tabular-nums text-zinc-500">{formatBytes(c.respBytes)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lt.overlappingCalls.length === 0 && lt.recentlyCompletedCalls.length === 0 && (
                    <div className="mt-0.5 text-[10px] text-zinc-500">
                      Sem bridge calls correlacionadas — provável causa: render/parsing client-side.
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      <div className="border-t border-white/5 bg-zinc-900/60 px-3 py-1 text-[10px] text-zinc-500">
        ` para fechar · {tab === 'calls'
          ? `mostrando ${visible.length} de ${summary.total} calls`
          : `${longTasks.length} long task${longTasks.length === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}

const EMPTY: readonly BridgeCallSample[] = [];
const EMPTY_LT: readonly LongTaskEvent[] = [];

// Atalho para console: window.__longTasks() devolve resumo textual.
if (typeof window !== 'undefined' && !import.meta.env.PROD) {
  (window as unknown as { __longTasks?: () => string[] }).__longTasks = () =>
    getLongTaskEvents().map(describeLongTask);
}
