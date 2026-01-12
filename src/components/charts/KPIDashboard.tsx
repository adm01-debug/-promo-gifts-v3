import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Sparkline } from "./InteractiveCharts";

// KPI Status Types
type KPIStatus = "on_track" | "at_risk" | "off_track" | "achieved";

interface KPIStatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

const KPI_STATUS_CONFIG: Record<KPIStatus, KPIStatusConfig> = {
  on_track: {
    label: "No Caminho",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
  },
  at_risk: {
    label: "Em Risco",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10",
    icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  },
  off_track: {
    label: "Fora do Alvo",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
  },
  achieved: {
    label: "Alcançado",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    icon: <Target className="h-4 w-4 text-blue-500" />,
  },
};

// Single KPI Card
interface KPICardProps {
  title: string;
  value: string | number;
  target?: number;
  current?: number;
  unit?: string;
  change?: { value: number; period: string };
  status?: KPIStatus;
  sparklineData?: number[];
  description?: string;
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  target,
  current,
  unit = "",
  change,
  status,
  sparklineData,
  description,
  onClick,
}: KPICardProps) {
  const progress = target && current ? (current / target) * 100 : null;
  const statusConfig = status ? KPI_STATUS_CONFIG[status] : null;
  const isPositiveChange = change && change.value > 0;
  const isNegativeChange = change && change.value < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-card border border-border rounded-xl p-5 transition-all cursor-pointer",
        "hover:shadow-lg hover:border-primary/30"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {description && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-sm">{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {statusConfig && (
          <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full", statusConfig.bgColor)}>
            {statusConfig.icon}
            <span className={cn("text-xs font-medium", statusConfig.color)}>
              {statusConfig.label}
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{value}</span>
            {unit && <span className="text-lg text-muted-foreground">{unit}</span>}
          </div>
          
          {/* Change Indicator */}
          {change && (
            <div className="flex items-center gap-1 mt-1">
              {isPositiveChange ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : isNegativeChange ? (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  isPositiveChange
                    ? "text-green-500"
                    : isNegativeChange
                    ? "text-red-500"
                    : "text-muted-foreground"
                )}
              >
                {isPositiveChange ? "+" : ""}{change.value}%
              </span>
              <span className="text-xs text-muted-foreground">
                vs {change.period}
              </span>
            </div>
          )}
        </div>

        {sparklineData && (
          <Sparkline
            data={sparklineData}
            color={
              isPositiveChange
                ? "hsl(142, 76%, 36%)"
                : isNegativeChange
                ? "hsl(0, 84%, 60%)"
                : "hsl(var(--primary))"
            }
          />
        )}
      </div>

      {/* Progress Bar */}
      {progress !== null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="text-foreground font-medium">
              {current?.toLocaleString()} / {target?.toLocaleString()} {unit}
            </span>
          </div>
          <Progress
            value={Math.min(progress, 100)}
            className="h-2"
          />
        </div>
      )}
    </motion.div>
  );
}

// KPI Group
interface KPIGroupProps {
  title: string;
  kpis: KPICardProps[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function KPIGroup({
  title,
  kpis,
  collapsible = false,
  defaultOpen = true,
}: KPIGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const content = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => (
        <KPICard key={index} {...kpi} />
      ))}
    </div>
  );

  if (!collapsible) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {content}
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
        >
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Goal Progress Card
interface GoalProgressProps {
  title: string;
  currentValue: number;
  targetValue: number;
  unit?: string;
  deadline?: string;
  milestones?: { value: number; label: string; achieved: boolean }[];
}

export function GoalProgress({
  title,
  currentValue,
  targetValue,
  unit = "",
  deadline,
  milestones = [],
}: GoalProgressProps) {
  const progress = (currentValue / targetValue) * 100;
  const isAchieved = currentValue >= targetValue;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-base font-semibold text-foreground">{title}</h4>
          {deadline && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Meta: {deadline}
              </span>
            </div>
          )}
        </div>
        <Badge variant={isAchieved ? "default" : "secondary"}>
          {isAchieved ? "Alcançado" : `${progress.toFixed(0)}%`}
        </Badge>
      </div>

      {/* Main Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {currentValue.toLocaleString()} {unit}
          </span>
          <span className="text-foreground font-medium">
            {targetValue.toLocaleString()} {unit}
          </span>
        </div>
        <div className="relative">
          <Progress value={Math.min(progress, 100)} className="h-3" />
          
          {/* Milestones */}
          {milestones.map((milestone, index) => {
            const position = (milestone.value / targetValue) * 100;
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background",
                        milestone.achieved
                          ? "bg-primary"
                          : "bg-muted-foreground"
                      )}
                      style={{ left: `${position}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">{milestone.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.value.toLocaleString()} {unit}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Comparison Table
interface ComparisonItem {
  label: string;
  current: number;
  previous: number;
  target?: number;
  unit?: string;
}

interface ComparisonTableProps {
  title: string;
  items: ComparisonItem[];
  periodLabel?: string;
  previousPeriodLabel?: string;
}

export function ComparisonTable({
  title,
  items,
  periodLabel = "Atual",
  previousPeriodLabel = "Anterior",
}: ComparisonTableProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h4 className="text-base font-semibold text-foreground mb-4">{title}</h4>
      
      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
          <span>Métrica</span>
          <span className="text-right">{previousPeriodLabel}</span>
          <span className="text-right">{periodLabel}</span>
          <span className="text-right">Variação</span>
        </div>

        {/* Items */}
        {items.map((item, index) => {
          const change = ((item.current - item.previous) / item.previous) * 100;
          const isPositive = change > 0;
          const isNegative = change < 0;

          return (
            <div
              key={index}
              className="grid grid-cols-4 gap-2 py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-foreground">{item.label}</span>
              <span className="text-sm text-muted-foreground text-right">
                {item.previous.toLocaleString()} {item.unit}
              </span>
              <span className="text-sm text-foreground font-medium text-right">
                {item.current.toLocaleString()} {item.unit}
              </span>
              <div className="flex items-center justify-end gap-1">
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ) : isNegative ? (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPositive
                      ? "text-green-500"
                      : isNegative
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {isPositive ? "+" : ""}{change.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Dashboard Grid Container
interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
}

export function DashboardGrid({
  children,
  columns = 4,
  gap = "md",
}: DashboardGridProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  const gapClasses = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
  };

  return (
    <div className={cn("grid", columnClasses[columns], gapClasses[gap])}>
      {children}
    </div>
  );
}
