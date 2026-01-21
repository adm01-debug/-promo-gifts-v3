/**
 * Volume Indicator
 * Indicador visual de volume utilizado na caixa
 */

import { Box, AlertTriangle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
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

  const statusColors = {
    success: 'text-green-600',
    warning: 'text-yellow-600',
    destructive: 'text-red-600',
  };

  const progressColors = {
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    destructive: 'bg-red-500',
  };

  if (variant === 'compact') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Box className={cn("h-4 w-4", statusColors[status])} />
        <Progress
          value={Math.min(usagePercent, 100)}
          className="h-2 w-20"
          indicatorClassName={progressColors[status]}
        />
        <span className={cn("text-xs font-medium", statusColors[status])}>
          {Math.round(usagePercent)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("card-elevated p-4 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className={cn("h-5 w-5", statusColors[status])} />
          <span className="font-medium">Volume do Kit</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'destructive' ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : status === 'success' ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : null}
          <span className={cn("text-sm font-medium", statusColors[status])}>
            {label}
          </span>
        </div>
      </div>

      <Progress
        value={Math.min(usagePercent, 100)}
        className="h-3"
        indicatorClassName={progressColors[status]}
      />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Usado: <strong className="text-foreground">{formatVolume(usedVolume)}</strong>
        </span>
        <span>
          Disponível: <strong className="text-foreground">{formatVolume(totalVolume - usedVolume)}</strong>
        </span>
        <span>
          <strong className={statusColors[status]}>{Math.round(usagePercent)}%</strong>
        </span>
      </div>

      {usagePercent > 100 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-md p-2 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Volume excede a capacidade da caixa. Remova alguns itens.</span>
        </div>
      )}
    </div>
  );
}
