/**
 * Browser API type extensions.
 * Eliminates (window as any) patterns for vendor-prefixed APIs.
 */

interface Window {
  webkitAudioContext?: typeof AudioContext;
  /** Safari standalone mode detection */
  navigator: Navigator & {
    standalone?: boolean;
  };
}

interface Navigator {
  /** Device memory in GB (Chrome/Edge only) */
  deviceMemory?: number;
  /** Safari standalone mode */
  standalone?: boolean;
}
