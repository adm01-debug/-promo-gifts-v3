import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation active:scale-[0.96] hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-sm hover:shadow-glow border border-primary/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border-2 border-primary/30 bg-background text-primary hover:border-primary hover:bg-primary/5 hover:shadow-soft",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-divider shadow-sm",
        ghost: "hover:bg-primary/10 hover:text-primary font-bold",
        link: "text-primary underline-offset-4 hover:underline font-bold",
        orange: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-glow hover:shadow-glow-hover border border-white/20",
        // Variante premium com gradiente e brilho intenso
        premium: "bg-gradient-cta text-primary-foreground shadow-medium hover:shadow-premium hover:scale-[1.02] border border-white/30",
        // Variante success para ações de confirmação
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-md border border-success/20",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-9 rounded-lg px-3 min-h-[36px]",
        lg: "h-12 rounded-lg px-8 min-h-[48px] text-base",
        xl: "h-14 rounded-xl px-10 min-h-[56px] text-lg font-semibold",
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
