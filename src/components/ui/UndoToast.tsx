import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Check, AlertTriangle, Info, Trash2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface UndoToastProps {
  message: string;
  description?: string;
  duration?: number;
  onUndo: () => void | Promise<void>;
  onDismiss?: () => void;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  undoLabel?: string;
  showProgress?: boolean;
}

const variantConfig = {
  default: {
    icon: Info,
    iconClass: "text-foreground",
    bgClass: "bg-card",
    borderClass: "border-border",
  },
  destructive: {
    icon: Trash2,
    iconClass: "text-destructive",
    bgClass: "bg-card",
    borderClass: "border-destructive/30",
  },
  success: {
    icon: Check,
    iconClass: "text-success",
    bgClass: "bg-card",
    borderClass: "border-success/30",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-warning",
    bgClass: "bg-card",
    borderClass: "border-warning/30",
  },
  info: {
    icon: Info,
    iconClass: "text-info",
    bgClass: "bg-card",
    borderClass: "border-info/30",
  },
};

export function UndoToast({
  message,
  description,
  duration = 5000,
  onUndo,
  onDismiss,
  variant = "default",
  undoLabel = "Desfazer",
  showProgress = true,
}: UndoToastProps) {
  const [visible, setVisible] = useState(true);
  const [isUndoing, setIsUndoing] = useState(false);
  const [progress, setProgress] = useState(100);

  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleDismiss = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleUndo = useCallback(async () => {
    setIsUndoing(true);
    try {
      await onUndo();
      setVisible(false);
    } catch (error) {
      console.error("Undo failed:", error);
      setIsUndoing(false);
    }
  }, [onUndo]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        if (newProgress <= 0) {
          handleDismiss();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [duration, handleDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]",
            "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl",
            "backdrop-blur-md",
            config.bgClass,
            config.borderClass
          )}
        >
          {/* Icon */}
          <div className={cn("shrink-0", config.iconClass)}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Content */}
          <div className="flex flex-col min-w-0">
            <p className="font-medium text-sm">{message}</p>
            {description && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                {description}
              </p>
            )}
          </div>

          {/* Undo Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={isUndoing}
            className="gap-1 text-primary hover:text-primary shrink-0"
          >
            <RotateCcw className={cn("h-4 w-4", isUndoing && "animate-spin")} />
            {undoLabel}
          </Button>

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-7 w-7 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Progress Bar */}
          {showProgress && (
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-primary/50 rounded-b-xl"
              initial={{ width: "100%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to manage undo toasts
interface UndoAction {
  id: string;
  message: string;
  description?: string;
  onUndo: () => void | Promise<void>;
  variant?: UndoToastProps["variant"];
}

export function useUndoToast() {
  const [activeUndo, setActiveUndo] = useState<UndoAction | null>(null);

  const showUndo = useCallback(
    (action: Omit<UndoAction, "id">) => {
      const id = Math.random().toString(36).slice(2);
      setActiveUndo({ ...action, id });
    },
    []
  );

  const dismissUndo = useCallback(() => {
    setActiveUndo(null);
  }, []);

  const UndoToastContainer = useCallback(() => {
    if (!activeUndo) return null;

    return (
      <UndoToast
        key={activeUndo.id}
        message={activeUndo.message}
        description={activeUndo.description}
        variant={activeUndo.variant}
        onUndo={async () => {
          await activeUndo.onUndo();
          dismissUndo();
        }}
        onDismiss={dismissUndo}
      />
    );
  }, [activeUndo, dismissUndo]);

  return {
    showUndo,
    dismissUndo,
    UndoToastContainer,
  };
}
