/**
 * Confirm Dialog Hook
 * Reusable confirmation dialog with customizable options
 */

import { useState, useCallback, ReactNode, createContext, useContext } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle, Trash2, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Dialog Options
interface ConfirmDialogOptions {
  title: string;
  description?: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning" | "info" | "success";
  icon?: ReactNode;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  isLoading: boolean;
}

// Default icons for variants
const variantIcons = {
  default: null,
  destructive: <Trash2 className="h-6 w-6 text-destructive" />,
  warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
  info: <Info className="h-6 w-6 text-blue-500" />,
  success: <CheckCircle className="h-6 w-6 text-green-500" />,
};

// Confirm Dialog Hook
export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmDialogState>({
    isOpen: false,
    isLoading: false,
    title: "",
    description: "",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    variant: "default",
  });

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        isLoading: false,
        ...options,
        onConfirm: async () => {
          setState((prev) => ({ ...prev, isLoading: true }));
          try {
            await options.onConfirm?.();
            resolve(true);
          } catch (error) {
            resolve(false);
          } finally {
            setState((prev) => ({ ...prev, isOpen: false, isLoading: false }));
          }
        },
        onCancel: () => {
          options.onCancel?.();
          resolve(false);
          setState((prev) => ({ ...prev, isOpen: false }));
        },
      });
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const ConfirmDialogComponent = useCallback(
    () => (
      <AlertDialog open={state.isOpen} onOpenChange={(open) => !open && state.onCancel?.()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-start gap-4">
              {(state.icon || variantIcons[state.variant || "default"]) && (
                <div className="flex-shrink-0">
                  {state.icon || variantIcons[state.variant || "default"]}
                </div>
              )}
              <div className="flex-1">
                <AlertDialogTitle>{state.title}</AlertDialogTitle>
                {state.description && (
                  <AlertDialogDescription className="mt-2">
                    {state.description}
                  </AlertDialogDescription>
                )}
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={state.onCancel}
              disabled={state.isLoading}
            >
              {state.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={state.onConfirm}
              disabled={state.isLoading}
              className={cn(
                state.variant === "destructive" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                state.confirmText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
    [state]
  );

  return {
    confirm,
    close,
    ConfirmDialog: ConfirmDialogComponent,
    isOpen: state.isOpen,
    isLoading: state.isLoading,
  };
}

// Shortcut for delete confirmation
export function useDeleteConfirm() {
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const confirmDelete = useCallback(
    (
      itemName: string,
      onConfirm: () => void | Promise<void>,
      options?: Partial<ConfirmDialogOptions>
    ) => {
      return confirm({
        title: `Excluir ${itemName}?`,
        description: `Esta ação não pode ser desfeita. O item "${itemName}" será permanentemente removido.`,
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive",
        onConfirm,
        ...options,
      });
    },
    [confirm]
  );

  return { confirmDelete, DeleteConfirmDialog: ConfirmDialog };
}

// Context for global confirm dialog
interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const { confirm, ConfirmDialog } = useConfirmDialog();

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog />
    </ConfirmDialogContext.Provider>
  );
}

export function useGlobalConfirm() {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error("useGlobalConfirm must be used within ConfirmDialogProvider");
  }
  return context.confirm;
}
