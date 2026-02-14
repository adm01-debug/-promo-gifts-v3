import { useEffect } from "react";

/**
 * Complemento JS para o override CSS de scroll lock.
 * Remove atributos residuais e classes que react-remove-scroll injeta.
 */

function hasActiveOverlay(): boolean {
  const openDialogs = document.querySelectorAll('[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]');
  for (const dialog of openDialogs) {
    const rect = (dialog as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
  }
  const selectWrapper = document.querySelector('[data-radix-select-content-wrapper]');
  if (selectWrapper) {
    const rect = (selectWrapper as HTMLElement).getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return true;
  }
  return false;
}

function forceUnlock() {
  if (hasActiveOverlay()) return;
  
  for (const el of [document.documentElement, document.body]) {
    el.removeAttribute('data-scroll-locked');
    el.style.overflow = '';
    el.style.overflowY = '';
    el.style.marginRight = '';
    el.style.paddingRight = '';
    el.style.position = '';
    el.style.touchAction = '';
    if (el.style.pointerEvents === 'none') el.style.pointerEvents = '';
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
    // MutationObserver to catch when react-remove-scroll adds locks
    const observer = new MutationObserver(() => forceUnlock());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked', 'class'] });

    // Periodic cleanup as safety net
    const interval = setInterval(forceUnlock, 300);

    // Initial cleanup
    forceUnlock();

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);
}
