import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode } from "react";

// Animated container for staggered children
interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function AnimatedList({ children, className, staggerDelay = 0.05 }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// Animated grid for card layouts
interface AnimatedGridProps {
  children: ReactNode;
  columns?: { sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  className?: string;
}

export function AnimatedGrid({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4,
  className,
}: AnimatedGridProps) {
  const gridCols = cn(
    "grid",
    columns.sm && `grid-cols-${columns.sm}`,
    columns.md && `sm:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
    `gap-${gap}`
  );

  return (
    <AnimatedList className={cn(gridCols, className)} staggerDelay={0.05}>
      {children}
    </AnimatedList>
  );
}

// Fade in on scroll component
interface FadeInOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function FadeInOnScroll({ children, className, delay = 0 }: FadeInOnScrollProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}

// Scale on hover wrapper
interface ScaleOnHoverProps {
  children: ReactNode;
  scale?: number;
  className?: string;
}

export function ScaleOnHover({ children, scale = 1.02, className }: ScaleOnHoverProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation wrapper
interface PulseProps {
  children: ReactNode;
  className?: string;
  duration?: number;
}

export function Pulse({ children, className, duration = 2 }: PulseProps) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1.05, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

// Shimmer loading effect
interface ShimmerProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Shimmer({ className, width = "100%", height = "1rem" }: ShimmerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted rounded",
        className
      )}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/50 to-transparent"
        animate={{ x: ["0%", "200%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

// Counter animation
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({
  value,
  duration = 1,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={value}
      >
        {prefix}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {value.toFixed(decimals)}
        </motion.span>
        {suffix}
      </motion.span>
    </motion.span>
  );
}

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
}

// Reveal on scroll
interface RevealProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  className?: string;
}

export function Reveal({ children, direction = "up", delay = 0, className }: RevealProps) {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}
