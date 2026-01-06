import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// Data List for vertical key-value pairs
interface DataListProps {
  children: ReactNode;
  className?: string;
  dividers?: boolean;
}

export function DataList({ children, className, dividers = true }: DataListProps) {
  return (
    <dl
      className={cn(
        "space-y-0",
        dividers && "[&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:pb-3 [&>*:not(:first-child)]:pt-3",
        className
      )}
    >
      {children}
    </dl>
  );
}

interface DataListItemProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function DataListItem({ label, value, icon: Icon, className }: DataListItemProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <dt className="flex items-center gap-2 text-muted-foreground text-sm shrink-0">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </dt>
      <dd className="text-right text-foreground font-medium text-sm">{value}</dd>
    </div>
  );
}

// Key-Value Pair (inline)
interface KeyValuePairProps {
  label: string;
  value: ReactNode;
  variant?: "default" | "muted" | "primary";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function KeyValuePair({
  label,
  value,
  variant = "default",
  size = "md",
  className,
}: KeyValuePairProps) {
  const sizeStyles = {
    sm: { label: "text-xs", value: "text-sm" },
    md: { label: "text-sm", value: "text-base" },
    lg: { label: "text-base", value: "text-lg" },
  };

  const variantStyles = {
    default: { label: "text-muted-foreground", value: "text-foreground" },
    muted: { label: "text-muted-foreground", value: "text-muted-foreground" },
    primary: { label: "text-muted-foreground", value: "text-primary" },
  };

  const styles = sizeStyles[size];
  const colors = variantStyles[variant];

  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn(styles.label, colors.label)}>{label}</p>
      <p className={cn("font-medium", styles.value, colors.value)}>{value}</p>
    </div>
  );
}

// Info Grid for displaying multiple pieces of information
interface InfoGridProps {
  items: {
    label: string;
    value: ReactNode;
    icon?: LucideIcon;
  }[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function InfoGrid({ items, columns = 2, className }: InfoGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {items.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center gap-1.5">
            {item.icon && (
              <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
          <p className="font-medium text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// Metric Display for prominent numbers
interface MetricDisplayProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function MetricDisplay({
  label,
  value,
  unit,
  trend,
  size = "md",
  className,
}: MetricDisplayProps) {
  const sizeStyles = {
    sm: { label: "text-xs", value: "text-xl", unit: "text-sm" },
    md: { label: "text-sm", value: "text-2xl", unit: "text-base" },
    lg: { label: "text-base", value: "text-3xl", unit: "text-lg" },
    xl: { label: "text-lg", value: "text-4xl", unit: "text-xl" },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn("text-muted-foreground", styles.label)}>{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={cn("font-bold text-foreground", styles.value)}>
          {value}
        </span>
        {unit && (
          <span className={cn("text-muted-foreground font-medium", styles.unit)}>
            {unit}
          </span>
        )}
        {trend && (
          <span
            className={cn(
              "text-sm font-medium ml-2",
              trend.isPositive ?? trend.value > 0
                ? "text-success"
                : "text-destructive"
            )}
          >
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

// Table-like display
interface TableDisplayProps {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
}

export function TableDisplay({ headers, rows, className }: TableDisplayProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {headers.map((header, index) => (
              <th
                key={index}
                className="text-left font-medium text-muted-foreground py-2 px-3 first:pl-0 last:pr-0"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b last:border-0">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="py-3 px-3 first:pl-0 last:pr-0 text-foreground"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
