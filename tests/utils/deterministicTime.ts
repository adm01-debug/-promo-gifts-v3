/**
 * deterministicTime — shared test helper for time-sensitive assertions.
 *
 * Mocks `Date.now()`, `performance.now()`, AND installs Vitest fake timers in
 * lockstep so every elapsed-ms / debounce assertion in the notifications
 * suite is reproducible to the millisecond.
 *
 * Usage:
 *   const clock = installDeterministicClock(0);
 *   beforeEach(() => clock.reset(0));
 *   afterEach(() => clock.uninstall());
 *
 *   clock.advance(50);          // bump Date.now() AND performance.now() by 50ms
 *   await clock.tickAsync(200); // advance fake timers by 200ms + flush microtasks
 */
import { vi } from "vitest";

export interface DeterministicClock {
  /** Current mocked time (ms since epoch). */
  now(): number;
  /** Advance Date.now / performance.now WITHOUT firing timers. */
  advance(ms: number): void;
  /** Advance fake timers (and Date / performance) and flush microtasks. */
  tickAsync(ms: number): Promise<void>;
  /** Reset the clock to a specific timestamp (ms since epoch). */
  reset(at?: number): void;
  /** Restore real timers + real Date.now / performance.now. */
  uninstall(): void;
}

export function installDeterministicClock(startAt: number = 0): DeterministicClock {
  let current = startAt;

  // Use Vitest's built-in fake timers — they handle setTimeout/setInterval and
  // also mock Date when `toFake` includes "Date". We override performance.now
  // separately because Vitest doesn't mock it by default.
  vi.useFakeTimers({ now: current, toFake: ["setTimeout", "setInterval", "clearTimeout", "clearInterval", "Date"] });

  const realPerfNow = globalThis.performance?.now?.bind(globalThis.performance);
  const perfSpy = vi.spyOn(globalThis.performance, "now").mockImplementation(() => current);

  function syncDate() {
    vi.setSystemTime(current);
  }

  return {
    now: () => current,

    advance(ms: number) {
      current += ms;
      syncDate();
    },

    async tickAsync(ms: number) {
      current += ms;
      // setSystemTime first so any setTimeout callback that reads Date.now()
      // sees the post-advance value.
      syncDate();
      await vi.advanceTimersByTimeAsync(ms);
      // Flush any pending microtasks from resolved promises inside callbacks.
      await Promise.resolve();
      await Promise.resolve();
    },

    reset(at: number = startAt) {
      current = at;
      syncDate();
    },

    uninstall() {
      perfSpy.mockRestore();
      // Best-effort restore in case spyOn lost the original.
      if (realPerfNow && globalThis.performance) {
        globalThis.performance.now = realPerfNow;
      }
      vi.useRealTimers();
    },
  };
}
