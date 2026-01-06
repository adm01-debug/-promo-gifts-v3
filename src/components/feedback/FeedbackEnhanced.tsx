import { ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================
// Alert Banner - Banner de alerta no topo
// ============================================
interface AlertBannerProps {
  variant?: "info" | "success" | "warning" | "error";
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const bannerVariants = {
  info: "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300",
  success: "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300",
  warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  error: "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300",
};

const bannerIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export function AlertBanner({
  variant = "info",
  children,
  dismissible,
  onDismiss,
  action,
  className,
}: AlertBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = bannerIcons[variant];

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "border-b",
            bannerVariants[variant],
            className
          )}
        >
          <div className="container flex items-center gap-3 py-3">
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span className="flex-1 text-sm">{children}</span>
            {action && (
              <Button
                variant="ghost"
                size="sm"
                onClick={action.onClick}
                className="gap-1"
              >
                {action.label}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
            {dismissible && (
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-black/10 rounded-md transition-colors"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Floating Notification - Notificação flutuante
// ============================================
interface FloatingNotificationProps {
  variant?: "info" | "success" | "warning" | "error";
  title: string;
  description?: string;
  duration?: number;
  onClose?: () => void;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function FloatingNotification({
  variant = "info",
  title,
  description,
  duration = 5000,
  onClose,
  position = "bottom-right",
}: FloatingNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const Icon = bannerIcons[variant];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={cn(
            "fixed z-50 w-80 p-4 rounded-lg shadow-lg border bg-card",
            positionClasses[position]
          )}
        >
          <div className="flex gap-3">
            <Icon
              className={cn(
                "h-5 w-5 flex-shrink-0",
                variant === "success" && "text-green-500",
                variant === "error" && "text-red-500",
                variant === "warning" && "text-yellow-500",
                variant === "info" && "text-blue-500"
              )}
            />
            <div className="flex-1">
              <h4 className="text-sm font-medium">{title}</h4>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={() => {
                setIsVisible(false);
                onClose?.();
              }}
              className="p-1 hover:bg-accent rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// ProcessingOverlay - Overlay de processamento
// ============================================
interface ProcessingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
}

export function ProcessingOverlay({
  isVisible,
  message = "Processando...",
  progress,
}: ProcessingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium">{message}</p>
            {progress !== undefined && (
              <div className="w-64 mx-auto">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// EmptyStateEnhanced - Estado vazio aprimorado
// ============================================
interface EmptyStateEnhancedProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  illustration?: "search" | "empty" | "error" | "success";
  className?: string;
}

export function EmptyStateEnhanced({
  icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  className,
}: EmptyStateEnhancedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 p-4 rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// SuccessAnimation - Animação de sucesso
// ============================================
interface SuccessAnimationProps {
  isVisible: boolean;
  message?: string;
  onComplete?: () => void;
}

export function SuccessAnimation({
  isVisible,
  message = "Sucesso!",
  onComplete,
}: SuccessAnimationProps) {
  useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500 flex items-center justify-center"
            >
              <CheckCircle2 className="h-10 w-10 text-white" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-semibold"
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Skeleton Variants - Variantes de skeleton
// ============================================
interface SkeletonCardProps {
  variant?: "product" | "list" | "stats" | "avatar";
  className?: string;
}

export function SkeletonCard({ variant = "product", className }: SkeletonCardProps) {
  if (variant === "product") {
    return (
      <div className={cn("space-y-4 p-4 border rounded-lg", className)}>
        <div className="aspect-square bg-muted rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        </div>
        <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("flex items-center gap-4 p-4", className)}>
        <div className="h-12 w-12 bg-muted rounded-lg animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className={cn("p-6 border rounded-lg", className)}>
        <div className="h-4 bg-muted rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  if (variant === "avatar") {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24 animate-pulse" />
          <div className="h-3 bg-muted rounded w-16 animate-pulse" />
        </div>
      </div>
    );
  }

  return null;
}
