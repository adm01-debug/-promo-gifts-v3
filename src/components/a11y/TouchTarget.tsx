import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

/**
 * Touch Target Wrapper - ensures minimum 44x44px touch targets (WCAG 2.5.5)
 */
interface TouchTargetProps {
  children: React.ReactNode;
  className?: string;
  as?: "button" | "a" | "div";
}

export const TouchTarget = forwardRef<
  HTMLButtonElement | HTMLAnchorElement | HTMLDivElement,
  TouchTargetProps & (ButtonHTMLAttributes<HTMLButtonElement> | AnchorHTMLAttributes<HTMLAnchorElement>)
>(({ children, className, as = "button", ...props }, ref) => {
  const baseClasses = cn(
    "min-w-[44px] min-h-[44px] inline-flex items-center justify-center",
    "touch-action-manipulation",
    className
  );

  if (as === "a") {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={baseClasses}
        {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  if (as === "div") {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={baseClasses}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={baseClasses}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
});

TouchTarget.displayName = "TouchTarget";

/**
 * Icon Button with proper touch target size
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: "sm" | "md" | "lg";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = "md", className, ...props }, ref) => {
    const sizeClasses = {
      sm: "min-w-[36px] min-h-[36px] p-2",
      md: "min-w-[44px] min-h-[44px] p-2.5",
      lg: "min-w-[52px] min-h-[52px] p-3"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg",
          "transition-colors hover:bg-muted focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring",
          sizeClasses[size],
          className
        )}
        aria-label={label}
        title={label}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export { TouchTarget as default };
