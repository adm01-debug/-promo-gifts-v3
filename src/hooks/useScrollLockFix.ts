import { useEffect } from "react";

/**
 * Scroll-lock prevention v7.
 * 
 * react-remove-scroll blocks scroll TWO ways:
 *   1. CSS/DOM: data-scroll-locked attribute + overflow:hidden (handled by index.css)
 *   2. JS: wheel/touchmove event listeners calling preventDefault() (handled here)
 * 
 * Strategy:
 *   Layer 1 — CSS in index.css (outside @layer) overrides visual lock
 *   Layer 2 — MutationObserver: strips residual DOM attributes
 *   Layer 3 — Capture-phase interception: stopImmediatePropagation on wheel/touchmove
 *             when no overlay is active, preventing react-remove-scroll's preventDefault()
 *             NOTE: passive:true is fine because we only need stopImmediatePropagation,
 *             not preventDefault. passive only restricts preventDefault.
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

function cleanup() {
  if (hasActiveOverlay()) return;

  for (const el of [document.documentElement, document.body]) {
    el.removeAttribute('data-scroll-locked');

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
      requestAnimationFrame(cleanup);
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
    // passive:true is OK — it only restricts preventDefault(), NOT stopImmediatePropagation().
    const interceptScroll = (e: Event) => {
      if (!hasActiveOverlay()) {
        const isLocked =
          document.documentElement.hasAttribute('data-scroll-locked') ||
          document.body.hasAttribute('data-scroll-locked') ||
          document.body.style.overflow === 'hidden' ||
          document.documentElement.style.overflow === 'hidden';

        if (isLocked) {
          e.stopImmediatePropagation();
          cleanup();
        }
      }
    };

    document.addEventListener('wheel', interceptScroll, { capture: true, passive: true });
    document.addEventListener('touchmove', interceptScroll, { capture: true, passive: true });

    // Safety net
    const interval = setInterval(cleanup, 500);
    cleanup();

    return () => {
      observer.disconnect();
      clearInterval(interval);
      document.removeEventListener('wheel', interceptScroll, { capture: true } as EventListenerOptions);
      document.removeEventListener('touchmove', interceptScroll, { capture: true } as EventListenerOptions);
    };
  }, []);
}
