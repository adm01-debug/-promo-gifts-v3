import { Package, AlertTriangle, XCircle, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StockFilterOption = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'incoming';

interface StockFilterChipsProps {
  selected: StockFilterOption;
  onChange: (option: StockFilterOption) => void;
  counts?: Record<StockFilterOption, number>;
  className?: string;
}

const filterOptions: Array<{
  id: StockFilterOption;
  label: string;
  shortLabel: string;
  icon: typeof Package;
  activeClass: string;
}> = [
  {
    id: 'all',
    label: 'Todos',
    shortLabel: 'Todos',
    icon: Sparkles,
    activeClass: 'bg-primary text-primary-foreground border-primary',
  },
  {
    id: 'in-stock',
    label: 'Em Estoque',
    shortLabel: 'Disponível',
    icon: Package,
    activeClass: 'bg-primary text-primary-foreground border-emerald-500',
  },
  {
    id: 'low-stock',
    label: 'Estoque Baixo',
    shortLabel: 'Baixo',
    icon: AlertTriangle,
    activeClass: 'bg-amber-500 text-primary-foreground border-amber-500',
  },
  {
    id: 'out-of-stock',
    label: 'Sem Estoque',
    shortLabel: 'Indisponível',
    icon: XCircle,
    activeClass: 'bg-red-500 text-primary-foreground border-red-500',
  },
  {
    id: 'incoming',
    label: 'Chegando',
    shortLabel: 'Em trânsito',
    icon: Clock,
    activeClass: 'bg-purple-500 text-primary-foreground border-purple-500',
  },
];

export function StockFilterChips({
  selected,
  onChange,
  counts,
  className,
}: StockFilterChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {filterOptions.map((option) => {
        const Icon = option.icon;
        const isActive = selected === option.id;
        const count = counts?.[option.id];

        return (
          <Button
            key={option.id}
            variant="outline"
            size="sm"
            className={cn(
              'h-8 gap-1.5 transition-all duration-200',
              isActive && option.activeClass,
              !isActive && 'hover:border-muted-foreground/50'
            )}
            onClick={() => onChange(option.id)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{option.label}</span>
            <span className="sm:hidden">{option.shortLabel}</span>
            {count !== undefined && count > 0 && (
              <Badge
                variant={isActive ? 'secondary' : 'outline'}
                className={cn(
                  'ml-1 h-5 min-w-5 px-1.5 text-[10px]',
                  isActive && 'bg-white/20 text-inherit border-transparent'
                )}
              >
                {count > 999 ? '999+' : count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// Versão compacta para mobile
interface StockFilterSelectProps {
  selected: StockFilterOption;
  onChange: (option: StockFilterOption) => void;
  className?: string;
}

export function StockFilterSelect({ selected, onChange, className }: StockFilterSelectProps) {
  const selectedOption = filterOptions.find(o => o.id === selected);
  
  return (
    <div className={cn('relative', className)}>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as StockFilterOption)}
        className={cn(
          'w-full h-9 px-3 py-2 text-sm rounded-md border bg-background',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          'appearance-none cursor-pointer'
        )}
      >
        {filterOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {selectedOption && <selectedOption.icon className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
