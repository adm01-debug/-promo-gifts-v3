/**
 * Volume Indicator
 * Indicador visual de volume utilizado na caixa
 * Padronizado com tokens semânticos do Design System
 */

import { Box, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  formatVolume,
  getVolumeStatusColor,
  getVolumeStatusLabel,
} from '@/lib/kit-builder';

interface VolumeIndicatorProps {
  usedVolume: number;
  totalVolume: number;
  usagePercent: number;
  className?: string;
  variant?: 'default' | 'compact';
}

export function VolumeIndicator({
  usedVolume,
  totalVolume,
  usagePercent,
  className,
  variant = 'default',
}: VolumeIndicatorProps) {
  const status = getVolumeStatusColor(usagePercent);
  const label = getVolumeStatusLabel(usagePercent);

  const statusTextColors = {
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  const progressBgColors = {
    success: 'bg-success',
    warning: 'bg-warning',
    destructive: 'bg-destructive',
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Box className={cn("h-4 w-4", statusTextColors[status])} />
        <div className="relative h-2 w-20 overflow-hidden rounded-full bg-secondary">
          <motion.div
            className={cn("h-full rounded-full", progressBgColors[status])}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usagePercent, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <span className={cn("text-xs font-medium tabular-nums", statusTextColors[status])}>
          {Math.round(usagePercent)}%
        </span>
      </div>
    );
  }

  return (
    <Card className={cn("transition-colors", className)}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs flex items-center gap-1.5">
            <Box className={cn("h-4 w-4", statusTextColors[status])} />
            <span>Volume do Kit</span>
          </h3>
          <div className="flex items-center gap-1.5">
            {status === 'destructive' ? (
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            ) : status === 'success' ? (
              <CheckCircle className="h-3.5 w-3.5 text-success" />
            ) : null}
            <span className={cn("text-[10px] font-medium", statusTextColors[status])}>
              {label}
            </span>
          </div>
        </div>

        {/* Animated progress bar */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className={cn("h-full rounded-full", progressBgColors[status])}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usagePercent, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            Usado: <strong className="text-foreground tabular-nums">{formatVolume(usedVolume)}</strong>
          </span>
          <span>
            Disp: <strong className="text-foreground tabular-nums">{formatVolume(totalVolume - usedVolume)}</strong>
          </span>
          <span>
            <strong className={cn("tabular-nums", statusTextColors[status])}>{Math.round(usagePercent)}%</strong>
          </span>
        </div>

        {usagePercent > 100 && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 text-[10px] text-destructive flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
            <span>Volume excede a capacidade. Remova itens.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
