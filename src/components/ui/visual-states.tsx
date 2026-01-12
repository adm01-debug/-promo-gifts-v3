import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Copy, ExternalLink, Info, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ==========================================
// VISUAL STATUS INDICATORS
// ==========================================

interface StatusDotProps {
  status: "success" | "warning" | "error" | "info" | "pending" | "inactive";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status, size = "md", pulse = false, className }: StatusDotProps) {
  const colors = {
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
    info: "bg-info",
    pending: "bg-amber-500",
    inactive: "bg-muted-foreground/50",
  };

  const sizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <span className={cn("relative inline-flex", className)}>
      <span className={cn("rounded-full", colors[status], sizes[size])} />
      {pulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
            colors[status]
          )}
        />
      )}
    </span>
  );
}

// Status Badge with Icon
interface StatusBadgeProps {
  status: "success" | "warning" | "error" | "info" | "pending";
  label: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const configs = {
    success: { icon: CheckCircle2, bg: "bg-success/10", text: "text-success", border: "border-success/20" },
    warning: { icon: AlertTriangle, bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
    error: { icon: XCircle, bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
    info: { icon: Info, bg: "bg-info/10", text: "text-info", border: "border-info/20" },
    pending: { icon: Loader2, bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20" },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "pending" && "animate-spin")} />
      {label}
    </span>
  );
}

// ==========================================
// INTERACTIVE STATES
// ==========================================

interface CopyButtonProps {
  value: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyButton({ value, className, size = "md" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizes = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className={cn(sizes[size], className)}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className={cn(iconSizes[size], "text-success")} />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className={iconSizes[size]} />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {copied ? "Copiado!" : "Copiar"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// External Link Indicator
interface ExternalLinkIndicatorProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ExternalLinkIndicator({ href, children, className }: ExternalLinkIndicatorProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-primary hover:underline",
        className
      )}
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ==========================================
// HOVER STATES
// ==========================================

interface HoverRevealProps {
  children: ReactNode;
  revealContent: ReactNode;
  className?: string;
}

export function HoverReveal({ children, revealContent, className }: HoverRevealProps) {
  return (
    <div className={cn("group relative", className)}>
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
        {revealContent}
      </div>
    </div>
  );
}

// ==========================================
// LOADING STATES
// ==========================================

interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  className?: string;
  blur?: boolean;
}

export function LoadingOverlay({ isLoading, children, className, blur = true }: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg",
              blur && "backdrop-blur-sm"
            )}
          >
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Skeleton Loader variants
interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export function Skeleton({ className, variant = "text" }: SkeletonProps) {
  const variants = {
    text: "h-4 rounded",
    circular: "rounded-full aspect-square",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(
        "bg-muted animate-pulse",
        variants[variant],
        className
      )}
    />
  );
}

// ==========================================
// EMPTY STATES
// ==========================================

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}

// ==========================================
// PROGRESS INDICATORS
// ==========================================

interface CircularProgressProps {
  value: number;
  size?: "sm" | "md" | "lg";
  strokeWidth?: number;
  showValue?: boolean;
  className?: string;
}

export function CircularProgress({
  value,
  size = "md",
  strokeWidth = 4,
  showValue = true,
  className,
}: CircularProgressProps) {
  const sizes = {
    sm: 32,
    md: 48,
    lg: 64,
  };

  const dimension = sizes[size];
  const radius = (dimension - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={dimension} height={dimension} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300"
        />
      </svg>
      {showValue && (
        <span className="absolute text-xs font-medium">
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
