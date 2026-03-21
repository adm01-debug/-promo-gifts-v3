/**
 * Production-safe logger utility.
 * Only prints in development mode (import.meta.env.DEV).
 * In production, all calls are no-ops for zero overhead.
 */

const isDev = import.meta.env.DEV;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const logger = {
  log: (...args: any[]) => { if (isDev) console.log(...args); },
  warn: (...args: any[]) => { if (isDev) console.warn(...args); },
  error: (...args: any[]) => console.error(...args), // always log errors
  info: (...args: any[]) => { if (isDev) console.info(...args); },
  debug: (...args: any[]) => { if (isDev) console.debug(...args); },
};
