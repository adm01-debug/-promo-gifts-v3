import { useCallback, createContext, useContext, ReactNode } from "react";
import { cn } from "@/lib/utils";

type HapticType = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

interface HapticContextValue {
  trigger: (type?: HapticType) => void;
  isSupported: boolean;
}

const HapticContext = createContext<HapticContextValue>({
  trigger: () => {},
  isSupported: false,
});

export function useHaptic() {
  return useContext(HapticContext);
}

interface HapticProviderProps {
  children: ReactNode;
  disabled?: boolean;
}

export function HapticProvider({ children, disabled = false }: HapticProviderProps) {
  const isSupported = typeof navigator !== "undefined" && "vibrate" in navigator;

  const trigger = useCallback(
    (type: HapticType = "light") => {
      if (disabled || !isSupported) return;

      const patterns: Record<HapticType, number | number[]> = {
        light: 10,
        medium: 20,
        heavy: 30,
        selection: 5,
        success: [10, 50, 20],
        warning: [20, 30, 20],
        error: [30, 50, 30, 50, 30],
      };

      navigator.vibrate(patterns[type]);
    },
    [disabled, isSupported]
  );

  return (
    <HapticContext.Provider value={{ trigger, isSupported }}>
      {children}
    </HapticContext.Provider>
  );
}

// Haptic-enabled button wrapper
interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticType?: HapticType;
  children: ReactNode;
}

export function HapticButton({
  hapticType = "light",
  onClick,
  children,
  ...props
}: HapticButtonProps) {
  const { trigger } = useHaptic();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    trigger(hapticType);
    onClick?.(e);
  };

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

// Touch feedback wrapper
interface TouchFeedbackProps {
  children: ReactNode;
  hapticType?: HapticType;
  className?: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function TouchFeedback({
  children,
  hapticType = "selection",
  className,
  onPress,
  disabled = false,
}: TouchFeedbackProps) {
  const { trigger } = useHaptic();

  const handlePress = () => {
    if (disabled) return;
    trigger(hapticType);
    onPress?.();
  };

  return (
    <div
      onClick={handlePress}
      className={cn(
        "touch-manipulation transition-transform active:scale-[0.98]",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      role={onPress ? "button" : undefined}
      tabIndex={onPress ? 0 : undefined}
    >
      {children}
    </div>
  );
}

// Long press detector
interface LongPressProps {
  children: ReactNode;
  onLongPress: () => void;
  onPress?: () => void;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export function LongPress({
  children,
  onLongPress,
  onPress,
  delay = 500,
  className,
  disabled = false,
}: LongPressProps) {
  const { trigger } = useHaptic();
  let timeoutId: NodeJS.Timeout | null = null;
  let isLongPress = false;

  const handleTouchStart = () => {
    if (disabled) return;
    
    isLongPress = false;
    timeoutId = setTimeout(() => {
      isLongPress = true;
      trigger("heavy");
      onLongPress();
    }, delay);
  };

  const handleTouchEnd = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    if (!isLongPress && onPress && !disabled) {
      trigger("selection");
      onPress();
    }
  };

  const handleTouchMove = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchMove}
      className={cn(
        "touch-manipulation select-none",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {children}
    </div>
  );
}

// Scale on press animation
interface ScaleOnPressProps {
  children: ReactNode;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function ScaleOnPress({
  children,
  scale = 0.95,
  className,
  onClick,
}: ScaleOnPressProps) {
  const { trigger } = useHaptic();

  return (
    <div
      onClick={() => {
        trigger("selection");
        onClick?.();
      }}
      className={cn(
        "touch-manipulation transition-transform duration-100",
        "active:scale-[var(--scale)]",
        className
      )}
      style={{ "--scale": scale } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
