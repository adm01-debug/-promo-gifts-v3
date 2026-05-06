import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP, type Metric } from 'web-vitals';
import { supabase } from '@/integrations/supabase/client';
import { newRequestId } from '@/lib/telemetry/requestId';

const requestId = newRequestId();

function sendToCollector(metric: Metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    requestId,
    url: window.location.href,
  };

  // Use sendBeacon if available for non-blocking report on exit
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    navigator.sendBeacon(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vitals-collector`, blob);
  } else {
    supabase.functions.invoke('vitals-collector', { body }).catch(() => {});
  }
}

export function initWebVitals() {
  onCLS(sendToCollector);
  onFID(sendToCollector);
  onLCP(sendToCollector);
  onFCP(sendToCollector);
  onTTFB(sendToCollector);
  onINP(sendToCollector);
}
