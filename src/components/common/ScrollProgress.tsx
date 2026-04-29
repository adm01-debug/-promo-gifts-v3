import { useState, useEffect, forwardRef } from "react";
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
export function ScrollProgressIndicator({
  className,
  color = "primary",
  height = 3,
  position = "top",
}: ScrollProgressProps) {
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
      role="progressbar"
      aria-label="Progresso de rolagem da página"
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}

/**
 * ScrollToTop - Botão para voltar ao topo
 */
export const ScrollToTopButton = forwardRef<
  HTMLButtonElement,
  { threshold?: number; className?: string }
>(function ScrollToTopButton({ threshold = 300, className }, ref) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Após a correção do `position: sticky` do Header, o scroll vertical
    // é sempre da `window`. Listener simples e confiável.
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    handleScroll(); // estado inicial (caso já esteja rolado)
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  const handleScrollToTop = () => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  };

  if (!isVisible) return null;

  return (
    <motion.button
      ref={ref}
      key="scroll-to-top"
      data-testid="scroll-to-top"
      type="button"
      className={cn(
        // z-30: abaixo do Header sticky (z-40), acima do conteúdo.
        "fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-30 p-3 rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "hover:shadow-xl hover:scale-105 active:scale-95",
        "transition-transform duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleScrollToTop}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" aria-hidden />
    </motion.button>
  );
});
export default ScrollProgressIndicator;
