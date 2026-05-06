import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

export function initOTel() {
  const provider = new WebTracerProvider();
  
  const exporter = new OTLPTraceExporter({
    url: 'https://otel-collector.example.com/v1/traces', // Placeholder URL
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [
          /https:\/\/.*\.supabase\.co\/.*/,
        ],
      }),
    ],
  });

  console.log('OTel initialized');
}
