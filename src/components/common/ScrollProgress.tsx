import { useState, useEffect } from "react";
import { motion, useScroll, useSpring, useMotionValueEvent } from "framer-motion";
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
 * Mostra visualmente quanto o usuário scrollou na página
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
    />
  );
}

/**
 * ScrollToTop - Botão para voltar ao topo
 */
export function ScrollToTopButton({
  threshold = 300,
  className,
}: {
  threshold?: number;
  className?: string;
}) {
  const { scrollY } = useScroll();
  const [isVisible, setIsVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsVisible(latest > threshold);
  });
  
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.button
      className={cn(
        "fixed bottom-24 lg:bottom-[6.5rem] right-4 lg:right-6 z-30 p-3 rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "hover:shadow-xl hover:scale-105 active:scale-95",
        "transition-transform duration-200",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.8,
        pointerEvents: isVisible ? "auto" : "none",
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleScrollToTop}
      aria-label="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" />
    </motion.button>
  );
}

export default ScrollProgressIndicator;
