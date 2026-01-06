import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ChevronLeft, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  backHref?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  variant?: "default" | "compact" | "hero";
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  backHref,
  backLabel = "Voltar",
  onBack,
  actions,
  badge,
  className,
  variant = "default",
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      navigate(backHref);
    } else {
      navigate(-1);
    }
  };

  const showBack = backHref || onBack;

  const variantStyles = {
    default: {
      container: "py-6",
      title: "text-2xl lg:text-3xl",
      description: "text-base",
    },
    compact: {
      container: "py-4",
      title: "text-xl lg:text-2xl",
      description: "text-sm",
    },
    hero: {
      container: "py-8 lg:py-12",
      title: "text-3xl lg:text-4xl",
      description: "text-lg",
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col gap-4",
        styles.container,
        className
      )}
    >
      {/* Back button */}
      {showBack && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {backLabel}
          </Button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className={cn("font-display font-bold text-foreground", styles.title)}>
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className={cn("text-muted-foreground", styles.description)}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Section Header for within-page sections
interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  divider?: boolean;
}

export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  badge,
  className,
  divider = false,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
        divider && "pb-4 border-b",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg text-foreground">{title}</h2>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

// Card Header for consistent card headers
interface CardHeaderBlockProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}

export function CardHeaderBlock({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: CardHeaderBlockProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-base text-foreground">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}
