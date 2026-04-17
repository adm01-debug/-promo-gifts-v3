/**
 * Centralized error reporting service.
 * Captures unhandled errors and sends them to the database for monitoring.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';

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
