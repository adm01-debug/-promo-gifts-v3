import { useState, useEffect, forwardRef, type Ref } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";

interface ScrollProgressProps {
  className?: string;
  color?: "primary" | "orange" | "success";
  height?: number;
  position?: "top" | "bottom";
}

/**
 * ScrollProgressIndicator - Barra de progresso de scroll (AN-12)
 */
export const ScrollProgressIndicator = forwardRef<HTMLDivElement, ScrollProgressProps>(function ScrollProgressIndicator({
  className,
  color = "primary",
  height = 3,
  position = "top",
}: ScrollProgressProps, ref: Ref<HTMLDivElement>) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const colorClasses = {
    primary: "bg-primary",
    orange: "bg-orange",
    success: "bg-success",
  };

  return (
    <motion.div
      className={cn(
        "fixed left-0 right-0 z-50 origin-left pointer-events-none",
        position === "top" ? "top-0" : "bottom-0",
        colorClasses[color],
        className
      )}
      style={{ 
        scaleX,
        height: `${height}px`,
      }}
    />
  );
});

/**
 * ScrollToTop - Botão para voltar ao topo
 */
export const ScrollToTopButton = forwardRef<
  HTMLButtonElement,
  { threshold?: number; className?: string }
>(function ScrollToTopButton({ threshold = 300, className }, ref) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const getScrollableContainer = (): Element | Window => {
      // Search for scrollable container: first inside main, then parents, then window
      const main = document.getElementById("main-content");
      if (main) {
        // Check children first (deep search)
        const allElements = main.querySelectorAll("*");
        for (const el of allElements) {
          const style = window.getComputedStyle(el);
          if (
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            el.scrollHeight > el.clientHeight
          ) {
            return el;
          }
        }
        // Check parents
        let parent: Element | null = main.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          if (
            (style.overflowY === "auto" || style.overflowY === "scroll") &&
            parent.scrollHeight > parent.clientHeight
          ) {
            return parent;
          }
          parent = parent.parentElement;
        }
      }
      return window;
    };

    let scrollTarget: Element | Window | null = null;

    const handleScroll = () => {
      const scrollTop =
        scrollTarget instanceof Window
          ? window.scrollY
          : (scrollTarget as Element).scrollTop;
      setIsVisible(scrollTop > threshold);
    };

    // Delay to let layout settle
    const timer = setTimeout(() => {
      scrollTarget = getScrollableContainer();
      scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
    }, 500);

    return () => {
      clearTimeout(timer);
      if (scrollTarget) {
        scrollTarget.removeEventListener("scroll", handleScroll);
      }
    };
  }, [threshold]);

  const handleScrollToTop = () => {
    const main = document.getElementById("main-content");
    if (main) {
      // Check children first
      const allElements = main.querySelectorAll("*");
      for (const el of allElements) {
        const style = window.getComputedStyle(el);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight
        ) {
          el.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }
      // Check parents
      let parent: Element | null = main.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (
          (style.overflowY === "auto" || style.overflowY === "scroll") &&
          parent.scrollHeight > parent.clientHeight
        ) {
          parent.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        parent = parent.parentElement;
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!isVisible) return null;

  return (
    <motion.button
      ref={ref}
      key="scroll-to-top"
      className={cn(
        "fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 p-3 rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "hover:shadow-xl hover:scale-105 active:scale-95",
        "transition-transform duration-200",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleScrollToTop}
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" />
    </motion.button>
  );
});
export default ScrollProgressIndicator;
