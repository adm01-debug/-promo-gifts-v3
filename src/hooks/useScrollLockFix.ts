import { useEffect } from "react";

/**
 * Nuclear scroll-lock prevention v3.
 * 
 * react-remove-scroll (used by Radix Dialog/DropdownMenu/Select) sets
 * data-scroll-locked, overflow:hidden, position:fixed on html/body.
 * Sometimes these persist after the overlay closes.
 * 
 * Strategy:
 * 1. MutationObserver watches for style/attribute changes
 * 2. On any mutation, if no active overlay → force unlock
 * 3. Also listens to transitionend, animationend, focusin, click
 *    (these fire after Radix finishes its close animation)
 * 4. Periodic safety net every 500ms
 */

function hasActiveOverlay(): boolean {
  // Check for open Radix dialogs/alerts
  const openDialogs = document.querySelectorAll(
    '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]'
  );
  for (const dialog of openDialogs) {
    const rect = (dialog as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
  }

  // Check for open Radix select/combobox content
  const selectContent = document.querySelector('[data-radix-select-content-wrapper]');
  if (selectContent) {
    const rect = (selectContent as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
  }

  // Check for vaul drawer
  const drawer = document.querySelector('[vaul-drawer][data-state="open"]');
  if (drawer) return true;

  // Check for open Sheet (which uses Dialog internally)
  const sheets = document.querySelectorAll('[data-state="open"][data-vaul-drawer]');
  if (sheets.length > 0) return true;

  return false;
}

function forceUnlock() {
  if (hasActiveOverlay()) return;

  const targets = [document.documentElement, document.body];
  for (const el of targets) {
    // Remove the data attribute that react-remove-scroll uses
    if (el.hasAttribute('data-scroll-locked')) {
      el.removeAttribute('data-scroll-locked');
    }

    // Clear inline styles that lock scrolling
    const style = el.style;
    if (style.overflow === 'hidden') style.overflow = '';
    if (style.overflowY === 'hidden') style.overflowY = '';
    if (style.position === 'fixed') style.position = '';
    if (style.marginRight) style.marginRight = '';
    if (style.paddingRight) style.paddingRight = '';
    if (style.touchAction === 'none') style.touchAction = '';
    if (style.pointerEvents === 'none') style.pointerEvents = '';
    
    // Also clear top offset that position:fixed sometimes sets
    if (style.top && style.position !== 'fixed') style.top = '';
    if (style.width === '100%' && el === document.body) style.width = '';
  }

  // Remove react-remove-scroll block-interactivity classes
  document.body.classList.forEach(cls => {
    if (cls.startsWith('block-interactivity-')) {
      document.body.classList.remove(cls);
    }
  });
}

export function useScrollLockFix() {
  useEffect(() => {
    // MutationObserver for attribute changes on html and body
    const observer = new MutationObserver(() => {
      // Small delay to let Radix finish its cleanup
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

    // Event-based cleanup — fires when overlays finish closing
    const debouncedUnlock = () => requestAnimationFrame(forceUnlock);
    
    // focusin fires when focus returns to the main page after dialog closes
    document.addEventListener('focusin', debouncedUnlock, { passive: true });
    // Click anywhere after a dialog closed
    document.addEventListener('click', debouncedUnlock, { passive: true, capture: true });
    // After CSS transitions/animations (Radix uses these for open/close)
    document.addEventListener('transitionend', debouncedUnlock, { passive: true });
    document.addEventListener('animationend', debouncedUnlock, { passive: true });

    // Safety net interval — less frequent since we have event-based cleanup
    const interval = setInterval(forceUnlock, 500);

    // Initial cleanup
    forceUnlock();

    return () => {
      observer.disconnect();
      clearInterval(interval);
      document.removeEventListener('focusin', debouncedUnlock);
      document.removeEventListener('click', debouncedUnlock);
      document.removeEventListener('transitionend', debouncedUnlock);
      document.removeEventListener('animationend', debouncedUnlock);
    };
  }, []);
}
