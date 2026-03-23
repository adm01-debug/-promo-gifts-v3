/**
 * Web Vitals tracking — monitors LCP, CLS, INP, FCP, TTFB in production.
 */
import type { Metric } from 'web-vitals';

const VITALS_ENDPOINT = '/api/vitals'; // placeholder

function sendToAnalytics(metric: Metric) {
  // Log to console in development for debugging
  if (import.meta.env.DEV) {
    const color =
      metric.rating === 'good' ? '🟢' :
      metric.rating === 'needs-improvement' ? '🟡' : '🔴';
    console.log(`${color} [WebVital] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`);
    return;
  }

  // In production, use sendBeacon for reliable delivery
  try {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(VITALS_ENDPOINT, body);
    }
  } catch {
    // Silently fail — vitals are non-critical
  }
}

export async function initWebVitals() {
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  } catch {
    // web-vitals not available
  }
}
