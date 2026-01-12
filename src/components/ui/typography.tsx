import { cn } from "@/lib/utils";
import { ReactNode } from "react";

// ==========================================
// TYPOGRAPHY COMPONENTS
// ==========================================

interface HeadingProps {
  children: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function DisplayHeading({ children, className, as: Tag = "h1" }: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display font-bold tracking-tight",
        "text-4xl sm:text-5xl lg:text-6xl",
        "bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function PageHeading({ children, className, as: Tag = "h1" }: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display font-bold tracking-tight",
        "text-2xl sm:text-3xl lg:text-4xl",
        "text-foreground",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({ children, className, as: Tag = "h2" }: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-display font-semibold tracking-tight",
        "text-xl sm:text-2xl",
        "text-foreground",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeading({ children, className, as: Tag = "h3" }: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-semibold",
        "text-base sm:text-lg",
        "text-foreground",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function Subheading({ children, className, as: Tag = "h4" }: HeadingProps) {
  return (
    <Tag
      className={cn(
        "font-medium",
        "text-sm sm:text-base",
        "text-muted-foreground",
        className
      )}
    >
      {children}
    </Tag>
  );
}

interface TextProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "muted" | "small" | "large" | "lead";
}

export function Text({ children, className, variant = "default" }: TextProps) {
  const variants = {
    default: "text-base text-foreground",
    muted: "text-base text-muted-foreground",
    small: "text-sm text-muted-foreground",
    large: "text-lg text-foreground",
    lead: "text-xl text-muted-foreground leading-relaxed",
  };

  return (
    <p className={cn(variants[variant], className)}>
      {children}
    </p>
  );
}

export function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {children}
    </span>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-sm font-medium text-foreground", className)}>
      {children}
    </span>
  );
}

// ==========================================
// SPACING COMPONENTS
// ==========================================

interface SpacerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

const spacerSizes = {
  xs: "h-2",
  sm: "h-4",
  md: "h-6",
  lg: "h-8",
  xl: "h-12",
  "2xl": "h-16",
};

export function Spacer({ size = "md", className }: SpacerProps) {
  return <div className={cn(spacerSizes[size], className)} aria-hidden="true" />;
}

interface DividerProps {
  className?: string;
  variant?: "default" | "subtle" | "gradient";
  spacing?: "sm" | "md" | "lg";
}

export function Divider({ className, variant = "default", spacing = "md" }: DividerProps) {
  const variants = {
    default: "bg-border",
    subtle: "bg-border/50",
    gradient: "bg-gradient-to-r from-transparent via-border to-transparent",
  };

  const spacings = {
    sm: "my-2",
    md: "my-4",
    lg: "my-8",
  };

  return (
    <hr
      className={cn(
        "h-px border-0",
        variants[variant],
        spacings[spacing],
        className
      )}
    />
  );
}

// ==========================================
// CONTAINER COMPONENTS
// ==========================================

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const containerSizes = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export function Container({ children, className, size = "xl" }: ContainerProps) {
  return (
    <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", containerSizes[size], className)}>
      {children}
    </div>
  );
}

interface SectionProps {
  children: ReactNode;
  className?: string;
  spacing?: "sm" | "md" | "lg" | "xl";
}

const sectionSpacings = {
  sm: "py-8",
  md: "py-12",
  lg: "py-16",
  xl: "py-24",
};

export function Section({ children, className, spacing = "md" }: SectionProps) {
  return (
    <section className={cn(sectionSpacings[spacing], className)}>
      {children}
    </section>
  );
}

// ==========================================
// GRID COMPONENTS
// ==========================================

interface GridProps {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: "sm" | "md" | "lg";
}

export function Grid({ children, className, cols = 3, gap = "md" }: GridProps) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
  };

  return (
    <div className={cn("grid", colClasses[cols], gapClasses[gap], className)}>
      {children}
    </div>
  );
}

interface StackProps {
  children: ReactNode;
  className?: string;
  gap?: "xs" | "sm" | "md" | "lg";
  direction?: "vertical" | "horizontal";
  align?: "start" | "center" | "end" | "stretch";
}

export function Stack({
  children,
  className,
  gap = "md",
  direction = "vertical",
  align = "stretch",
}: StackProps) {
  const gapClasses = {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  return (
    <div
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row",
        gapClasses[gap],
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}

// ==========================================
// VISUAL HIERARCHY UTILITIES
// ==========================================

interface HighlightProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "success" | "warning" | "info";
}

export function Highlight({ children, className, variant = "primary" }: HighlightProps) {
  const variants = {
    primary: "text-primary",
    secondary: "text-secondary-foreground",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  };

  return (
    <span className={cn("font-semibold", variants[variant], className)}>
      {children}
    </span>
  );
}

interface ProseProps {
  children: ReactNode;
  className?: string;
}

export function Prose({ children, className }: ProseProps) {
  return (
    <div
      className={cn(
        "prose prose-sm sm:prose-base dark:prose-invert",
        "prose-headings:font-display prose-headings:font-semibold",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-strong:font-semibold",
        "max-w-none",
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

interface EmptyStateContainerProps {
  children: ReactNode;
  className?: string;
}

export function EmptyStateContainer({ children, className }: EmptyStateContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-12 px-6",
        "rounded-xl border border-dashed border-border bg-muted/30",
        className
      )}
    >
      {children}
    </div>
  );
}

interface LoadingContainerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingContainer({ className, size = "md" }: LoadingContainerProps) {
  const sizes = {
    sm: "h-32",
    md: "h-48",
    lg: "h-64",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        sizes[size],
        className
      )}
    >
      <div className="animate-pulse flex flex-col items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/20" />
        <div className="w-24 h-2 rounded-full bg-muted" />
      </div>
    </div>
  );
}
