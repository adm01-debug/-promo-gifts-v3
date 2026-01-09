import { toast as baseToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertTriangle, Info, Undo2 } from "lucide-react";
import React from "react";

// Durações padrão por tipo (NF-01 a NF-05)
const DURATIONS = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
  undo: 5000,
};

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

interface UndoToastOptions extends ToastOptions {
  onUndo: () => void;
  undoLabel?: string;
}

/**
 * Toast Helpers - Funções auxiliares para toasts padronizados
 */

export function successToast(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return baseToast({
    title: opts.title || "Sucesso!",
    description: opts.description,
    variant: "default",
    duration: opts.duration || DURATIONS.success,
  });
}

export function errorToast(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return baseToast({
    title: opts.title || "Erro",
    description: opts.description,
    variant: "destructive",
    duration: opts.duration || DURATIONS.error,
  });
}

export function warningToast(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return baseToast({
    title: opts.title || "Atenção",
    description: opts.description,
    variant: "default",
    duration: opts.duration || DURATIONS.warning,
  });
}

export function infoToast(options: ToastOptions | string) {
  const opts = typeof options === "string" ? { description: options } : options;
  
  return baseToast({
    title: opts.title || "Informação",
    description: opts.description,
    variant: "default",
    duration: opts.duration || DURATIONS.info,
  });
}

/**
 * Toast com ação de undo (NF-05)
 */
export function undoToast(options: UndoToastOptions) {
  let undoClicked = false;
  
  const toastInstance = baseToast({
    title: options.title || "Ação realizada",
    description: options.description,
    variant: "default",
    duration: options.duration || DURATIONS.undo,
    action: React.createElement(
      "button",
      {
        onClick: () => {
          undoClicked = true;
          options.onUndo();
          toastInstance.dismiss();
        },
        className: "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors",
      },
      React.createElement(Undo2, { className: "h-3.5 w-3.5" }),
      options.undoLabel || "Desfazer"
    ),
  });

  return {
    ...toastInstance,
    wasUndone: () => undoClicked,
  };
}

/**
 * Toast de loading com atualização para sucesso/erro
 */
export function loadingToast(description: string) {
  const toastInstance = baseToast({
    title: "Processando...",
    description,
    variant: "default",
    duration: Infinity, // Não auto-dismiss
  });

  return {
    ...toastInstance,
    success: (message: string) => {
      toastInstance.update({
        id: toastInstance.id,
        title: "Sucesso!",
        description: message,
        variant: "default",
        duration: DURATIONS.success,
      });
    },
    error: (message: string) => {
      toastInstance.update({
        id: toastInstance.id,
        title: "Erro",
        description: message,
        variant: "destructive",
        duration: DURATIONS.error,
      });
    },
  };
}

/**
 * Toast de ação com tempo restante
 */
export function timedToast(options: ToastOptions & { 
  timeoutMs: number;
  onTimeout?: () => void;
}) {
  const startTime = Date.now();
  const endTime = startTime + options.timeoutMs;
  
  const toastInstance = baseToast({
    title: options.title,
    description: options.description,
    variant: "default",
    duration: options.timeoutMs,
  });

  // Callback quando o tempo expirar
  if (options.onTimeout) {
    setTimeout(() => {
      options.onTimeout?.();
    }, options.timeoutMs);
  }

  return toastInstance;
}

// Alias convenientes
export const toast = {
  success: successToast,
  error: errorToast,
  warning: warningToast,
  info: infoToast,
  undo: undoToast,
  loading: loadingToast,
  timed: timedToast,
};

export default toast;
