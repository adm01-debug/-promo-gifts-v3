/**
 * Web Vitals tracking — monitors LCP, CLS, INP, FCP, TTFB.
 * In dev: logs to console. In prod: sends to store-web-vitals edge function.
 */
import type { Metric } from 'web-vitals';
import { supabase } from '@/integrations/supabase/client';

/** Buffer metrics and flush periodically to reduce requests */
let metricsBuffer: Record<string, unknown>[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

function flushMetrics() {
  if (metricsBuffer.length === 0) return;

  const batch = [...metricsBuffer];
  metricsBuffer = [];

  supabase.functions
    .invoke('store-web-vitals', { body: batch })
    .catch(() => {
      // Non-critical — silently fail
    });
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushMetrics();
  }, 5000); // Flush every 5s
}

function sendToAnalytics(metric: Metric) {
  // Log to console in development for debugging
  if (import.meta.env.DEV) {
    const color =
      metric.rating === 'good' ? '🟢' :
      metric.rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(`${color} [WebVital] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`);
    return;
  }

  // In production, buffer and send to edge function
  metricsBuffer.push({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    url: window.location.pathname,
  });

  scheduleFlush();
}

export async function initWebVitals() {
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);

    // Flush remaining metrics before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          flushMetrics();
        }
      });
    }
  } catch {
    // web-vitals not available
  }
}
