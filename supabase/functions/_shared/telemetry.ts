import { trace, type Span, SpanStatusCode, context, propagation } from "https://esm.sh/@opentelemetry/api@1.9.0";
import { WebTracerProvider } from "https://esm.sh/@opentelemetry/sdk-trace-web@1.25.1";
import { OTLPTraceExporter } from "https://esm.sh/@opentelemetry/exporter-trace-otlp-http@0.52.1";
import { BatchSpanProcessor, Resource } from "https://esm.sh/@opentelemetry/sdk-trace-base@1.25.1";
import { SemanticResourceAttributes } from "https://esm.sh/@opentelemetry/semantic-conventions@1.25.1";

let provider: WebTracerProvider | null = null;

export function initEdgeOTel(serviceName: string) {
  if (provider) return;

  const collectorUrl = Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT") || 'https://otel-collector.gifts-store.app/v1/traces';
  
  provider = new WebTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });

  const exporter = new OTLPTraceExporter({
    url: collectorUrl,
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();
}

export function getTracer(name = "supabase-edge-function") {
  return trace.getTracer(name);
}

/**
 * Wraps a request handler with OTel tracing, extracting context from headers.
 */
export async function withEdgeTracing<T>(
  req: Request,
  name: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = getTracer();
  
  // Extract context from incoming headers
  const parentContext = propagation.extract(context.active(), req.headers);

  return await context.with(parentContext, async () => {
    return await tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      } finally {
        span.end();
      }
    });
  });
}
