import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active shadow-[0_0_15px_rgba(255,102,0,0.2)] hover:shadow-[0_0_25px_rgba(255,102,0,0.4)] border border-primary/20",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md",
        outline: "border-2 border-primary/30 bg-background text-primary-hover hover:border-primary hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(255,102,0,0.1)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-divider shadow-sm",
        ghost: "hover:bg-primary/10 hover:text-primary-hover font-bold",
        link: "text-primary underline-offset-4 hover:underline font-bold",
        orange: "bg-orange text-orange-foreground hover:bg-orange-hover active:bg-orange-active shadow-[0_0_20px_rgba(255,102,0,0.3)] hover:shadow-[0_0_35px_rgba(255,102,0,0.5)] border border-white/20",
        // Nova variante premium com gradiente e glow intenso
        premium: "bg-gradient-to-br from-orange via-orange-hover to-orange-active text-white shadow-[0_10px_30px_rgba(255,102,0,0.3)] hover:shadow-[0_15px_45px_rgba(255,102,0,0.5)] hover:scale-[1.02] border border-white/30",
        // Variante success para ações de confirmação
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-lg border border-success/20",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-9 rounded-md px-3 min-h-[36px]",
        lg: "h-12 rounded-md px-8 min-h-[48px] text-base",
        xl: "h-14 rounded-lg px-10 min-h-[56px] text-lg font-semibold",
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
