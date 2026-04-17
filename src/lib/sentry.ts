/**
 * Sentry initialization — opt-in via VITE_SENTRY_DSN.
 * If DSN is absent (e.g., local dev or preview without secret), Sentry is disabled silently.
 */
import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    beforeSend(event) {
      // Strip auth headers / tokens accidentally captured
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>).authorization;
        delete (event.request.headers as Record<string, unknown>).cookie;
      }
      return event;
    },
  });
  initialized = true;
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(error, { extra: context });
}

export function setSentryUser(user: { id: string; email?: string } | null): void {
  if (!initialized) return;
  Sentry.setUser(user);
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
