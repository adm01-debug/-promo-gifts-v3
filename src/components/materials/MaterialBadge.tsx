import React from "react";
import { cn } from "@/lib/utils";

interface MaterialBadgeProps {
  name: string;
  groupName?: string;
  hexCode?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "solid";
  showGroup?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function MaterialBadge({
  name,
  groupName,
  hexCode,
  size = "md",
  variant = "default",
  showGroup = false,
  onClick,
  onRemove,
  className,
}: MaterialBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const variantClasses = {
    default: "bg-muted/50 text-muted-foreground",
    outline: "border border-border bg-transparent text-foreground",
    solid: "bg-primary/10 text-primary",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
        sizeClasses[size],
        variantClasses[variant],
        onClick && "cursor-pointer hover:bg-muted",
        className
      )}
      onClick={onClick}
    >
      {hexCode && (
        <span
          className="w-2.5 h-2.5 rounded-full border border-border/50 flex-shrink-0"
          style={{ backgroundColor: hexCode }}
        />
      )}
      <span className="truncate max-w-[120px]">
        {showGroup && groupName ? `${groupName}: ${name}` : name}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:text-destructive transition-colors"
        >
          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M9 3L3 9M3 3L9 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
