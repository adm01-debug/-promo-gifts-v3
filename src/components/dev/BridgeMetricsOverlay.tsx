/**
 * Overlay flutuante (somente preview/dev) que mostra cada chamada de bridge
 * em tempo real — latência, payload de resposta, status e request-id.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, memo } from 'react';
import { useDevGate } from '@/hooks/useDevGate';
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

const BridgeCallItem = memo(({ sample }: { sample: BridgeCallSample }) => {
  return (
    <li className="px-3 py-1.5 hover:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`shrink-0 rounded border px-1 text-[9px] uppercase ${bridgeBadge(sample.bridge)}`}>
            {sample.bridge === 'external-db-bridge' ? 'ext' : 'crm'}
          </span>
          <span className="truncate text-zinc-200">{sample.op}</span>
          {sample.target && <span className="truncate text-zinc-500">·{sample.target}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2 tabular-nums">
          <span className={latencyClass(sample.durationMs)}>{sample.durationMs}ms</span>
          <span className="text-zinc-400">{formatBytes(sample.respBytes)}</span>
          {!sample.ok && <span className="rounded bg-red-500/20 px-1 text-[9px] text-red-300">{sample.status ?? 'err'}</span>}
        </div>
      </div>
    </li>
  );
});

BridgeCallItem.displayName = 'BridgeCallItem';

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

const EMPTY: readonly BridgeCallSample[] = [];
const EMPTY_LT: readonly LongTaskEvent[] = [];

export default function BridgeMetricsOverlay() {
  const { isAllowed } = useDevGate();

  // Hard guard: nunca renderiza em build de produção.
  if (import.meta.env.PROD) return null;
  // Gate SSOT
  if (!isAllowed) return null;

  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'slow' | 'errors'>('all');
  const [tab, setTab] = useState<'calls' | 'longtasks'>('calls');

  const samples = useSyncExternalStore(
    subscribeBridgeCalls,
    () => (open && !paused ? getBridgeSamples() : EMPTY),
    () => EMPTY,
  );

  const longTasks = useSyncExternalStore(
    subscribeLongTasks,
    () => (open && !paused ? getLongTaskEvents() : EMPTY_LT),
    () => EMPTY_LT,
  );

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAllowed) return;
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
  }, [isAllowed]);

  const { visible, summary } = useMemo(() => {
    let arr = samples.slice(-MAX_VISIBLE * 3);
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
          >
            {paused ? 'paused' : 'live'}
          </button>
          <button
            type="button"
            onClick={() => clearBridgeSamples()}
            className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300 hover:bg-white/10"
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
          >
            ✕
          </button>
        </div>
      </div>

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
      </div>

      <div ref={listRef} className="flex-1 overflow-auto">
        {tab === 'calls' ? (
          visible.length === 0 ? (
            <div className="px-3 py-6 text-center text-zinc-500">Sem chamadas ainda.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {visible.map(s => (
                <BridgeCallItem key={s.id} sample={s} />
              ))}
            </ul>
          )
        ) : (
          longTasks.length === 0 ? (
            <div className="px-3 py-6 text-center text-zinc-500">Nenhuma long task detectada.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {[...longTasks].slice(-50).reverse().map(lt => (
                <li key={lt.id} className="px-3 py-1.5 hover:bg-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-zinc-200">{new Date(lt.startedAtWallMs).toISOString().slice(11, 23)}</span>
                    <span className={`shrink-0 tabular-nums ${latencyClass(lt.durationMs)}`}>{lt.durationMs}ms</span>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      <div className="border-t border-white/5 bg-zinc-900/60 px-3 py-1 text-[10px] text-zinc-500">
        ` para fechar
      </div>
    </div>
  );
}

if (typeof window !== 'undefined' && !import.meta.env.PROD) {
  (window as any).__longTasks = () => getLongTaskEvents().map(describeLongTask);
}
