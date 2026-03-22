import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryStats } from './types';
import { IMAGE_TYPES } from './types';

interface Props {
  stats: GalleryStats;
}

export function ImageStatsBar({ stats }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground px-1 py-1.5 rounded-lg bg-muted/20 border border-border/30">
      <span className="font-medium text-foreground/70">{stats.total} no BD externo</span>
      <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{stats.withAlt} com alt text</span>
      {stats.withoutVariant > 0 && <span>{stats.withoutVariant} gerais (sem cor)</span>}
      {Array.from(stats.byType.entries()).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
        const info = IMAGE_TYPES.find(t => t.value === type);
        return (
          <span key={type} className="flex items-center gap-1">
            {info && <info.icon className={cn("h-2.5 w-2.5", info.color)} />}
            {info?.label || type}: {count}
          </span>
        );
      })}
    </div>
  );
}
