import { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SmartLoaderProps {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
  minLoadingTime?: number;
}

/**
 * SmartLoader - Wrapper that shows contextual skeleton while loading
 * Includes smooth fade transition between states
 */
export function SmartLoader({
  isLoading,
  skeleton,
  children,
  className,
}: SmartLoaderProps) {
  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook for delayed loading state (prevents flash for fast loads)
import { useState, useEffect } from "react";

export function useDelayedLoading(isLoading: boolean, delay = 200): boolean {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delay);
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [isLoading, delay]);

  return showLoading;
}
