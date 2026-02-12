import { useEffect } from "react";

/**
 * Observa mudanças no body/html para impedir que modais (Radix, etc.)
 * travem o scroll da página ao adicionar overflow:hidden inline.
 */
export function useScrollLockFix() {
  useEffect(() => {
    const targets = [document.body, document.documentElement];

    const fix = (el: HTMLElement) => {
      const style = el.style;
      if (style.overflow === "hidden" || style.overflowY === "hidden") {
        style.overflow = "";
        style.overflowY = "";
      }
      if (style.pointerEvents === "none") {
        style.pointerEvents = "";
      }
      // Radix scroll-lock adds margin-right to compensate scrollbar
      if (el.hasAttribute("data-scroll-locked")) {
        style.marginRight = "";
        style.overflow = "";
        el.removeAttribute("data-scroll-locked");
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.target instanceof HTMLElement
        ) {
          fix(mutation.target);
        }
      }
    });

    targets.forEach((el) => {
      fix(el);
      observer.observe(el, {
        attributes: true,
        attributeFilter: ["style", "data-scroll-locked"],
      });
    });

    return () => observer.disconnect();
  }, []);
}
