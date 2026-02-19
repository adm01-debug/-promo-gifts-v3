import { useState, useMemo } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useColorSystem, isLightColor } from '@/hooks/useColorSystem';
import type { ColorFilterSelection } from './ColorGroupFilter';

// =====================================================
// SWATCH COM RADIX TOOLTIP (#10)
// =====================================================

interface InlineColorSwatchProps {
  hexCode: string | null;
  isSelected: boolean;
  onClick: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

function InlineColorSwatch({
  hexCode,
  isSelected,
  onClick,
  label,
  size = 'md',
}: InlineColorSwatchProps) {
  const sizeClasses = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };
  const isTransparent = !hexCode || hexCode.toLowerCase() === '#ffffff';
  const isLight = isLightColor(hexCode);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label={`Filtrar por cor ${label}`}
          className={cn(
            sizeClasses[size],
            'rounded-full border-2 transition-all duration-200 flex items-center justify-center',
            'hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
            isSelected
              ? 'ring-2 ring-offset-1'
              : 'border-border hover:border-muted-foreground/50',
            isTransparent && 'bg-gradient-to-br from-gray-100 to-gray-200'
          )}
          style={{
            backgroundColor: isTransparent ? undefined : (hexCode || '#ccc'),
            ...(isSelected ? {
              borderColor: hexCode || '#ccc',
              ['--tw-ring-color' as string]: hexCode || '#ccc',
            } : {}),
          }}
        >
          {isSelected && (
            <Check
              className={cn(
                'w-4 h-4',
                isLight ? 'text-gray-800' : 'text-white'
              )}
            />
          )}
          {isTransparent && !isSelected && (
            <div className="w-full h-full rounded-full border border-dashed border-gray-300" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// =====================================================
// COMPONENTE INLINE (#1 - substitui Popover na sidebar)
// =====================================================

interface InlineColorGroupFilterProps {
  selection: ColorFilterSelection;
  onChange: (selection: ColorFilterSelection) => void;
  showNuances?: boolean;
  showVariations?: boolean;
}

export function InlineColorGroupFilter({
  selection,
  onChange,
  showNuances = true,
  showVariations = true,
}: InlineColorGroupFilterProps) {
  const { data: colorData, isLoading } = useColorSystem();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const totalSelected = useMemo(
    () => selection.groups.length + selection.variations.length + selection.nuances.length,
    [selection]
  );

  const toggleGroup = (slug: string, groupId: string) => {
    const isSelected = selection.groups.includes(slug);
    const newGroups = isSelected
      ? selection.groups.filter(g => g !== slug)
      : [...selection.groups, slug];

    if (!isSelected) {
      setExpandedGroups(prev => new Set(prev).add(groupId));
    }

    onChange({ ...selection, groups: newGroups });
  };

  const toggleVariation = (slug: string) => {
    const newVariations = selection.variations.includes(slug)
      ? selection.variations.filter(v => v !== slug)
      : [...selection.variations, slug];
    onChange({ ...selection, variations: newVariations });
  };

  const toggleNuance = (slug: string) => {
    const newNuances = selection.nuances.includes(slug)
      ? selection.nuances.filter(n => n !== slug)
      : [...selection.nuances, slug];
    onChange({ ...selection, nuances: newNuances });
  };

  const toggleExpand = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="w-8 h-8 rounded-full" />
        ))}
      </div>
    );
  }

  if (!colorData) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Swatches grid */}
        <div className="flex flex-wrap gap-2">
          {colorData.groups.map(group => (
            <InlineColorSwatch
              key={group.id}
              hexCode={group.hex_code}
              isSelected={selection.groups.includes(group.slug)}
              onClick={() => toggleGroup(group.slug, group.id)}
              label={group.name}
            />
          ))}
        </div>

        {/* Badge de seleção + limpar */}
        {totalSelected > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {totalSelected} selecionado{totalSelected > 1 ? 's' : ''}
            </Badge>
            <button
              type="button"
              onClick={() => onChange({ groups: [], variations: [], nuances: [] })}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Limpar filtros de cor"
            >
              Limpar
            </button>
          </div>
        )}

        {/* Variações expandidas */}
        {showVariations &&
          colorData.groups
            .filter(g => expandedGroups.has(g.id) && g.variations.length > 1)
            .map(group => (
              <Collapsible
                key={group.id}
                open={expandedGroups.has(group.id)}
                onOpenChange={() => toggleExpand(group.id)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 text-sm w-full py-1 hover:text-primary transition-colors">
                  <div
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: group.hex_code || '#ccc' }}
                  />
                  <span className="font-medium">{group.name}</span>
                  <Badge variant="outline" className="text-[10px] h-4 ml-auto">
                    {group.variations.length} tons
                  </Badge>
                  {expandedGroups.has(group.id) ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pt-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    {group.variations.map(v => (
                      <button
                        key={v.id}
                        onClick={() => toggleVariation(v.slug)}
                        aria-label={`Filtrar por ${v.name}`}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all border hover:bg-accent',
                          selection.variations.includes(v.slug)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border'
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full border"
                          style={{ backgroundColor: v.hex_code || group.hex_code || '#ccc' }}
                        />
                        {v.name}
                        {selection.variations.includes(v.slug) && (
                          <Check className="w-3 h-3" />
                        )}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

        {/* Nuances/Acabamentos */}
        {showNuances && colorData.nuances.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Acabamento
            </h5>
            <div className="flex flex-wrap gap-1.5">
              {colorData.nuances.map(nuance => (
                <button
                  key={nuance.id}
                  onClick={() => toggleNuance(nuance.slug)}
                  aria-label={`Filtrar por acabamento ${nuance.name}`}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs transition-all border hover:bg-accent',
                    selection.nuances.includes(nuance.slug)
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border'
                  )}
                >
                  {nuance.name}
                  {selection.nuances.includes(nuance.slug) && (
                    <Check className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default InlineColorGroupFilter;
