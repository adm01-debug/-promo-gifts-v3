/**
 * Centralized error reporting service.
 * Captures unhandled errors and sends them to the database for monitoring.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';
import { onBridgeStatus, isColdStartSignal } from '@/lib/external-db/bridge-status-events';

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

const ERROR_QUEUE: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000;
const MAX_QUEUE = 20;

/**
 * Buffer de erros suspeitos de "cold-start" (503 / boot_error / function failed to start).
 * Adia o envio por COLD_START_DEFER_MS para que um evento `recovered` da bridge
 * possa descartá-los — evitando false positives quando a 2ª tentativa carrega com sucesso.
 */
type DeferredColdStart = {
  report: ErrorReport;
  timer: ReturnType<typeof setTimeout>;
};
const COLD_START_DEFER_MS = 8000;
const COLD_START_BUFFER: DeferredColdStart[] = [];
let bridgeListenerInstalled = false;

function installBridgeListenerOnce() {
  if (bridgeListenerInstalled) return;
  bridgeListenerInstalled = true;
  onBridgeStatus((e) => {
    if (e.type !== 'recovered') return;
    // Bridge recuperou: descarta todos os 503/boot ainda pendentes na janela.
    while (COLD_START_BUFFER.length > 0) {
      const pending = COLD_START_BUFFER.shift()!;
      clearTimeout(pending.timer);
      logger.debug('[ErrorReporter] Discarded cold-start false positive after bridge recovery');
    }
  });
}

function isColdStartReport(report: ErrorReport): boolean {
  const haystack = `${report.message} ${report.stack ?? ''}`;
  return isColdStartSignal(haystack);
}

async function flushErrors() {
  if (ERROR_QUEUE.length === 0) return;

  const batch = ERROR_QUEUE.splice(0, MAX_QUEUE);

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    for (const err of batch) {
      err.userId = userId;
    }

    // Log to admin_audit_log for observability
    const rows = batch.map(err => ({
      action: 'client_error',
      resource_type: 'error',
      resource_id: null,
      user_id: err.userId || '00000000-0000-0000-0000-000000000000',
      details: {
        message: err.message,
        stack: err.stack?.slice(0, 2000),
        url: err.url,
        timestamp: err.timestamp,
        userAgent: err.userAgent.slice(0, 200),
        ...err.metadata,
      },
      ip_address: null,
      user_agent: err.userAgent.slice(0, 200),
    }));

    const { error } = await supabase.from('admin_audit_log').insert(rows);
    if (error) logger.warn('[ErrorReporter] Failed to flush:', error.message);
  } catch (e) {
    logger.warn('[ErrorReporter] Flush failed:', e);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushErrors();
  }, FLUSH_INTERVAL);
}

export function reportError(error: Error, metadata?: Record<string, unknown>) {
  // Forward to Sentry (no-op if DSN not configured)
  captureException(error, metadata);

  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    metadata,
  };

  ERROR_QUEUE.push(report);

  if (ERROR_QUEUE.length >= MAX_QUEUE) {
    flushErrors();
  } else {
    scheduleFlush();
  }
}

/**
 * Install global error listeners for unhandled errors and promise rejections.
 */
export function installGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message), {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    reportError(error, { type: 'unhandled_promise_rejection' });
  });
}
