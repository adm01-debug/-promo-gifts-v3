import { useEffect } from "react";

/**
 * Scroll-lock cleanup — simplified v6.
 * 
 * The CSS override in index.css (outside @layer) handles the visual unlock
 * with !important rules on data-scroll-locked elements.
 * 
 * This hook only does DOM cleanup via MutationObserver:
 * removes residual data-scroll-locked attributes and inline styles
 * after Radix overlays close.
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

    // Safety net
    const interval = setInterval(cleanup, 500);
    cleanup();

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}
