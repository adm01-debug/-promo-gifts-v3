import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  color?: "primary" | "success" | "warning" | "destructive";
  className?: string;
  animate?: boolean;
}

const colorClasses = {
  primary: "stroke-primary",
  success: "stroke-success",
  warning: "stroke-warning",
  destructive: "stroke-destructive",
};

const colorGlowClasses = {
  primary: "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]",
  success: "drop-shadow-[0_0_6px_hsl(var(--success)/0.5)]",
  warning: "drop-shadow-[0_0_6px_hsl(var(--warning)/0.5)]",
  destructive: "drop-shadow-[0_0_6px_hsl(var(--destructive)/0.5)]",
};

/**
 * ProgressRing - Componente de progresso circular
 * 
 * @example
 * <ProgressRing value={75} size={80} showValue />
 * <ProgressRing value={50} color="success" label="Meta" />
 */
export function ProgressRing({
  value,
  size = 60,
  strokeWidth = 4,
  showValue = false,
  label,
  color = "primary",
  className,
  animate = true,
}: ProgressRingProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className={cn("-rotate-90", colorGlowClasses[color])}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-muted"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className={cn(colorClasses[color], "transition-all duration-300")}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>

      {/* Center content */}
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <motion.span
              initial={animate ? { opacity: 0 } : { opacity: 1 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="text-sm font-bold text-foreground"
            >
              {Math.round(normalizedValue)}%
            </motion.span>
          )}
          {label && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * ProgressRingWithLabel - Progress ring com label externo
 */
export function ProgressRingWithLabel({
  value,
  label,
  description,
  size = 80,
  color = "primary",
}: {
  value: number;
  label: string;
  description?: string;
  size?: number;
  color?: "primary" | "success" | "warning" | "destructive";
}) {
  return (
    <div className="flex items-center gap-4">
      <ProgressRing value={value} size={size} showValue color={color} />
      <div>
        <p className="font-semibold text-foreground">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * MiniProgressRing - Versão compacta para uso inline
 */
export function MiniProgressRing({
  value,
  color = "primary",
}: {
  value: number;
  color?: "primary" | "success" | "warning" | "destructive";
}) {
  return (
    <ProgressRing
      value={value}
      size={24}
      strokeWidth={3}
      color={color}
      animate={false}
    />
  );
}

export default ProgressRing;
