import { ReactNode, useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { 
  Check, 
  X, 
  AlertCircle, 
  Info, 
  Loader2, 
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick?: () => void;
  };
}

interface ToastIconProps {
  children: ReactNode;
  className?: string;
}

function ToastIcon({ children, className }: ToastIconProps) {
  return (
    <div className={cn(
      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
      className
    )}>
      {children}
    </div>
  );
}

/**
 * Enhanced toast utility with consistent styling
 */
export const toast = {
  /**
   * Success toast with green accent
   */
  success: (options: ToastOptions | string) => {
    const opts = typeof options === "string" ? { title: options } : options;
    
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 w-full">
        <ToastIcon className="bg-success/10 text-success">
          <CheckCircle2 className="h-4 w-4" />
        </ToastIcon>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{opts.title}</p>
          {opts.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{opts.description}</p>
          )}
        </div>
        {opts.action && (
          <button
            onClick={() => {
              opts.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {opts.action.label}
          </button>
        )}
      </div>
    ), {
      duration: opts.duration || 4000,
    });
  },

  /**
   * Error toast with red accent
   */
  error: (options: ToastOptions | string) => {
    const opts = typeof options === "string" ? { title: options } : options;
    
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 w-full">
        <ToastIcon className="bg-destructive/10 text-destructive">
          <XCircle className="h-4 w-4" />
        </ToastIcon>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{opts.title}</p>
          {opts.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{opts.description}</p>
          )}
        </div>
        {opts.action && (
          <button
            onClick={() => {
              opts.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-destructive hover:text-destructive/80 transition-colors"
          >
            {opts.action.label}
          </button>
        )}
      </div>
    ), {
      duration: opts.duration || 5000,
    });
  },

  /**
   * Warning toast with amber accent
   */
  warning: (options: ToastOptions | string) => {
    const opts = typeof options === "string" ? { title: options } : options;
    
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 w-full">
        <ToastIcon className="bg-warning/10 text-warning">
          <AlertTriangle className="h-4 w-4" />
        </ToastIcon>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{opts.title}</p>
          {opts.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{opts.description}</p>
          )}
        </div>
        {opts.action && (
          <button
            onClick={() => {
              opts.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-warning hover:text-warning/80 transition-colors"
          >
            {opts.action.label}
          </button>
        )}
      </div>
    ), {
      duration: opts.duration || 5000,
    });
  },

  /**
   * Info toast with blue accent
   */
  info: (options: ToastOptions | string) => {
    const opts = typeof options === "string" ? { title: options } : options;
    
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 w-full">
        <ToastIcon className="bg-info/10 text-info">
          <Info className="h-4 w-4" />
        </ToastIcon>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{opts.title}</p>
          {opts.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{opts.description}</p>
          )}
        </div>
        {opts.action && (
          <button
            onClick={() => {
              opts.action?.onClick();
              sonnerToast.dismiss(t);
            }}
            className="text-sm font-medium text-info hover:text-info/80 transition-colors"
          >
            {opts.action.label}
          </button>
        )}
      </div>
    ), {
      duration: opts.duration || 4000,
    });
  },

  /**
   * Loading toast - returns dismiss function
   */
  loading: (message: string) => {
    const toastId = sonnerToast.custom(() => (
      <div className="flex items-center gap-3 w-full">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
        <p className="font-medium text-foreground">{message}</p>
      </div>
    ), {
      duration: Infinity,
    });

    return () => sonnerToast.dismiss(toastId);
  },

  /**
   * Promise toast - shows loading, then success/error
   */
  promise: <T,>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    }
  ) => {
    sonnerToast.promise(promise, {
      loading: options.loading,
      success: options.success,
      error: options.error,
    });
  },

  /**
   * Notification-style toast
   */
  notification: (options: {
    title: string;
    description?: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  }) => {
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 w-full">
        <ToastIcon className="bg-primary/10 text-primary">
          <Bell className="h-4 w-4" />
        </ToastIcon>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground">{options.title}</p>
          {options.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{options.description}</p>
          )}
          {options.action && (
            <button
              onClick={() => {
                options.action?.onClick();
                sonnerToast.dismiss(t);
              }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-2"
            >
              {options.action.label}
            </button>
          )}
        </div>
      </div>
    ), {
      duration: 6000,
    });
  },

  /**
   * Dismiss all toasts
   */
  dismiss: sonnerToast.dismiss,
};

/**
 * Hook for toast with automatic loading states
 */
export function useToastAction() {
  const execute = useCallback(async <T,>(
    action: () => Promise<T>,
    options: {
      loading?: string;
      success?: string;
      error?: string;
    } = {}
  ): Promise<T | undefined> => {
    const {
      loading = "Processando...",
      success = "Concluído com sucesso!",
      error = "Ocorreu um erro. Tente novamente.",
    } = options;

    const dismiss = toast.loading(loading);

    try {
      const result = await action();
      dismiss();
      toast.success(success);
      return result;
    } catch (e) {
      dismiss();
      toast.error(e instanceof Error ? e.message : error);
      return undefined;
    }
  }, []);

  return { execute };
}
