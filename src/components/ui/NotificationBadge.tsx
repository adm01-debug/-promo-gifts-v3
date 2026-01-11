import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "absolute inline-flex items-center justify-center font-semibold rounded-full",
  {
    variants: {
      variant: {
        default: "bg-destructive text-destructive-foreground",
        primary: "bg-primary text-primary-foreground",
        success: "bg-success text-success-foreground",
        warning: "bg-warning text-warning-foreground",
        info: "bg-info text-info-foreground",
        muted: "bg-muted text-muted-foreground",
      },
      size: {
        xs: "min-w-[14px] h-[14px] text-[9px] px-0.5",
        sm: "min-w-[18px] h-[18px] text-[10px] px-1",
        md: "min-w-[22px] h-[22px] text-xs px-1.5",
        lg: "min-w-[26px] h-[26px] text-sm px-2",
      },
      position: {
        "top-right": "-top-1 -right-1",
        "top-left": "-top-1 -left-1",
        "bottom-right": "-bottom-1 -right-1",
        "bottom-left": "-bottom-1 -left-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
      position: "top-right",
    },
  }
);

interface NotificationBadgeProps extends VariantProps<typeof badgeVariants> {
  count?: number;
  max?: number;
  showZero?: boolean;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
  badgeClassName?: string;
}

export function NotificationBadge({
  count = 0,
  max = 99,
  showZero = false,
  dot = false,
  pulse = false,
  variant,
  size,
  position,
  children,
  className,
  badgeClassName,
}: NotificationBadgeProps) {
  const showBadge = dot || count > 0 || (showZero && count === 0);
  const displayCount = count > max ? `${max}+` : count;

  return (
    <div className={cn("relative inline-flex", className)}>
      {children}
      <AnimatePresence>
        {showBadge && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
              badgeVariants({ variant, size: dot ? "xs" : size, position }),
              dot && "w-2.5 h-2.5 min-w-0 p-0",
              badgeClassName
            )}
          >
            {!dot && displayCount}
            {pulse && (
              <motion.span
                className="absolute inset-0 rounded-full bg-current opacity-75"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// Standalone Badge
export function Badge({
  count,
  max = 99,
  variant = "default",
  size = "sm",
  className,
}: {
  count: number;
  max?: number;
  variant?: "default" | "primary" | "success" | "warning" | "info" | "muted";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const displayCount = count > max ? `${max}+` : count;
  
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        badgeVariants({ variant, size }),
        "relative static",
        className
      )}
    >
      {displayCount}
    </motion.span>
  );
}

// Indicator Dot
export function IndicatorDot({
  variant = "default",
  pulse = false,
  className,
}: {
  variant?: "default" | "primary" | "success" | "warning" | "info" | "muted";
  pulse?: boolean;
  className?: string;
}) {
  const colorMap = {
    default: "bg-destructive",
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    info: "bg-info",
    muted: "bg-muted-foreground",
  };

  return (
    <span className={cn("relative inline-flex", className)}>
      <span className={cn("w-2 h-2 rounded-full", colorMap[variant])} />
      {pulse && (
        <motion.span
          className={cn("absolute inset-0 rounded-full", colorMap[variant])}
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </span>
  );
}
