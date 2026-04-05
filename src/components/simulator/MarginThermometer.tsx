// src/components/simulator/MarginThermometer.tsx
// Gráfico visual de margem estilo termômetro

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { formatCurrency } from "@/hooks/useSimulation";

interface MarginThermometerProps {
  costPerUnit: number;
  sellingPrice: number;
  targetMargin?: number;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function MarginThermometer({
  costPerUnit,
  sellingPrice,
  targetMargin = 30,
  showLabels = true,
  size = 'md',
}: MarginThermometerProps) {
  const calculations = useMemo(() => {
    if (costPerUnit <= 0 || sellingPrice <= 0) {
      return { margin: 0, profit: 0, status: 'neutral' as const };
    }

    const profit = sellingPrice - costPerUnit;
    const margin = (profit / sellingPrice) * 100;

    let status: 'danger' | 'warning' | 'good' | 'excellent' | 'neutral';
    if (margin < 10) status = 'danger';
    else if (margin < 20) status = 'warning';
    else if (margin < 35) status = 'good';
    else status = 'excellent';

    return { margin, profit, status };
  }, [costPerUnit, sellingPrice]);

  const { margin, profit, status } = calculations;

  // Map margin (0-70%) to thermometer height (0-100%)
  const thermometerHeight = Math.min(Math.max(margin / 70 * 100, 0), 100);
  const targetHeight = Math.min(targetMargin / 70 * 100, 100);

  const colors = {
    danger: { bg: 'from-destructive to-destructive', text: 'text-destructive', icon: AlertTriangle },
    warning: { bg: 'from-warning to-orange', text: 'text-warning', icon: TrendingUp },
    good: { bg: 'from-emerald-500 to-green-500', text: 'text-primary', icon: CheckCircle },
    excellent: { bg: 'from-emerald-400 to-cyan-500', text: 'text-primary', icon: Sparkles },
    neutral: { bg: 'from-gray-400 to-gray-500', text: 'text-gray-400', icon: Target },
  };

  const currentColor = colors[status];
  const StatusIcon = currentColor.icon;

  const heights = {
    sm: 'h-24',
    md: 'h-36',
    lg: 'h-48',
  };

  const widths = {
    sm: 'w-8',
    md: 'w-12',
    lg: 'w-16',
  };

  return (
    <div className="flex items-end gap-4">
      {/* Thermometer */}
      <div className="relative">
        {/* Container */}
        <div className={cn(
          "relative rounded-full bg-muted/50 border-2 border-border overflow-hidden",
          heights[size],
          widths[size]
        )}>
          {/* Fill */}
          <motion.div
            className={cn(
              "absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t",
              currentColor.bg
            )}
            initial={{ height: 0 }}
            animate={{ height: `${thermometerHeight}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />

          {/* Target line */}
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-primary/80"
            style={{ bottom: `${targetHeight}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="absolute -right-6 -top-2 text-[10px] font-medium text-primary">
              {targetMargin}%
            </div>
          </motion.div>

          {/* Glow effect */}
          <motion.div
            className={cn(
              "absolute bottom-0 left-0 right-0 opacity-50 blur-sm bg-gradient-to-t",
              currentColor.bg
            )}
            initial={{ height: 0 }}
            animate={{ height: `${thermometerHeight}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          />
        </div>

        {/* Scale markers */}
        <div className="absolute -left-3 top-0 bottom-0 flex flex-col justify-between text-[9px] text-muted-foreground">
          <span>70%</span>
          <span>35%</span>
          <span>0%</span>
        </div>
      </div>

      {/* Labels */}
      {showLabels && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", currentColor.text)} />
            <div>
              <p className={cn("text-2xl font-bold", currentColor.text)}>
                {margin.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">margem</p>
            </div>
          </div>

          <div>
            <p className={cn(
              "text-lg font-semibold",
              profit >= 0 ? "text-success" : "text-destructive"
            )}>
              {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
            </p>
            <p className="text-xs text-muted-foreground">lucro/un</p>
          </div>

          <div className="pt-2 border-t border-border/50">
            <StatusBadge status={status} margin={margin} targetMargin={targetMargin} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function StatusBadge({ 
  status, 
  margin, 
  targetMargin 
}: { 
  status: 'danger' | 'warning' | 'good' | 'excellent' | 'neutral';
  margin: number;
  targetMargin: number;
}) {
  const messages = {
    danger: "Margem crítica! Reavalie o preço.",
    warning: "Margem baixa. Considere ajustar.",
    good: margin >= targetMargin ? "Meta atingida! ✓" : `Faltam ${(targetMargin - margin).toFixed(1)}% para a meta`,
    excellent: "Margem excelente! 🎉",
    neutral: "Defina o preço de venda",
  };

  const styles = {
    danger: "bg-red-500/10 text-red-500 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    good: "bg-primary/10 text-primary border-primary/20",
    excellent: "bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-primary border-primary/20",
    neutral: "bg-muted text-muted-foreground border-border",
  };

  return (
    <motion.div
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium border",
        styles[status]
      )}
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      key={status}
    >
      {messages[status]}
    </motion.div>
  );
}

// Compact version for inline use
export function MarginIndicator({
  margin,
  compact = false,
}: {
  margin: number;
  compact?: boolean;
}) {
  let status: 'danger' | 'warning' | 'good' | 'excellent';
  if (margin < 10) status = 'danger';
  else if (margin < 20) status = 'warning';
  else if (margin < 35) status = 'good';
  else status = 'excellent';

  const colors = {
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    good: 'bg-primary',
    excellent: 'bg-primary',
  };

  const width = Math.min(Math.max(margin, 0), 70) / 70 * 100;

  if (compact) {
    return (
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colors[status])}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colors[status])}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className={cn(
        "text-sm font-semibold",
        status === 'danger' && 'text-red-500',
        status === 'warning' && 'text-amber-500',
        status === 'good' && 'text-primary',
        status === 'excellent' && 'text-primary',
      )}>
        {margin.toFixed(0)}%
      </span>
    </div>
  );
}
