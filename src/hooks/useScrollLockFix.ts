import { useEffect } from "react";

/**
 * Scroll-lock fix v8 — Performance-optimized.
 * 
 * Previous versions caused DOM thrashing via MutationObserver + setInterval
 * feedback loops. This version only cleans up scroll locks when overlays
 * actually close, using a single targeted MutationObserver on dialog state.
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

function cleanupScrollLock() {
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
    // Only observe the document body for dialog open/close transitions.
    // Use a debounced approach to avoid feedback loops.
    let cleanupScheduled = false;

    const scheduleCleanup = () => {
      if (cleanupScheduled) return;
      cleanupScheduled = true;
      requestAnimationFrame(() => {
        cleanupScrollLock();
        cleanupScheduled = false;
      });
    };

    // Watch for dialog state changes (open→closed) in the DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Only react to removed nodes (overlay closing) or attribute changes on dialogs
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          scheduleCleanup();
          break;
        }
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('data-state') === 'closed') {
            scheduleCleanup();
            break;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    // One-time initial cleanup
    cleanupScrollLock();

    return () => {
      observer.disconnect();
    };
  }, []);
}
