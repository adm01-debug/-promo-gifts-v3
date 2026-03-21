import { Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterPanel, type FilterState } from "@/components/filters/FilterPanel";
import { StatsPopover } from "@/components/products/StatsPopover";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import type { ViewMode, SortOption } from "@/hooks/useCatalogState";

interface CatalogToolbarProps {
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  activeFiltersCount: number;
  filterSheetOpen: boolean;
  setFilterSheetOpen: (open: boolean) => void;
  resetFilters: () => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  statBadges: any[];
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  gridColumns: ColumnCount;
  setGridColumns: (c: ColumnCount) => void;
}

export function CatalogToolbar({
  filters, setFilters, activeFiltersCount,
  filterSheetOpen, setFilterSheetOpen, resetFilters,
  sortBy, setSortBy,
  statBadges,
  viewMode, setViewMode,
  gridColumns, setGridColumns,
}: CatalogToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <FilterPanel
              filters={filters}
              onFilterChange={setFilters}
              onReset={resetFilters}
              activeFiltersCount={activeFiltersCount}
            />
          </SheetContent>
        </Sheet>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-32 sm:w-44">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome A-Z</SelectItem>
            <SelectItem value="price-asc">Menor Preço</SelectItem>
            <SelectItem value="price-desc">Maior Preço</SelectItem>
            <SelectItem value="stock">Maior Estoque</SelectItem>
            <SelectItem value="newest">Novidades</SelectItem>
          </SelectContent>
        </Select>
        <div className="hidden sm:block">
          <StatsPopover stats={statBadges} />
        </div>
      </div>

      <div className="hidden sm:block">
        <LayoutPopover
          viewMode={viewMode}
          setViewMode={setViewMode}
          gridColumns={gridColumns}
          setGridColumns={setGridColumns}
        />
      </div>
    </div>
  );
}
