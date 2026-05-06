import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

export function initOTel() {
  // Disable in development if needed, but enabled for world-class observability
  const collectorUrl = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT || 'https://otel-collector.gifts-store.app/v1/traces';
  
  const provider = new WebTracerProvider();
  
  const exporter = new OTLPTraceExporter({
    url: collectorUrl,
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
    maxQueueSize: 200,
    scheduledDelayMillis: 5000,
  }));

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /https:\/\/.*\.supabase\.co\/.*/,
          /https:\/\/.*\.lovable\.app\/.*/,
        ],
        clearTimingResources: true,
      }),
    ],
  });

  if (import.meta.env.DEV) {
    console.debug('OTel (OpenTelemetry) initialized with target:', collectorUrl);
  }
}
