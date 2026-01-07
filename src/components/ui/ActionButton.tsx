import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  successIcon?: React.ReactNode;
  success?: boolean;
  successText?: string;
}

/**
 * ActionButton - Botão com estados de loading e sucesso integrados
 * 
 * @example
 * <ActionButton 
 *   loading={isSaving} 
 *   loadingText="Salvando..."
 *   icon={<Save className="h-4 w-4" />}
 *   onClick={handleSave}
 * >
 *   Salvar
 * </ActionButton>
 */
export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ 
    loading = false, 
    loadingText, 
    icon,
    successIcon,
    success = false,
    successText,
    children, 
    disabled, 
    className,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    
    const displayText = success 
      ? (successText || children) 
      : loading 
        ? (loadingText || children) 
        : children;

    const displayIcon = success 
      ? successIcon 
      : loading 
        ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> 
        : icon;

    return (
      <Button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "relative transition-all",
          success && "bg-success text-success-foreground hover:bg-success/90",
          className
        )}
        aria-busy={loading}
        {...props}
      >
        {displayIcon && (
          <span className="mr-2" aria-hidden="true">
            {displayIcon}
          </span>
        )}
        {displayText}
      </Button>
    );
  }
);

ActionButton.displayName = "ActionButton";

// Preset buttons for common actions
export function SaveButton({ 
  loading, 
  ...props 
}: Omit<ActionButtonProps, 'loadingText'>) {
  return (
    <ActionButton 
      loading={loading} 
      loadingText="Salvando..." 
      {...props}
    >
      {props.children || "Salvar"}
    </ActionButton>
  );
}

export function DeleteButton({ 
  loading, 
  ...props 
}: Omit<ActionButtonProps, 'loadingText' | 'variant'>) {
  return (
    <ActionButton 
      loading={loading} 
      loadingText="Excluindo..." 
      variant="destructive"
      {...props}
    >
      {props.children || "Excluir"}
    </ActionButton>
  );
}

export function SubmitButton({ 
  loading, 
  ...props 
}: Omit<ActionButtonProps, 'loadingText' | 'type'>) {
  return (
    <ActionButton 
      loading={loading} 
      loadingText="Enviando..." 
      type="submit"
      {...props}
    >
      {props.children || "Enviar"}
    </ActionButton>
  );
}
