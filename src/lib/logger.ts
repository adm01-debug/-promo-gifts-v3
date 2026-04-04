/**
 * Production-safe logger utility.
 * Only prints in development mode (import.meta.env.DEV).
 * In production, all calls are no-ops for zero overhead.
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => console.error(...args), // always log errors
  info: (...args: unknown[]) => { if (isDev) console.info(...args); },
  debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
};
