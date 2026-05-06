import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-xl border border-border bg-background px-4 py-3 text-[11px] font-medium leading-relaxed",
        "ring-offset-background placeholder:text-muted-foreground/60",
        // Focus: ring laranja com glow
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:border-primary",
        // Hover: borda laranja + sombra
        "hover:border-border-strong hover:shadow-medium",
        "transition-all duration-300 shadow-soft",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };