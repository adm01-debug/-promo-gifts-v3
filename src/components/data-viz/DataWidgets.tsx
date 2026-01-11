import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sparkline - Mini inline chart for trends
 */
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "hsl(var(--primary))",
  showArea = true,
  className,
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length < 2) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });

    const linePath = points
      .map((point, i) => (i === 0 ? `M ${point.x},${point.y}` : `L ${point.x},${point.y}`))
      .join(" ");

    const areaPath = showArea
      ? `${linePath} L ${width},${height} L 0,${height} Z`
      : "";

    return { linePath, areaPath };
  }, [data, width, height, showArea]);

  if (data.length < 2) return null;

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      {showArea && (
        <motion.path
          d={path.areaPath}
          fill={color}
          fillOpacity={0.1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
      <motion.path
        d={path.linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </svg>
  );
}

/**
 * Progress Ring - Circular progress indicator
 */
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export function ProgressRing({
  progress,
  size = 64,
  strokeWidth = 4,
  color = "hsl(var(--primary))",
  bgColor = "hsl(var(--muted))",
  showValue = true,
  label,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold">{Math.round(progress)}%</span>
          {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Trend Indicator - Shows direction and percentage change
 */
interface TrendIndicatorProps {
  value: number; // percentage change
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TrendIndicator({
  value,
  showValue = true,
  size = "md",
  className,
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  const sizes = {
    sm: { icon: "h-3 w-3", text: "text-xs" },
    md: { icon: "h-4 w-4", text: "text-sm" },
    lg: { icon: "h-5 w-5", text: "text-base" },
  };

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        isPositive && "text-success",
        isNegative && "text-destructive",
        isNeutral && "text-muted-foreground",
        className
      )}
    >
      <Icon className={sizes[size].icon} />
      {showValue && (
        <span className={sizes[size].text}>
          {isPositive && "+"}
          {value.toFixed(1)}%
        </span>
      )}
    </motion.div>
  );
}

/**
 * Mini Bar Chart - Compact bar visualization
 */
interface MiniBarChartProps {
  data: { value: number; label?: string }[];
  height?: number;
  barWidth?: number;
  gap?: number;
  color?: string;
  className?: string;
}

export function MiniBarChart({
  data,
  height = 32,
  barWidth = 8,
  gap = 2,
  color = "hsl(var(--primary))",
  className,
}: MiniBarChartProps) {
  const max = Math.max(...data.map((d) => d.value));
  const width = data.length * (barWidth + gap) - gap;

  return (
    <svg width={width} height={height} className={className}>
      {data.map((item, index) => {
        const barHeight = (item.value / max) * height;
        return (
          <motion.rect
            key={index}
            x={index * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            fill={color}
            rx={2}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            style={{ transformOrigin: "bottom" }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Stat Card - Compact statistic display with trend
 */
interface StatCardProps {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  sparklineData?: number[];
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  trend,
  trendLabel,
  sparklineData,
  icon,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-lg border bg-card",
        "hover:shadow-md transition-shadow",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              <TrendIndicator value={trend} size="sm" />
              {trendLabel && (
                <span className="text-xs text-muted-foreground">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {icon && (
            <div className="p-2 rounded-lg bg-muted">
              {icon}
            </div>
          )}
          {sparklineData && sparklineData.length > 0 && (
            <Sparkline data={sparklineData} width={60} height={20} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Comparison Bar - Side by side comparison
 */
interface ComparisonBarProps {
  leftValue: number;
  rightValue: number;
  leftLabel?: string;
  rightLabel?: string;
  leftColor?: string;
  rightColor?: string;
  className?: string;
}

export function ComparisonBar({
  leftValue,
  rightValue,
  leftLabel,
  rightLabel,
  leftColor = "hsl(var(--primary))",
  rightColor = "hsl(var(--secondary))",
  className,
}: ComparisonBarProps) {
  const total = leftValue + rightValue;
  const leftPercent = total > 0 ? (leftValue / total) * 100 : 50;
  const rightPercent = total > 0 ? (rightValue / total) * 100 : 50;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: leftColor }} />
          {leftLabel && <span className="text-muted-foreground">{leftLabel}</span>}
          <span className="font-medium">{leftValue}</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{rightValue}</span>
          {rightLabel && <span className="text-muted-foreground">{rightLabel}</span>}
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rightColor }} />
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        <motion.div
          className="h-full"
          style={{ backgroundColor: leftColor }}
          initial={{ width: 0 }}
          animate={{ width: `${leftPercent}%` }}
          transition={{ duration: 0.5 }}
        />
        <motion.div
          className="h-full"
          style={{ backgroundColor: rightColor }}
          initial={{ width: 0 }}
          animate={{ width: `${rightPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
