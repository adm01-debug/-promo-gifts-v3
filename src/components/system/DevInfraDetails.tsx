/**
 * DevInfraDetails — Bloco colapsável com diagnósticos técnicos exibido
 * dentro dos banners de infra (CloudStatusBanner / BridgeStatusBanner)
 * quando o gate `shouldShowDevInfraMessages` libera (default: role `dev`).
 *
 * Padrões:
 *  - Compacto por padrão; expandir via `<details>` nativo (zero JS extra).
 *  - Tipografia `font-mono` discreta, tokens semânticos (sem hardcoded).
 *  - Cada item recebe um `label` curto e um `value` renderizado como `<code>`.
 */
import { Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DevInfraDetailItem {
  label: string;
  /** String curta (timestamp, latência, contador, motivo). */
  value: string;
  /** Realce visual opcional (warn/error). */
  tone?: 'default' | 'warn' | 'error';
}

interface DevInfraDetailsProps {
  /** Título mostrado no <summary>. */
  title?: string;
  items: DevInfraDetailItem[];
  /** Texto livre adicional (ex.: motivo do bridge). */
  note?: string;
  className?: string;
}

export function DevInfraDetails({
  title = 'Detalhes técnicos (dev)',
  items,
  note,
  className,
}: DevInfraDetailsProps) {
  if (items.length === 0 && !note) return null;
  return (
    <details
      className={cn(
        'group/devinfra rounded-md border border-current/20 bg-background/10 px-2 py-1 text-[11px]',
        className,
      )}
    >
      <summary className="flex cursor-pointer select-none items-center gap-1.5 font-medium opacity-90 outline-none [&::-webkit-details-marker]:hidden">
        <Bug className="h-3 w-3 shrink-0" aria-hidden />
        <span>{title}</span>
        <span className="ml-auto opacity-60 transition-transform group-open/devinfra:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono">
        {items.map((it) => (
          <div key={it.label} className="contents">
            <dt className="opacity-70">{it.label}</dt>
            <dd
              className={cn(
                'truncate',
                it.tone === 'warn' && 'text-warning-foreground',
                it.tone === 'error' && 'font-semibold',
              )}
              title={it.value}
            >
              {it.value || '—'}
            </dd>
          </div>
        ))}
      </dl>
      {note && (
        <p className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[10px] opacity-75">
          {note}
        </p>
      )}
    </details>
  );
}

/** Helper: formata epoch ms relativo a agora ("12s atrás"). */
export function formatRelative(epochMs: number, now = Date.now()): string {
  const delta = Math.max(0, now - epochMs);
  if (delta < 1500) return 'agora';
  if (delta < 60_000) return `${Math.round(delta / 1000)}s atrás`;
  if (delta < 3_600_000) return `${Math.round(delta / 60_000)}min atrás`;
  return new Date(epochMs).toLocaleTimeString('pt-BR');
}

/** Helper: formata ms como "123ms" ou "1.2s". */
export function formatMs(ms: number | undefined | null): string {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
