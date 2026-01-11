import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface InteractiveCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  variant?: "default" | "hover" | "pressable" | "glow";
  glowColor?: string;
}

/**
 * Interactive Card with micro-interactions
 * Provides visual feedback on hover, press, and focus
 */
const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, variant = "default", glowColor, children, ...props }, ref) => {
    const variants = {
      default: {
        hover: { y: -2, boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)" },
        tap: { scale: 0.98, y: 0 },
      },
      hover: {
        hover: { y: -4, boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)" },
        tap: { scale: 0.99, y: -2 },
      },
      pressable: {
        hover: { scale: 1.02 },
        tap: { scale: 0.97 },
      },
      glow: {
        hover: { 
          y: -2, 
          boxShadow: `0 8px 30px ${glowColor || "hsl(var(--primary) / 0.3)"}` 
        },
        tap: { scale: 0.98, y: 0 },
      },
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        initial={false}
        whileHover={variants[variant].hover}
        whileTap={variants[variant].tap}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
InteractiveCard.displayName = "InteractiveCard";

/**
 * Pulse animation for drawing attention
 */
interface PulseWrapperProps {
  children: React.ReactNode;
  active?: boolean;
  color?: string;
  className?: string;
}

export function PulseWrapper({ 
  children, 
  active = false, 
  color = "hsl(var(--primary))",
  className 
}: PulseWrapperProps) {
  if (!active) return <>{children}</>;
  
  return (
    <div className={cn("relative", className)}>
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{ backgroundColor: color }}
        animate={{
          opacity: [0.2, 0.4, 0.2],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * Ripple effect for button-like interactions
 */
interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ className, children, rippleColor = "hsl(var(--primary-foreground) / 0.3)", onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples(prev => [...prev, { x, y, id }]);
      
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
      
      onClick?.(e);
    };
    
    return (
      <button
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          className
        )}
        onClick={handleClick}
        {...props}
      >
        {children}
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              backgroundColor: rippleColor,
              transformOrigin: "center",
            }}
            initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }}
            animate={{ 
              width: 300, 
              height: 300, 
              x: -150, 
              y: -150, 
              opacity: 0 
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </button>
    );
  }
);
RippleButton.displayName = "RippleButton";

/**
 * Success checkmark animation
 */
interface SuccessCheckProps {
  show: boolean;
  size?: number;
  className?: string;
}

export function SuccessCheck({ show, size = 24, className }: SuccessCheckProps) {
  if (!show) return null;
  
  return (
    <motion.svg
      className={cn("text-success", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 15,
      }}
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.path
        d="M8 12l2.5 2.5L16 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      />
    </motion.svg>
  );
}

/**
 * Loading spinner with smooth animation
 */
interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className }: SpinnerProps) {
  return (
    <motion.div
      className={cn("text-primary", className)}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.25"
        />
        <motion.path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0.2 }}
          animate={{ pathLength: [0.2, 0.8, 0.2] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * Number counter animation
 */
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export function AnimatedNumber({ 
  value, 
  duration = 0.5, 
  className,
  formatter = (v) => v.toLocaleString()
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    
    const updateValue = () => {
      const now = Date.now();
      if (now >= endTime) {
        setDisplayValue(endValue);
        return;
      }
      
      const progress = (now - startTime) / (endTime - startTime);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const current = startValue + (endValue - startValue) * eased;
      
      setDisplayValue(Math.round(current));
      requestAnimationFrame(updateValue);
    };
    
    requestAnimationFrame(updateValue);
  }, [value, duration]);
  
  return <span className={className}>{formatter(displayValue)}</span>;
}

/**
 * Shake animation for error states
 */
interface ShakeWrapperProps {
  children: React.ReactNode;
  shake: boolean;
  className?: string;
}

export function ShakeWrapper({ children, shake, className }: ShakeWrapperProps) {
  return (
    <motion.div
      className={className}
      animate={shake ? {
        x: [0, -10, 10, -10, 10, -5, 5, -2, 2, 0],
      } : {}}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Fade slide animation wrapper
 */
interface FadeSlideProps {
  children: React.ReactNode;
  show: boolean;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export function FadeSlide({ 
  children, 
  show, 
  direction = "up",
  className 
}: FadeSlideProps) {
  const directions = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };
  
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ 
        opacity: show ? 1 : 0, 
        x: 0, 
        y: 0 
      }}
      transition={{
        duration: 0.3,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

export { InteractiveCard };
