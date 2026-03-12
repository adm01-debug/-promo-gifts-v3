import { useMemo, useState } from 'react';
import { useExternalCategoriesQuery, type ExternalCategory } from '@/hooks/useExternalCategoriesQuery';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, FolderOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySelectProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

export function CategorySelect({ value, onChange, error }: CategorySelectProps) {
  const { data: categories = [], isLoading } = useExternalCategoriesQuery();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const selected = useMemo(
    () => categories.find(c => c.id === value),
    [categories, value]
  );

  // Build breadcrumb for a category
  const getBreadcrumb = (cat: ExternalCategory): string => {
    if (!cat.parent_id) return cat.name;
    const parent = categories.find(c => c.id === cat.parent_id);
    if (!parent) return cat.name;
    return `${parent.name} › ${cat.name}`;
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected ? getBreadcrumb(selected) : 'Selecionar categoria...'}
            </span>
            {value ? (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Buscar categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-1">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria encontrada</p>
              ) : (
                filtered.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left',
                      value === cat.id && 'bg-accent'
                    )}
                    style={{ paddingLeft: `${(cat.level ?? 0) * 16 + 8}px` }}
                    onClick={() => {
                      onChange(cat.id);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', value === cat.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
