import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: {
    container: "py-6 px-3",
    iconWrapper: "p-3 mb-3",
    icon: "w-8 h-8",
    title: "text-base font-medium mb-1",
    description: "text-xs mb-4",
  },
  md: {
    container: "py-12 px-4",
    iconWrapper: "p-6 mb-4",
    icon: "w-12 h-12",
    title: "text-lg font-semibold mb-2",
    description: "text-sm mb-6",
  },
  lg: {
    container: "py-16 px-6",
    iconWrapper: "p-8 mb-6",
    icon: "w-16 h-16",
    title: "text-xl font-bold mb-3",
    description: "text-base mb-8",
  },
};

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  secondaryAction,
  className,
  size = "md" 
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      styles.container,
      className
    )}>
      <div className={cn(
        "rounded-full bg-muted",
        styles.iconWrapper
      )}>
        <Icon className={cn("text-muted-foreground", styles.icon)} />
      </div>
      <h3 className={cn("text-foreground", styles.title)}>{title}</h3>
      <p className={cn("text-muted-foreground max-w-md", styles.description)}>{description}</p>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button 
              onClick={action.onClick}
              variant={action.variant || "default"}
              size={size === "sm" ? "sm" : "default"}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="ghost" 
              onClick={secondaryAction.onClick}
              size={size === "sm" ? "sm" : "default"}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Versão inline para uso em tabelas/listas
interface EmptyStateInlineProps {
  icon: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyStateInline({ 
  icon: Icon, 
  message, 
  action,
  className 
}: EmptyStateInlineProps) {
  return (
    <div className={cn(
      "flex items-center justify-center gap-3 py-4 text-muted-foreground",
      className
    )}>
      <Icon className="w-5 h-5" />
      <span className="text-sm">{message}</span>
      {action && (
        <Button variant="link" size="sm" onClick={action.onClick} className="p-0 h-auto">
          {action.label}
        </Button>
      )}
    </div>
  );
}
