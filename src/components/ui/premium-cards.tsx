import { ReactNode } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ==========================================
// PREMIUM CARD VARIANTS
// ==========================================

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "glass" | "gradient" | "outlined" | "interactive";
  glow?: boolean;
  glowColor?: "primary" | "success" | "warning" | "info";
}

export function PremiumCard({
  children,
  className,
  variant = "default",
  glow = false,
  glowColor = "primary",
}: PremiumCardProps) {
  const baseStyles = "rounded-xl transition-all duration-300";

  const variants = {
    default: "bg-card border shadow-sm",
    elevated: "bg-card-elevated border shadow-lg hover:shadow-xl",
    glass: "bg-background/60 backdrop-blur-xl border border-white/20",
    gradient: "bg-gradient-to-br from-card via-card to-muted/20 border shadow-md",
    outlined: "bg-transparent border-2 hover:bg-muted/30",
    interactive: "bg-card border shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer",
  };

  const glowStyles = {
    primary: "shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]",
    success: "shadow-[0_0_30px_-5px_hsl(var(--success)/0.3)]",
    warning: "shadow-[0_0_30px_-5px_hsl(var(--warning)/0.3)]",
    info: "shadow-[0_0_30px_-5px_hsl(var(--info)/0.3)]",
  };

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        glow && glowStyles[glowColor],
        className
      )}
    >
      {children}
    </div>
  );
}

// Animated Premium Card
interface AnimatedCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}

export function AnimatedCard({
  children,
  className,
  hoverScale = 1.02,
  hoverY = -4,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={{ scale: hoverScale, y: hoverY }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "rounded-xl bg-card border shadow-sm transition-shadow hover:shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Feature Card
interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  iconColor?: string;
  action?: ReactNode;
}

export function FeatureCard({
  icon,
  title,
  description,
  className,
  iconColor = "bg-primary/10 text-primary",
  action,
}: FeatureCardProps) {
  return (
    <div
      className={cn(
        "group p-6 rounded-xl bg-card border",
        "hover:shadow-lg hover:border-primary/30 transition-all duration-300",
        className
      )}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", iconColor)}>
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {description}
      </p>
      {action && <div className="mt-auto">{action}</div>}
    </div>
  );
}

// Stat Card
interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; isPositive: boolean };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-card border",
        "hover:shadow-md transition-all duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        {trend && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              trend.isPositive
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// Info Card
interface InfoCardProps {
  title: string;
  description: string;
  variant?: "default" | "info" | "success" | "warning" | "error";
  icon?: ReactNode;
  className?: string;
}

export function InfoCard({
  title,
  description,
  variant = "default",
  icon,
  className,
}: InfoCardProps) {
  const variants = {
    default: "border-border bg-muted/30",
    info: "border-info/30 bg-info/5",
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    error: "border-destructive/30 bg-destructive/5",
  };

  const iconColors = {
    default: "text-muted-foreground",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    error: "text-destructive",
  };

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl border",
        variants[variant],
        className
      )}
    >
      {icon && (
        <div className={cn("flex-shrink-0", iconColors[variant])}>
          {icon}
        </div>
      )}
      <div>
        <h4 className="font-medium text-sm mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// Action Card
interface ActionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function ActionCard({
  title,
  description,
  icon,
  onClick,
  className,
  disabled = false,
}: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full p-4 rounded-xl border text-left",
        "bg-card hover:bg-muted/50 transition-all duration-200",
        "hover:border-primary/50 hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "group",
        disabled && "opacity-50 cursor-not-allowed hover:bg-card hover:border-border hover:shadow-none",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium group-hover:text-primary transition-colors">
            {title}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground truncate">
              {description}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

// Gradient Border Card
interface GradientBorderCardProps {
  children: ReactNode;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function GradientBorderCard({
  children,
  className,
  gradientFrom = "from-primary",
  gradientTo = "to-primary/50",
}: GradientBorderCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl p-[1px]",
        `bg-gradient-to-br ${gradientFrom} ${gradientTo}`,
        className
      )}
    >
      <div className="rounded-xl bg-card h-full">
        {children}
      </div>
    </div>
  );
}

// Spotlight Card (hover spotlight effect)
interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-card border",
        "before:pointer-events-none before:absolute before:-inset-px before:rounded-xl",
        "before:bg-gradient-to-r before:from-transparent before:via-primary/20 before:to-transparent",
        "before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        className
      )}
    >
      {children}
    </div>
  );
}

// ==========================================
// VISUAL STATES
// ==========================================

interface SkeletonCardProps {
  className?: string;
  hasImage?: boolean;
  lines?: number;
}

export function SkeletonCard({ className, hasImage = true, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-xl bg-card border p-4 animate-pulse", className)}>
      {hasImage && (
        <div className="aspect-video rounded-lg bg-muted mb-4" />
      )}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-3/4" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-muted rounded"
            style={{ width: `${60 + Math.random() * 30}%` }}
          />
        ))}
      </div>
    </div>
  );
}
