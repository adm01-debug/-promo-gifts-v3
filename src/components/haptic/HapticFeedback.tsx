import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface UseHapticFeedbackOptions {
  enabled?: boolean;
}

export type HapticPattern = 
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection";

// ============================================================================
// HOOK: useHapticFeedback
// ============================================================================

export function useHapticFeedback({ enabled = true }: UseHapticFeedbackOptions = {}) {
  const isSupported = React.useMemo(() => {
    return typeof navigator !== "undefined" && "vibrate" in navigator;
  }, []);

  const vibrate = React.useCallback((pattern: HapticPattern | number[]) => {
    if (!enabled || !isSupported) return false;

    const patterns: Record<HapticPattern, number[]> = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 20],
      warning: [30, 50, 30],
      error: [50, 100, 50, 100, 50],
      selection: [5],
    };

    const vibrationPattern = Array.isArray(pattern) ? pattern : patterns[pattern];
    
    try {
      navigator.vibrate(vibrationPattern);
      return true;
    } catch {
      return false;
    }
  }, [enabled, isSupported]);

  const stop = React.useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  return {
    isSupported,
    vibrate,
    stop,
  };
}

// ============================================================================
// HAPTIC BUTTON WRAPPER
// ============================================================================

export interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  hapticPattern?: HapticPattern;
  children: React.ReactNode;
}

export const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({ hapticPattern = "light", onClick, children, ...props }, ref) => {
    const { vibrate } = useHapticFeedback();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      vibrate(hapticPattern);
      onClick?.(e);
    };

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
HapticButton.displayName = "HapticButton";

// ============================================================================
// HAPTIC CONTEXT
// ============================================================================

interface HapticContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  vibrate: (pattern: HapticPattern | number[]) => boolean;
  isSupported: boolean;
}

const HapticContext = React.createContext<HapticContextType | null>(null);

export function HapticProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = React.useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("haptic-enabled");
      return stored !== "false";
    }
    return true;
  });

  const { isSupported, vibrate, stop } = useHapticFeedback({ enabled });

  React.useEffect(() => {
    localStorage.setItem("haptic-enabled", String(enabled));
  }, [enabled]);

  return (
    <HapticContext.Provider value={{ enabled, setEnabled, vibrate, isSupported }}>
      {children}
    </HapticContext.Provider>
  );
}

export function useHaptic() {
  const context = React.useContext(HapticContext);
  if (!context) {
    throw new Error("useHaptic must be used within HapticProvider");
  }
  return context;
}

// ============================================================================
// HAPTIC LINK
// ============================================================================

export interface HapticLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  hapticPattern?: HapticPattern;
  children: React.ReactNode;
}

export const HapticLink = React.forwardRef<HTMLAnchorElement, HapticLinkProps>(
  ({ hapticPattern = "selection", onClick, children, ...props }, ref) => {
    const { vibrate } = useHapticFeedback();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      vibrate(hapticPattern);
      onClick?.(e);
    };

    return (
      <a ref={ref} onClick={handleClick} {...props}>
        {children}
      </a>
    );
  }
);
HapticLink.displayName = "HapticLink";

// ============================================================================
// HAPTIC INPUT WRAPPER
// ============================================================================

export interface UseHapticInputOptions {
  onFocus?: HapticPattern;
  onBlur?: HapticPattern;
  onChange?: HapticPattern;
  onError?: HapticPattern;
}

export function useHapticInput(options: UseHapticInputOptions = {}) {
  const { vibrate } = useHapticFeedback();

  const handlers = React.useMemo(() => ({
    onFocus: () => options.onFocus && vibrate(options.onFocus),
    onBlur: () => options.onBlur && vibrate(options.onBlur),
    onChange: () => options.onChange && vibrate(options.onChange),
    onError: () => options.onError && vibrate(options.onError || "error"),
  }), [options, vibrate]);

  return handlers;
}

// ============================================================================
// HAPTIC SLIDER
// ============================================================================

export interface HapticSliderProps {
  value: number[];
  onValueChange: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function HapticSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: HapticSliderProps) {
  const { vibrate } = useHapticFeedback();
  const lastValue = React.useRef(value[0]);

  const handleValueChange = (newValue: number[]) => {
    // Vibrate when crossing step boundaries
    const stepsChanged = Math.abs(newValue[0] - lastValue.current) >= step;
    if (stepsChanged) {
      vibrate("selection");
      lastValue.current = newValue[0];
    }
    onValueChange(newValue);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(e) => handleValueChange([Number(e.target.value)])}
      className={cn("w-full", className)}
    />
  );
}

// ============================================================================
// HAPTIC TOGGLE
// ============================================================================

export interface HapticToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function HapticToggle({ checked, onCheckedChange, className }: HapticToggleProps) {
  const { vibrate } = useHapticFeedback();

  const handleChange = (newChecked: boolean) => {
    vibrate(newChecked ? "success" : "light");
    onCheckedChange(newChecked);
  };

  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => handleChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-muted",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}
