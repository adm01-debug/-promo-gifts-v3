import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageTransition - Wrapper para transições de página suaves
 * Usa framer-motion para animar entradas e saídas
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ 
          duration: 0.3, 
          ease: [0.25, 0.46, 0.45, 0.94] 
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * FadeTransition - Transição simples de fade
 */
export function FadeTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideTransition - Transição com slide lateral
 */
export function SlideTransition({ 
  children, 
  className,
  direction = "right" 
}: PageTransitionProps & { direction?: "left" | "right" }) {
  const xOffset = direction === "right" ? 30 : -30;

  return (
    <motion.div
      initial={{ opacity: 0, x: xOffset }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -xOffset }}
      transition={{ 
        duration: 0.35, 
        ease: [0.4, 0, 0.2, 1] 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScaleTransition - Transição com scale sutil
 */
export function ScaleTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ 
        duration: 0.25, 
        ease: "easeOut" 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer - Container para animações staggered
 */
export function StaggerContainer({ 
  children, 
  className,
  staggerDelay = 0.05,
  initialDelay = 0 
}: PageTransitionProps & { 
  staggerDelay?: number;
  initialDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren: initialDelay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem - Item filho para StaggerContainer
 */
export function StaggerItem({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.3, ease: "easeOut" }
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedPresence - Wrapper simplificado para AnimatePresence
 */
export function AnimatedPresence({ 
  children, 
  show,
  className 
}: { 
  children: ReactNode; 
  show: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * usePageLoaded - Hook para animações de first mount
 */
export function usePageLoaded() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Aguarda o próximo frame para evitar flash
    const frame = requestAnimationFrame(() => {
      setIsLoaded(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return isLoaded;
}

export default PageTransition;
