/**
 * Confirmation Dialogs
 * Consistent confirmation patterns for destructive actions
 */

import { useState, createContext, useContext, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2, LogOut, RefreshCw, AlertCircle, Info, Check, X } from "lucide-react";

type ConfirmationType = "danger" | "warning" | "info";

interface ConfirmationOptions {
  type?: ConfirmationType;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string; // Text user must type to confirm
  icon?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmationContextValue {
  confirm: (options: ConfirmationOptions) => void;
  isOpen: boolean;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("useConfirmation must be used within ConfirmationProvider");
  }
  return context;
}

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");

  const confirm = useCallback((opts: ConfirmationOptions) => {
    setOptions(opts);
    setConfirmInput("");
  }, []);

  const handleConfirm = async () => {
    if (!options) return;

    if (options.confirmText && confirmInput !== options.confirmText) {
      return;
    }

    setIsLoading(true);
    try {
      await options.onConfirm();
      setOptions(null);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    options?.onCancel?.();
    setOptions(null);
    setConfirmInput("");
  };

  const isOpen = !!options;

  return (
    <ConfirmationContext.Provider value={{ confirm, isOpen }}>
      {children}
      
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          {options && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <ConfirmationIcon type={options.type} icon={options.icon} />
                  <div>
                    <DialogTitle>{options.title}</DialogTitle>
                    {options.description && (
                      <DialogDescription className="mt-2">
                        {options.description}
                      </DialogDescription>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {options.confirmText && (
                <div className="py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Digite <strong>{options.confirmText}</strong> para confirmar:
                  </p>
                  <Input
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={options.confirmText}
                    className={cn(
                      confirmInput === options.confirmText && "border-green-500"
                    )}
                  />
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                  {options.cancelLabel || "Cancelar"}
                </Button>
                <Button
                  variant={options.type === "danger" ? "destructive" : "default"}
                  onClick={handleConfirm}
                  disabled={
                    isLoading ||
                    (!!options.confirmText && confirmInput !== options.confirmText)
                  }
                >
                  {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                  {options.confirmLabel || "Confirmar"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ConfirmationContext.Provider>
  );
}

function ConfirmationIcon({
  type = "warning",
  icon,
}: {
  type?: ConfirmationType;
  icon?: ReactNode;
}) {
  if (icon) return <div className="flex-shrink-0">{icon}</div>;

  const icons: Record<ConfirmationType, ReactNode> = {
    danger: (
      <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
    ),
    warning: (
      <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
        <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
      </div>
    ),
    info: (
      <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/20">
        <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
    ),
  };

  return icons[type];
}

// Pre-built confirmation dialogs
export function useDeleteConfirmation() {
  const { confirm } = useConfirmation();

  return useCallback(
    (options: {
      itemName: string;
      onConfirm: () => void | Promise<void>;
      requireTyping?: boolean;
    }) => {
      confirm({
        type: "danger",
        title: `Excluir ${options.itemName}?`,
        description: `Esta ação não pode ser desfeita. ${options.itemName} será permanentemente removido.`,
        confirmLabel: "Excluir",
        confirmText: options.requireTyping ? options.itemName : undefined,
        icon: (
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/20">
            <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        ),
        onConfirm: options.onConfirm,
      });
    },
    [confirm]
  );
}

export function useLogoutConfirmation() {
  const { confirm } = useConfirmation();

  return useCallback(
    (onConfirm: () => void | Promise<void>) => {
      confirm({
        type: "warning",
        title: "Sair da conta?",
        description: "Você será desconectado e precisará fazer login novamente.",
        confirmLabel: "Sair",
        icon: (
          <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/20">
            <LogOut className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        ),
        onConfirm,
      });
    },
    [confirm]
  );
}

export function useDiscardChangesConfirmation() {
  const { confirm } = useConfirmation();

  return useCallback(
    (onConfirm: () => void | Promise<void>) => {
      confirm({
        type: "warning",
        title: "Descartar alterações?",
        description: "Você tem alterações não salvas. Deseja realmente sair sem salvar?",
        confirmLabel: "Descartar",
        cancelLabel: "Continuar editando",
        onConfirm,
      });
    },
    [confirm]
  );
}

// Inline Confirmation (for lists/tables)
interface InlineConfirmationProps {
  trigger: ReactNode;
  title: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
}

export function InlineConfirmation({
  trigger,
  title,
  onConfirm,
  onCancel,
  confirmLabel = "Sim",
  cancelLabel = "Não",
  className,
}: InlineConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setIsConfirming(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setIsConfirming(false);
  };

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        {isConfirming ? (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2"
          >
            <span className="text-sm text-muted-foreground">{title}</span>
            <Button size="sm" variant="destructive" className="h-7" onClick={handleConfirm}>
              {confirmLabel}
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={handleCancel}>
              {cancelLabel}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="trigger"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => setIsConfirming(true)}
          >
            {trigger}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Swipe to Confirm (for mobile)
export function SwipeToConfirm({
  onConfirm,
  label = "Deslize para confirmar",
  confirmLabel = "Confirmado!",
  className,
}: {
  onConfirm: () => void;
  label?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleDrag = (_: unknown, info: { offset: { x: number } }) => {
    const container = 280; // Approximate width
    const newProgress = Math.min(Math.max(info.offset.x / container, 0), 1);
    setProgress(newProgress);
  };

  const handleDragEnd = () => {
    if (progress > 0.9) {
      setIsConfirmed(true);
      onConfirm();
    } else {
      setProgress(0);
    }
  };

  if (isConfirmed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-12 rounded-full bg-green-500 text-white",
          className
        )}
      >
        <Check className="h-5 w-5 mr-2" />
        {confirmLabel}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative h-12 rounded-full bg-muted overflow-hidden",
        className
      )}
    >
      {/* Background progress */}
      <div
        className="absolute inset-y-0 left-0 bg-primary/20 transition-all"
        style={{ width: `${progress * 100}%` }}
      />

      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
        {label}
      </div>

      {/* Slider */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 240 }}
        dragElastic={0}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={{ x: progress * 240 }}
        className="absolute left-1 top-1 bottom-1 w-10 rounded-full bg-primary flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <ChevronRight className="h-5 w-5 text-primary-foreground" />
      </motion.div>
    </div>
  );
}

// Import missing icon
import { ChevronRight } from "lucide-react";

// Quick Confirm Button (double-click to confirm)
export function QuickConfirmButton({
  children,
  onConfirm,
  confirmLabel = "Clique novamente",
  timeout = 2000,
  variant = "destructive",
  className,
}: {
  children: ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  timeout?: number;
  variant?: "default" | "destructive" | "outline" | "ghost";
  className?: string;
}) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = () => {
    if (isPending) {
      onConfirm();
      setIsPending(false);
    } else {
      setIsPending(true);
      setTimeout(() => setIsPending(false), timeout);
    }
  };

  return (
    <Button
      variant={isPending ? "destructive" : variant}
      className={cn(
        "transition-all",
        isPending && "ring-2 ring-destructive ring-offset-2",
        className
      )}
      onClick={handleClick}
    >
      <AnimatePresence mode="wait">
        {isPending ? (
          <motion.span
            key="confirm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {confirmLabel}
          </motion.span>
        ) : (
          <motion.span
            key="initial"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
