import { createClientLogger } from '@/lib/telemetry/structuredLogger';

/**
 * Legacy compatibility layer for logger.
 * Migrates existing calls to the new structured logging system.
 */
const structured = createClientLogger('legacy-compat');

export const logger = {
  debug: (message: string, ...args: unknown[]) => structured.debug(message, { details: args }),
  log: (message: string, ...args: unknown[]) => structured.info(message, { details: args }),
  info: (message: string, ...args: unknown[]) => structured.info(message, { details: args }),
  warn: (message: string, ...args: unknown[]) => structured.warn(message, { details: args }),
  error: (message: string, ...args: unknown[]) => structured.error(message, { details: args }),
};
