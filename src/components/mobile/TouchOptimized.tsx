import { ReactNode, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Touch-optimized list item
interface TouchListItemProps {
  children: ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
  leadingContent?: ReactNode;
  trailingContent?: ReactNode;
  subtitle?: string;
}

export const TouchListItem = forwardRef<HTMLDivElement, TouchListItemProps>(
  (
    {
      children,
      onClick,
      onLongPress,
      selected,
      disabled,
      className,
      leadingContent,
      trailingContent,
      subtitle,
    },
    ref
  ) => {
    let longPressTimer: NodeJS.Timeout | null = null;
    let isLongPress = false;

    const handleTouchStart = () => {
      if (disabled || !onLongPress) return;
      isLongPress = false;
      longPressTimer = setTimeout(() => {
        isLongPress = true;
        if ("vibrate" in navigator) navigator.vibrate(20);
        onLongPress();
      }, 500);
    };

    const handleTouchEnd = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
      if (!isLongPress && onClick && !disabled) {
        onClick();
      }
    };

    const handleTouchMove = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };

    return (
      <motion.div
        ref={ref}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        className={cn(
          "flex items-center gap-3 p-4 min-h-[56px]",
          "touch-manipulation select-none",
          "border-b border-border last:border-b-0",
          "transition-colors",
          selected && "bg-primary/10",
          !disabled && "active:bg-muted cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        {leadingContent && (
          <div className="flex-shrink-0">{leadingContent}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">
            {children}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
        {trailingContent && (
          <div className="flex-shrink-0">{trailingContent}</div>
        )}
      </motion.div>
    );
  }
);

TouchListItem.displayName = "TouchListItem";

// Large touch target button
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      icon,
      iconPosition = "left",
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
      ghost: "bg-transparent hover:bg-muted active:bg-muted/80 text-foreground",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
    };

    const sizes = {
      sm: "min-h-[40px] px-4 text-sm",
      md: "min-h-[48px] px-6 text-base",
      lg: "min-h-[56px] px-8 text-lg",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: disabled ? 1 : 0.97 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium",
          "touch-manipulation transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          (disabled || loading) && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            {icon && iconPosition === "left" && icon}
            {children}
            {icon && iconPosition === "right" && icon}
          </>
        )}
      </motion.button>
    );
  }
);

TouchButton.displayName = "TouchButton";

// Touch-friendly checkbox
interface TouchCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function TouchCheckbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: TouchCheckboxProps) {
  const handleToggle = () => {
    if (disabled) return;
    if ("vibrate" in navigator) navigator.vibrate(10);
    onChange(!checked);
  };

  return (
    <motion.div
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={handleToggle}
      className={cn(
        "flex items-start gap-3 p-4 min-h-[56px]",
        "touch-manipulation select-none cursor-pointer",
        "rounded-xl border border-border",
        "transition-colors",
        checked && "bg-primary/5 border-primary/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="checkbox"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
    >
      <div
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-md border-2 transition-colors flex-shrink-0 mt-0.5",
          checked
            ? "bg-primary border-primary"
            : "bg-background border-muted-foreground/30"
        )}
      >
        {checked && (
          <motion.svg
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="h-4 w-4 text-primary-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <polyline points="20 6 9 17 4 12" />
          </motion.svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {label && (
          <span className="text-sm font-medium text-foreground">{label}</span>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </motion.div>
  );
}

// Floating action button
interface FABProps {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  extended?: boolean;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  className?: string;
}

export function FAB({
  icon,
  onClick,
  label,
  extended = false,
  position = "bottom-right",
  className,
}: FABProps) {
  const positions = {
    "bottom-right": "right-4",
    "bottom-center": "left-1/2 -translate-x-1/2",
    "bottom-left": "left-4",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        if ("vibrate" in navigator) navigator.vibrate(10);
        onClick();
      }}
      className={cn(
        "fixed bottom-20 z-40",
        "flex items-center justify-center gap-2",
        "bg-primary text-primary-foreground",
        "rounded-full shadow-lg",
        "touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        extended ? "px-6 h-14" : "w-14 h-14",
        positions[position],
        "lg:bottom-6",
        className
      )}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0)' }}
      aria-label={label}
    >
      {icon}
      {extended && label && (
        <span className="font-medium whitespace-nowrap">{label}</span>
      )}
    </motion.button>
  );
}

// Swipe indicator for carousels
interface SwipeIndicatorProps {
  total: number;
  current: number;
  className?: string;
}

export function SwipeIndicator({ total, current, className }: SwipeIndicatorProps) {
  return (
    <div className={cn("flex justify-center gap-1.5", className)}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === current ? 24 : 8,
            backgroundColor: i === current ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
          }}
          className="h-2 rounded-full transition-colors"
        />
      ))}
    </div>
  );
}
