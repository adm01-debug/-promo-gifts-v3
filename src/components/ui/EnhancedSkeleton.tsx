import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circular" | "text" | "card" | "avatar" | "button" | "image";
  width?: string | number;
  height?: string | number;
  lines?: number;
  animated?: boolean;
}

export function EnhancedSkeleton({
  className,
  variant = "default",
  width,
  height,
  lines = 1,
  animated = true,
  ...props
}: SkeletonProps) {
  const baseStyles = cn(
    "bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:200%_100%]",
    animated && "animate-shimmer",
    className
  );

  const variantStyles = {
    default: "rounded-md",
    circular: "rounded-full",
    text: "rounded h-4",
    card: "rounded-xl",
    avatar: "rounded-full w-10 h-10",
    button: "rounded-lg h-10",
    image: "rounded-lg aspect-video",
  };

  const style = {
    width: width,
    height: height,
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseStyles, variantStyles.text)}
            style={{ width: i === lines - 1 ? "75%" : "100%" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(baseStyles, variantStyles[variant])}
      style={style}
      {...props}
    />
  );
}

// Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 rounded-xl bg-card border border-border space-y-4", className)}>
      <div className="flex items-center gap-4">
        <EnhancedSkeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <EnhancedSkeleton variant="text" width="60%" />
          <EnhancedSkeleton variant="text" width="40%" />
        </div>
      </div>
      <EnhancedSkeleton variant="text" lines={3} />
      <div className="flex gap-2">
        <EnhancedSkeleton variant="button" width={80} />
        <EnhancedSkeleton variant="button" width={80} />
      </div>
    </div>
  );
}

// Table Skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 4,
  className 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/30 rounded-t-lg">
        {Array.from({ length: columns }).map((_, i) => (
          <EnhancedSkeleton key={i} variant="text" className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <EnhancedSkeleton 
              key={colIndex} 
              variant="text" 
              className="flex-1"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Product Card Skeleton
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl bg-card border border-border overflow-hidden", className)}>
      <EnhancedSkeleton variant="image" className="w-full h-48" />
      <div className="p-4 space-y-3">
        <EnhancedSkeleton variant="text" width="80%" />
        <EnhancedSkeleton variant="text" width="50%" />
        <div className="flex items-center justify-between pt-2">
          <EnhancedSkeleton width={60} height={24} className="rounded" />
          <EnhancedSkeleton variant="button" width={100} height={36} />
        </div>
      </div>
    </div>
  );
}

// List Item Skeleton
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b border-border", className)}>
      <EnhancedSkeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <EnhancedSkeleton variant="text" width="70%" />
        <EnhancedSkeleton variant="text" width="50%" />
      </div>
      <EnhancedSkeleton width={80} height={32} className="rounded-lg" />
    </div>
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("p-6 rounded-xl bg-card border border-border space-y-4", className)}>
      <div className="flex items-center justify-between">
        <EnhancedSkeleton variant="circular" width={40} height={40} />
        <EnhancedSkeleton width={60} height={20} className="rounded" />
      </div>
      <EnhancedSkeleton width="40%" height={32} className="rounded" />
      <EnhancedSkeleton variant="text" width="60%" />
    </div>
  );
}

// Form Skeleton
export function FormSkeleton({ 
  fields = 3,
  className 
}: { 
  fields?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <EnhancedSkeleton width={100} height={16} className="rounded" />
          <EnhancedSkeleton height={40} className="rounded-lg w-full" />
        </div>
      ))}
      <EnhancedSkeleton variant="button" width="100%" height={44} />
    </div>
  );
}
