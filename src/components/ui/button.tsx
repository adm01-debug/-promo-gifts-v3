import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-[11px] font-bold uppercase tracking-widest ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:border-primary disabled:pointer-events-none disabled:opacity-40 disabled:grayscale [&_svg]:pointer-events-none [&_svg]:size-[1.2em] [&_svg]:shrink-0 touch-manipulation active:scale-[0.96] hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-soft hover:shadow-medium border border-primary/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft hover:shadow-medium border border-destructive/20",
        outline: "border-2 border-primary/20 bg-background text-primary hover:border-primary hover:bg-primary/5 active:bg-primary/10",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-divider shadow-soft hover:shadow-medium",
        ghost: "hover:bg-primary/10 hover:text-primary active:bg-primary/20",
        link: "link-primary",
        "link-secondary": "link-secondary",
        "link-disabled": "link-disabled",
        orange: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-soft hover:shadow-medium border border-white/10",
        premium: "bg-success text-success-foreground shadow-medium hover:shadow-premium-hover hover:scale-[1.02] active:scale-[0.98] border border-white/20",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft hover:shadow-medium border border-success/20",
        gradient: "bg-gradient-primary text-primary-foreground hover:shadow-premium-hover active:scale-[0.98] border border-white/10 shadow-medium",
      },
      size: {
        default: "h-11 px-5 py-2.5 min-h-[44px]",
        sm: "h-9 rounded-xl px-4 min-h-[36px]",
        lg: "h-13 rounded-xl px-10 min-h-[52px] text-[13px]",
        xl: "h-15 rounded-xl px-12 min-h-[60px] text-base font-extrabold tracking-widest",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);


export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };