import { ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";
import { ChevronRight, LucideIcon } from "lucide-react";

interface ActionCardProps extends Omit<HTMLMotionProps<"div">, "title"> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  showArrow?: boolean;
  badge?: ReactNode;
  variant?: "default" | "outline" | "ghost" | "elevated";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

const variantStyles = {
  default: "bg-card border hover:bg-accent/50 hover:border-primary/30",
  outline: "bg-transparent border-2 hover:bg-accent/30 hover:border-primary/50",
  ghost: "bg-transparent hover:bg-accent",
  elevated: "bg-card border shadow-md hover:shadow-lg hover:border-primary/30",
};

const sizeStyles = {
  sm: {
    container: "p-3",
    icon: "w-8 h-8",
    iconInner: "w-4 h-4",
    title: "text-sm",
    description: "text-xs",
    gap: "gap-3",
  },
  md: {
    container: "p-4",
    icon: "w-10 h-10",
    iconInner: "w-5 h-5",
    title: "text-base",
    description: "text-sm",
    gap: "gap-4",
  },
  lg: {
    container: "p-5",
    icon: "w-12 h-12",
    iconInner: "w-6 h-6",
    title: "text-lg",
    description: "text-base",
    gap: "gap-5",
  },
};

export const ActionCard = forwardRef<HTMLDivElement, ActionCardProps>(
  (
    {
      title,
      description,
      icon: Icon,
      iconColor = "text-primary",
      showArrow = true,
      badge,
      variant = "default",
      size = "md",
      disabled = false,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const sizeStyle = sizeStyles[size];

    return (
      <motion.div
        ref={ref}
        whileHover={disabled ? undefined : { scale: 1.01 }}
        whileTap={disabled ? undefined : { scale: 0.99 }}
        className={cn(
          "rounded-xl transition-all duration-200 cursor-pointer",
          variantStyles[variant],
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          sizeStyle.container,
          className
        )}
        onClick={disabled ? undefined : onClick}
        {...props}
      >
        <div className={cn("flex items-center", sizeStyle.gap)}>
          {Icon && (
            <div
              className={cn(
                "rounded-lg flex items-center justify-center shrink-0",
                "bg-primary/10",
                sizeStyle.icon
              )}
            >
              <Icon className={cn(sizeStyle.iconInner, iconColor)} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={cn("font-semibold text-foreground truncate", sizeStyle.title)}>
                {title}
              </h3>
              {badge}
            </div>
            {description && (
              <p className={cn("text-muted-foreground mt-0.5 line-clamp-2", sizeStyle.description)}>
                {description}
              </p>
            )}
          </div>

          {showArrow && (
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
        </div>
      </motion.div>
    );
  }
);

ActionCard.displayName = "ActionCard";

// Quick Action Grid
interface QuickActionsGridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function QuickActionsGrid({ children, columns = 2, className }: QuickActionsGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// Feature Card (for larger feature sections)
interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconBg?: string;
  children?: ReactNode;
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  iconBg = "bg-primary/10",
  children,
  className,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 space-y-4",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("rounded-lg p-3", iconBg)}>
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-foreground">{title}</h3>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
