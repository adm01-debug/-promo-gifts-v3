import { ReactNode } from "react";
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
import { AlertTriangle, Trash2, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmVariant = "danger" | "warning" | "info" | "success";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  icon?: ReactNode;
}

const variantStyles: Record<ConfirmVariant, { 
  icon: ReactNode; 
  iconBg: string;
  buttonClass: string;
}> = {
  danger: {
    icon: <Trash2 className="w-6 h-6" />,
    iconBg: "bg-destructive/10 text-destructive",
    buttonClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    iconBg: "bg-warning/10 text-warning",
    buttonClass: "bg-warning text-warning-foreground hover:bg-warning/90",
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    iconBg: "bg-info/10 text-info",
    buttonClass: "bg-info text-info-foreground hover:bg-info/90",
  },
  success: {
    icon: <CheckCircle className="w-6 h-6" />,
    iconBg: "bg-success/10 text-success",
    buttonClass: "bg-success text-success-foreground hover:bg-success/90",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  variant = "danger",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const styles = variantStyles[variant];

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-full", styles.iconBg)}>
              {icon || styles.icon}
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg">
                {title}
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={cn(styles.buttonClass)}
            disabled={isLoading}
          >
            {isLoading ? "Processando..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Convenience hooks for common dialogs
export function useDeleteConfirmation() {
  return {
    title: "Excluir item",
    description: "Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.",
    confirmLabel: "Excluir",
    variant: "danger" as const,
  };
}

export function useLogoutConfirmation() {
  return {
    title: "Sair da conta",
    description: "Você será desconectado e precisará fazer login novamente.",
    confirmLabel: "Sair",
    variant: "warning" as const,
  };
}

export function useSaveConfirmation() {
  return {
    title: "Salvar alterações",
    description: "Deseja salvar as alterações realizadas?",
    confirmLabel: "Salvar",
    variant: "success" as const,
  };
}
