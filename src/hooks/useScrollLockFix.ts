import { useEffect } from "react";

/**
 * Nuclear scroll-lock prevention v4.
 * 
 * react-remove-scroll (Radix Dialog/DropdownMenu/Select) blocks scroll via:
 *   1. CSS: data-scroll-locked, overflow:hidden, position:fixed on html/body
 *   2. JS: wheel/touchmove event listeners that call preventDefault()
 * 
 * Strategy (3 layers):
 *   Layer 1 — CSS: index.css overrides with !important (already in place)
 *   Layer 2 — MutationObserver: removes residual attributes/styles after close
 *   Layer 3 — Capture-phase interception: when no overlay is open,
 *             stopImmediatePropagation on wheel/touchmove so react-remove-scroll's
 *             preventDefault() never fires, allowing native scroll.
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

  // Remove block-interactivity classes
  document.body.classList.forEach(cls => {
    if (cls.startsWith('block-interactivity-')) {
      document.body.classList.remove(cls);
    }
  });

  // Force pointer-events if computed is none
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
    // react-remove-scroll adds wheel/touchmove listeners that call preventDefault().
    // We intercept BEFORE them (capture phase) and stopImmediatePropagation
    // when no overlay is active, so native scroll proceeds unblocked.
    const interceptScroll = (e: Event) => {
      if (!hasActiveOverlay()) {
        // Check if scroll is currently locked (residual state)
        const isLocked = 
          document.documentElement.hasAttribute('data-scroll-locked') ||
          document.body.hasAttribute('data-scroll-locked') ||
          document.body.style.overflow === 'hidden' ||
          document.documentElement.style.overflow === 'hidden';

        if (isLocked) {
          // Stop react-remove-scroll from calling preventDefault
          e.stopImmediatePropagation();
          // Also clean up the lock
          forceUnlock();
        }
      }
    };

    document.addEventListener('wheel', interceptScroll, { capture: true, passive: true });
    document.addEventListener('touchmove', interceptScroll, { capture: true, passive: true });

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
      document.removeEventListener('wheel', interceptScroll, { capture: true } as any);
      document.removeEventListener('touchmove', interceptScroll, { capture: true } as any);
      document.removeEventListener('focusin', debouncedUnlock);
      document.removeEventListener('click', debouncedUnlock);
      document.removeEventListener('transitionend', debouncedUnlock);
      document.removeEventListener('animationend', debouncedUnlock);
    };
  }, []);
}
