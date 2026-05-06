import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

/**
 * createStructuredLogger
 * 
 * Centralized logging utility for Edge Functions that ensures a consistent format
 * across all services. Automatically handles X-Request-Id propagation and 
 * error formatting.
 */
export function createStructuredLogger(serviceName: string, reqOrRequestId?: Request | string) {
  const requestId = typeof reqOrRequestId === 'string' 
    ? reqOrRequestId 
    : reqOrRequestId?.headers.get('x-request-id') || crypto.randomUUID();

  const baseMetadata = {
    service: serviceName,
    requestId,
    timestamp: new Date().toISOString(),
  };

  const log = (level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) => {
    const payload = {
      ...baseMetadata,
      level,
      message,
      ...(data && { data }),
    };
    
    // CloudWatch/Supabase Logs friendly format
    console.log(JSON.stringify(payload));
    
    // If it's an error, also log to console.error for standard log drainers
    if (level === 'ERROR') {
      console.error(`[${serviceName}] ${message}`, data || '');
    }
  };

  return {
    info: (msg: string, data?: any) => log('INFO', msg, data),
    warn: (msg: string, data?: any) => log('WARN', msg, data),
    error: (msg: string, data?: any) => log('ERROR', msg, data),
    debug: (msg: string, data?: any) => log('DEBUG', msg, data),
    requestId,
    
    /**
     * Helper to wrap a response with the current requestId header
     */
    respond: (body: any, status = 200, headers: Record<string, string> = {}) => {
      return new Response(
        typeof body === 'string' ? body : JSON.stringify(body),
        {
          status,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
            ...headers,
          }
        }
      );
    }
  };
}

/**
 * alertOnFailure
 * 
 * Logic to decide if an error should trigger a production alert (e.g. Sentry, Slack).
 * For now, it logs a CRITICAL flag which can be picked up by log monitors.
 */
export async function alertOnFailure(logger: ReturnType<typeof createStructuredLogger>, error: any, context?: any) {
  const isCritical = error.status >= 500 || error.code === 'DB_ERROR' || error.errorCode === 'AI_GATEWAY_FAILURE';
  
  logger.error(isCritical ? 'CRITICAL_FAILURE_DETECTED' : 'SERVICE_ERROR', {
    errorMessage: error.message,
    stack: error.stack,
    isCritical,
    ...context
  });

  // Future integration: call Sentry or internal webhook here
  // await sendToInternalAlerts({ service: logger.serviceName, error });
}
