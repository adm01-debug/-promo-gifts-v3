import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Filter, Palette } from 'lucide-react';
import type { ExternalImage, FilterMode, VariantInfo, GalleryStats } from './types';
import { IMAGE_TYPES } from './types';

interface Props {
  filterMode: FilterMode;
  setFilterMode: (mode: FilterMode) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  stats: GalleryStats;
  activeTypes: Set<string>;
  variantMap: Map<string, VariantInfo>;
  hasVariants: boolean;
}

export function ImageFilterBar({ filterMode, setFilterMode, typeFilter, setTypeFilter, stats, activeTypes, variantMap, hasVariants }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* View mode pills */}
        <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/50 border border-border/40">
          <button type="button" onClick={() => setFilterMode('all')}
            className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-all", filterMode === 'all' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Todas
          </button>
          <button type="button" onClick={() => setFilterMode('general')}
            className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-all", filterMode === 'general' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
            Gerais ({stats.withoutVariant})
          </button>
          {hasVariants && (
            <button type="button" onClick={() => setFilterMode('by-variant')}
              className={cn("px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1", filterMode === 'by-variant' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Palette className="h-3 w-3" /> Por Cor ({stats.byVariant.size})
            </button>
          )}
        </div>

        <div className="h-5 w-px bg-border/50" />

        {/* Type filter chips */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-3 w-3 text-muted-foreground/60 mr-0.5" />
          <button type="button" onClick={() => setTypeFilter('all')}
            className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border", typeFilter === 'all' ? "bg-primary/10 border-primary/30 text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
            Todos tipos
          </button>
          {IMAGE_TYPES.filter(t => activeTypes.has(t.value)).map(t => {
            const count = stats.byType.get(t.value) || 0;
            return (
              <button key={t.value} type="button" onClick={() => setTypeFilter(typeFilter === t.value ? 'all' : t.value)}
                className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border flex items-center gap-1", typeFilter === t.value ? "bg-primary/10 border-primary/30 text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50")}>
                <t.icon className={cn("h-2.5 w-2.5", t.color)} /> {t.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Variant filter row */}
      {filterMode === 'by-variant' && hasVariants && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {Array.from(stats.byVariant.entries()).map(([code, count]) => {
            const variant = variantMap.get(code);
            return (
              <button key={code} type="button" onClick={() => setFilterMode(filterMode === code ? 'by-variant' : code)}
                className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all", filterMode === code ? "bg-primary/10 border-primary/30 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30")}>
                {variant?.color_hex ? <div className="w-3 h-3 rounded-full border border-border/60" style={{ backgroundColor: variant.color_hex }} /> : <Palette className="h-3 w-3" />}
                <span>{variant?.color_name || variant?.name || code}</span>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">{count}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
