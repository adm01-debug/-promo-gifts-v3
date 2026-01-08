import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    confirmBg: "bg-red-600 hover:bg-red-700 text-white"
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    confirmBg: "bg-amber-600 hover:bg-amber-700 text-white"
  },
  info: {
    icon: AlertCircle,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    confirmBg: "bg-primary hover:bg-primary/90 text-primary-foreground"
  }
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-background rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-border">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-full", config.iconBg)}>
                    <Icon className={cn("w-6 h-6", config.iconColor)} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {title}
                    </h3>
                    {description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-4 bg-muted/30 border-t border-border">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {cancelText}
                </Button>
                <Button
                  onClick={handleConfirm}
                  className={cn("flex-1", config.confirmBg)}
                  disabled={isLoading}
                >
                  {isLoading ? "Processando..." : confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for easy confirmation dialogs
export function useConfirmDialog() {
  const [state, setState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    variant: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    variant: "danger",
    onConfirm: () => {}
  });

  const confirm = (options: {
    title: string;
    description?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void | Promise<void>;
  }) => {
    setState({
      isOpen: true,
      title: options.title,
      description: options.description,
      variant: options.variant || "danger",
      onConfirm: options.onConfirm
    });
  };

  const close = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    confirm,
    dialogProps: {
      isOpen: state.isOpen,
      onClose: close,
      onConfirm: state.onConfirm,
      title: state.title,
      description: state.description,
      variant: state.variant
    }
  };
}

// Delete confirmation with typed item name
interface DeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  itemName: string;
  itemType?: string;
  isLoading?: boolean;
}

export function DeleteConfirm({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = "item",
  isLoading
}: DeleteConfirmProps) {
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.toLowerCase() === itemName.toLowerCase();

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={() => {
        setConfirmText("");
        onClose();
      }}
      onConfirm={onConfirm}
      title={`Excluir ${itemType}?`}
      description={`Esta ação não pode ser desfeita. Para confirmar, digite "${itemName}" abaixo.`}
      confirmText="Excluir permanentemente"
      variant="danger"
      isLoading={isLoading}
    />
  );
}

// Success confirmation (after action)
interface SuccessConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SuccessConfirm({
  isOpen,
  onClose,
  title,
  description,
  actionLabel,
  onAction
}: SuccessConfirmProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-background rounded-xl shadow-2xl max-w-sm w-full p-6 text-center border border-border">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
              >
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </motion.div>

              <h3 className="text-lg font-semibold text-foreground mb-2">
                {title}
              </h3>
              
              {description && (
                <p className="text-sm text-muted-foreground mb-6">
                  {description}
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Fechar
                </Button>
                {actionLabel && onAction && (
                  <Button onClick={onAction} className="flex-1">
                    {actionLabel}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
