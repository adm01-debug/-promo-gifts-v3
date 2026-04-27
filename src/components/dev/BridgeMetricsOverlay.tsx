/**
 * Overlay flutuante (somente preview/dev) que mostra cada chamada de bridge
 * em tempo real — latência, payload de resposta, status e request-id.
 */
import { memo, useCallback } from 'react';
import { useDevGate } from '@/hooks/useDevGate';
import { useBridgeMetrics, type BridgeMetricsFilter, type BridgeMetricsTab } from '@/hooks/dev/useBridgeMetrics';
import { BridgeCallItem } from './metrics/BridgeCallItem';
import { BridgeMetricsSummary } from './metrics/BridgeMetricsSummary';
import { latencyClass } from './metrics/MetricUtils';

export default function BridgeMetricsOverlay() {
  const { isAllowed } = useDevGate();

  // Hard guard: nunca renderiza em build de produção.
  if (import.meta.env.PROD) return null;
  // Gate SSOT
  if (!isAllowed) return null;

  const {
    open,
    setOpen,
    paused,
    setPaused,
    filter,
    setFilter,
    tab,
    setTab,
    samples,
    longTasks,
    summary,
    clear
  } = useBridgeMetrics(isAllowed);

  const handleTogglePause = useCallback(() => setPaused(prev => !prev), [setPaused]);
  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Abrir métricas de bridge (preview)"
        onClick={() => setOpen(true)}
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
      className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 z-[9999] flex h-[60vh] sm:max-h-[70vh] w-full sm:w-[480px] flex-col overflow-hidden rounded-t-xl sm:rounded-xl border border-white/10 bg-zinc-950/95 text-xs font-mono text-zinc-100 shadow-2xl backdrop-blur max-h-[85vh] sm:max-h-[70vh]"
      style={{ 
        pointerEvents: 'auto',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <Header 
        paused={paused} 
        onTogglePause={handleTogglePause} 
        onClear={clear} 
        onClose={handleClose} 
      />

      <BridgeMetricsSummary summary={summary} />

      <Tabs 
        tab={tab} 
        setTab={setTab} 
        longTasksCount={longTasks.length} 
        filter={filter} 
        setFilter={setFilter} 
      />

      <div className="flex-1 overflow-auto">
        {tab === 'calls' ? (
          <CallsList samples={samples} />
        ) : (
          <LongTasksList tasks={longTasks} />
        )}
      </div>

      <div className="border-t border-white/5 bg-zinc-900/60 px-3 py-1 text-[10px] text-zinc-500">
        ` para fechar
      </div>
    </div>
  );
}

const Header = memo(({ paused, onTogglePause, onClear, onClose }: any) => (
  <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-zinc-900/80 px-3 py-2">
    <div className="flex items-center gap-2">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
      <span className="font-semibold">Bridge metrics</span>
      <span className="text-zinc-500">· preview only</span>
    </div>
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onTogglePause}
        className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${paused ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}
      >
        {paused ? 'paused' : 'live'}
      </button>
      <button
        type="button"
        onClick={onClear}
        className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300 hover:bg-white/10"
      >
        clear
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300 hover:bg-white/10"
      >
        ✕
      </button>
    </div>
  </div>
));

const Tabs = memo(({ tab, setTab, longTasksCount, filter, setFilter }: any) => (
  <div className="flex items-center gap-1 border-b border-white/5 px-3 py-1.5 text-[10px] uppercase tracking-wider overflow-x-auto no-scrollbar">
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
      {longTasksCount > 0 && (
        <span className="ml-1 rounded bg-red-500/30 px-1 text-[9px] text-red-200">{longTasksCount}</span>
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
));

const CallsList = memo(({ samples }: any) => {
  if (samples.length === 0) {
    return <div className="px-3 py-6 text-center text-zinc-500">Sem chamadas ainda.</div>;
  }
  return (
    <ul className="divide-y divide-white/5">
      {samples.map((s: any) => (
        <BridgeCallItem key={s.id} sample={s} />
      ))}
    </ul>
  );
});

const LongTasksList = memo(({ tasks }: any) => {
  if (tasks.length === 0) {
    return <div className="px-3 py-6 text-center text-zinc-500">Nenhuma long task detectada.</div>;
  }
  return (
    <ul className="divide-y divide-white/5">
      {[...tasks].slice(-50).reverse().map((lt: any) => (
        <li key={lt.id} className="px-3 py-1.5 hover:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-zinc-200">{new Date(lt.startedAtWallMs).toISOString().slice(11, 23)}</span>
            <span className={`shrink-0 tabular-nums ${latencyClass(lt.durationMs)}`}>{lt.durationMs}ms</span>
          </div>
        </li>
      ))}
    </ul>
  );
});
