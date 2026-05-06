import React from 'react';
import { Search, RotateCcw, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FilterPanelHeaderProps {
  activeFiltersCount: number;
  onReset: () => void;
  collapseAllSections: () => void;
  filterSearch: string;
  setFilterSearch: (s: string) => void;
}

export function FilterPanelHeader({
  activeFiltersCount,
  onReset,
  collapseAllSections,
  filterSearch,
  setFilterSearch
}: FilterPanelHeaderProps) {
  return (
    <div className="sticky top-0 z-20 space-y-3 bg-background/95 pb-4 pt-1 backdrop-blur-sm">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-bold tracking-tight">Filtros</h2>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs text-orange hover:bg-orange/10 hover:text-orange">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Limpar ({activeFiltersCount})
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={collapseAllSections} className="h-8 w-8 p-0">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative px-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar filtros..."
          className="h-9 pl-9 text-sm focus-visible:ring-orange/30"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
        />
      </div>
    </div>
  );
}
