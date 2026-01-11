import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Info, HelpCircle, Lightbulb, AlertTriangle, CheckCircle, X } from "lucide-react";

interface RichTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  title?: string;
  description?: string;
  icon?: "info" | "help" | "tip" | "warning" | "success" | React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  variant?: "default" | "info" | "success" | "warning" | "primary";
  maxWidth?: number;
  showArrow?: boolean;
  interactive?: boolean;
  delayDuration?: number;
}

const iconMap = {
  info: Info,
  help: HelpCircle,
  tip: Lightbulb,
  warning: AlertTriangle,
  success: CheckCircle,
};

const variantStyles = {
  default: "bg-popover border-border text-popover-foreground",
  info: "bg-info/10 border-info/30 text-foreground",
  success: "bg-success/10 border-success/30 text-foreground",
  warning: "bg-warning/10 border-warning/30 text-foreground",
  primary: "bg-primary/10 border-primary/30 text-foreground",
};

const iconColors = {
  default: "text-muted-foreground",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  primary: "text-primary",
};

export function RichTooltip({
  children,
  content,
  title,
  description,
  icon,
  side = "top",
  align = "center",
  variant = "default",
  maxWidth = 280,
  showArrow = true,
  interactive = false,
  delayDuration = 200,
}: RichTooltipProps) {
  const IconComponent = typeof icon === "string" ? iconMap[icon] : null;

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={8}
            className={cn(
              "z-[var(--z-tooltip)] rounded-xl border p-4 shadow-lg",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2",
              "data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2",
              "data-[side=top]:slide-in-from-bottom-2",
              variantStyles[variant]
            )}
            style={{ maxWidth }}
          >
            <div className="space-y-2">
              {(title || IconComponent || typeof icon !== "string") && (
                <div className="flex items-start gap-2">
                  {IconComponent && (
                    <IconComponent className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconColors[variant])} />
                  )}
                  {typeof icon !== "string" && icon && (
                    <span className="flex-shrink-0">{icon}</span>
                  )}
                  {title && (
                    <span className="font-semibold text-sm">{title}</span>
                  )}
                </div>
              )}
              {description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              )}
              {content && !title && !description && (
                <div className="text-sm">{content}</div>
              )}
            </div>
            {showArrow && (
              <TooltipPrimitive.Arrow 
                className={cn(
                  "fill-current",
                  variant === "default" ? "text-popover" : `text-${variant}/10`
                )}
              />
            )}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// Inline Help Component
export function InlineHelp({
  content,
  title,
  className,
}: {
  content: string;
  title?: string;
  className?: string;
}) {
  return (
    <RichTooltip
      title={title}
      description={content}
      icon="help"
      variant="info"
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center w-4 h-4 rounded-full",
          "bg-muted hover:bg-muted/80 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          className
        )}
      >
        <HelpCircle className="w-3 h-3 text-muted-foreground" />
      </button>
    </RichTooltip>
  );
}

// Hotkey Tooltip
export function HotkeyTooltip({
  children,
  hotkey,
  description,
  side = "bottom",
}: {
  children: React.ReactNode;
  hotkey: string;
  description?: string;
  side?: "top" | "right" | "bottom" | "left";
}) {
  const keys = hotkey.split("+");
  
  return (
    <RichTooltip
      side={side}
      variant="default"
      content={
        <div className="flex items-center gap-2">
          {description && <span className="text-muted-foreground">{description}</span>}
          <div className="flex items-center gap-1">
            {keys.map((key, i) => (
              <React.Fragment key={key}>
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border border-border">
                  {key}
                </kbd>
                {i < keys.length - 1 && <span className="text-muted-foreground">+</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      }
    >
      {children}
    </RichTooltip>
  );
}
