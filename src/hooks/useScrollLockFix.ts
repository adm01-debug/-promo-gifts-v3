import { useEffect } from "react";

/**
 * Nuclear scroll-lock prevention v5.
 * 
 * react-remove-scroll blocks scroll via:
 *   1. CSS: data-scroll-locked, overflow:hidden on html/body
 *   2. JS: wheel/touchmove listeners that call preventDefault()
 * 
 * Strategy:
 *   Layer 1 — CSS in index.css (outside @layer) with !important
 *   Layer 2 — MutationObserver: strips residual attributes/styles
 *   Layer 3 — Capture-phase wheel/touchmove: when no overlay is open,
 *             re-dispatch a clone of the event and stop the original,
 *             bypassing react-remove-scroll entirely.
 *   Layer 4 — Periodic cleanup safety net
 */

function hasActiveOverlay(): boolean {
  const selectors = [
    '[data-state="open"][role="dialog"]',
    '[data-state="open"][role="alertdialog"]',
    '[data-radix-select-content-wrapper]',
    '[vaul-drawer][data-state="open"]',
    '[data-state="open"][data-vaul-drawer]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return true;
    }
  }

  return false;
}

function forceUnlock() {
  if (hasActiveOverlay()) return;

  for (const el of [document.documentElement, document.body]) {
    if (el.hasAttribute('data-scroll-locked')) {
      el.removeAttribute('data-scroll-locked');
    }

    const s = el.style;
    if (s.overflow === 'hidden') s.overflow = '';
    if (s.overflowY === 'hidden') s.overflowY = '';
    if (s.position === 'fixed') s.position = '';
    if (s.marginRight) s.marginRight = '';
    if (s.paddingRight) s.paddingRight = '';
    if (s.touchAction === 'none') s.touchAction = '';
    if (s.pointerEvents === 'none') s.pointerEvents = '';
    if (s.top && s.position !== 'fixed') s.top = '';
    if (s.width === '100%' && el === document.body) s.width = '';
  }

  document.body.classList.forEach(cls => {
    if (cls.startsWith('block-interactivity-')) {
      document.body.classList.remove(cls);
    }
  });

  if (getComputedStyle(document.body).pointerEvents === 'none') {
    document.body.style.pointerEvents = 'auto';
  }
}

export function useScrollLockFix() {
  useEffect(() => {
    // ── Layer 2: MutationObserver ──
    const observer = new MutationObserver(() => {
      requestAnimationFrame(forceUnlock);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'data-scroll-locked', 'class'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'data-scroll-locked', 'class'],
    });

    // ── Layer 3: Capture-phase scroll event interception ──
    // CRITICAL: passive MUST be false so we can call preventDefault/stopPropagation
    // when needed to override react-remove-scroll's listeners.
    const interceptWheel = (e: WheelEvent) => {
      if (!hasActiveOverlay()) {
        const isLocked = 
          document.documentElement.hasAttribute('data-scroll-locked') ||
          document.body.hasAttribute('data-scroll-locked') ||
          document.body.style.overflow === 'hidden' ||
          document.documentElement.style.overflow === 'hidden';

        if (isLocked) {
          e.stopImmediatePropagation();
          forceUnlock();
        }
      }
    };

    const interceptTouch = (e: TouchEvent) => {
      if (!hasActiveOverlay()) {
        const isLocked = 
          document.documentElement.hasAttribute('data-scroll-locked') ||
          document.body.hasAttribute('data-scroll-locked') ||
          document.body.style.overflow === 'hidden' ||
          document.documentElement.style.overflow === 'hidden';

        if (isLocked) {
          e.stopImmediatePropagation();
          forceUnlock();
        }
      }
    };

    // passive: false is REQUIRED for stopImmediatePropagation to work
    document.addEventListener('wheel', interceptWheel, { capture: true, passive: false });
    document.addEventListener('touchmove', interceptTouch, { capture: true, passive: false });

    // ── Event-based cleanup ──
    const debouncedUnlock = () => requestAnimationFrame(forceUnlock);
    document.addEventListener('focusin', debouncedUnlock, { passive: true });
    document.addEventListener('click', debouncedUnlock, { passive: true, capture: true });
    document.addEventListener('transitionend', debouncedUnlock, { passive: true });
    document.addEventListener('animationend', debouncedUnlock, { passive: true });

    // Safety net
    const interval = setInterval(forceUnlock, 500);

    // Initial cleanup
    forceUnlock();

    return () => {
      observer.disconnect();
      clearInterval(interval);
      document.removeEventListener('wheel', interceptWheel, { capture: true } as any);
      document.removeEventListener('touchmove', interceptTouch, { capture: true } as any);
      document.removeEventListener('focusin', debouncedUnlock);
      document.removeEventListener('click', debouncedUnlock);
      document.removeEventListener('transitionend', debouncedUnlock);
      document.removeEventListener('animationend', debouncedUnlock);
    };
  }, []);
}
