import { motion, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

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
        "fixed left-0 right-0 z-50 origin-left",
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
  
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <motion.button
      className={cn(
        "fixed bottom-6 right-6 z-40 p-3 rounded-full",
        "bg-primary text-primary-foreground shadow-lg",
        "hover:shadow-xl hover:scale-105 active:scale-95",
        "transition-transform duration-200",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: scrollY.get() > threshold ? 1 : 0,
        scale: scrollY.get() > threshold ? 1 : 0.8,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleScrollToTop}
      aria-label="Voltar ao topo"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    </motion.button>
  );
}

export default ScrollProgressIndicator;
