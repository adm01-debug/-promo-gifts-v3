import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Info, Lightbulb, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type TooltipVariant = "default" | "info" | "tip" | "warning";

interface ContextualTooltipProps {
  children: ReactNode;
  content: ReactNode;
  variant?: TooltipVariant;
  side?: "top" | "right" | "bottom" | "left";
  showIcon?: boolean;
  className?: string;
}

const variantStyles: Record<TooltipVariant, { 
  bg: string; 
  icon: typeof Info;
  iconColor: string;
}> = {
  default: {
    bg: "bg-popover",
    icon: Info,
    iconColor: "text-muted-foreground"
  },
  info: {
    bg: "bg-info/10 border-info/30",
    icon: Info,
    iconColor: "text-info"
  },
  tip: {
    bg: "bg-warning/5 dark:bg-amber-950 border-warning/20 dark:border-amber-800",
    icon: Lightbulb,
    iconColor: "text-warning"
  },
  warning: {
    bg: "bg-destructive/10 border-destructive/30",
    icon: AlertTriangle,
    iconColor: "text-destructive"
  }
};

export function ContextualTooltip({
  children,
  content,
  variant = "default",
  side = "top",
  showIcon = false,
  className
}: ContextualTooltipProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center gap-1", className)}>
            {children}
            {showIcon && (
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className={cn(
            "max-w-xs p-3 text-sm",
            styles.bg
          )}
        >
          <div className="flex gap-2">
            {variant !== "default" && (
              <Icon className={cn("h-4 w-4 flex-shrink-0 mt-0.5", styles.iconColor)} />
            )}
            <div>{content}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Quick info tooltip - just shows text on hover
interface InfoTooltipProps {
  text: string;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function InfoTooltip({ text, side = "top", className }: InfoTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            type="button"
            className={cn(
              "inline-flex items-center justify-center",
              "text-muted-foreground hover:text-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full",
              className
            )}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Feature tip - highlights new or useful features
interface FeatureTipProps {
  children: ReactNode;
  tip: string;
  show?: boolean;
  onDismiss?: () => void;
}

export function FeatureTip({ children, tip, show = true, onDismiss }: FeatureTipProps) {
  if (!show) return <>{children}</>;
  
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse" />
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="top"
          className="bg-primary text-primary-foreground p-3 max-w-xs"
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Dica!</p>
              <p className="text-xs opacity-90">{tip}</p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-1 right-1 p-1 hover:bg-white/20 rounded"
            >
              ×
            </button>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Field helper - shows help text for form fields
interface FieldHelperProps {
  label: string;
  help: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldHelper({ label, help, required, children }: FieldHelperProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        <InfoTooltip text={help} />
      </div>
      {children}
    </div>
  );
}

// Keyboard shortcut tooltip
interface ShortcutTooltipProps {
  children: ReactNode;
  shortcut: string;
  description?: string;
  side?: "top" | "right" | "bottom" | "left";
}

export function ShortcutTooltip({ 
  children, 
  shortcut, 
  description,
  side = "bottom" 
}: ShortcutTooltipProps) {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const formattedShortcut = shortcut
    .replace("Ctrl", isMac ? "⌘" : "Ctrl")
    .replace("Alt", isMac ? "⌥" : "Alt")
    .replace("Shift", isMac ? "⇧" : "Shift");
  
  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className="flex items-center gap-2">
          {description && <span>{description}</span>}
          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted rounded border border-border">
            {formattedShortcut}
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Status indicator with tooltip
interface StatusTooltipProps {
  status: "success" | "warning" | "error" | "pending" | "neutral";
  label: string;
  description?: string;
}

const statusColors = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  pending: "bg-info",
  neutral: "bg-muted-foreground"
};

export function StatusTooltip({ status, label, description }: StatusTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <span className={cn("h-2 w-2 rounded-full", statusColors[status])} />
            <span className="text-sm">{label}</span>
          </div>
        </TooltipTrigger>
        {description && (
          <TooltipContent>
            {description}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
