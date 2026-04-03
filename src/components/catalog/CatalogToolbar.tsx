import React, { Suspense } from "react";
import { Filter } from "lucide-react";
import { RecentlyViewedPopover } from "@/components/products/RecentlyViewedPopover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { FilterState } from "@/components/filters/FilterPanel";
import { StatsPopover } from "@/components/products/StatsPopover";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import type { ViewMode, SortOption } from "@/hooks/useCatalogState";
import { Skeleton } from "@/components/ui/skeleton";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { cn } from "@/lib/utils";

const LazyFilterPanel = lazyWithRetry(() =>
  import("@/components/filters/FilterPanel").then((m) => ({ default: m.FilterPanel }))
);

function FilterPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-6 w-3/4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "A-Z" },
  { value: "price-asc", label: "Menor Preço" },
  { value: "price-desc", label: "Maior Preço" },
  { value: "stock", label: "Estoque" },
  { value: "newest", label: "Novidades" },
];

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
      <div className="flex items-center gap-2 flex-wrap flex-1">
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button 
              variant={activeFiltersCount > 0 ? "default" : "outline"} 
              size="sm"
              className={activeFiltersCount > 0 ? "bg-orange hover:bg-orange-hover text-orange-foreground shadow-md" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-foreground/20 text-orange-foreground">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            {filterSheetOpen && (
              <Suspense fallback={<FilterPanelSkeleton />}>
                <LazyFilterPanel
                  filters={filters}
                  onFilterChange={setFilters}
                  onReset={resetFilters}
                  activeFiltersCount={activeFiltersCount}
                />
              </Suspense>
            )}
          </SheetContent>
        </Sheet>

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="h-9 min-h-[36px] px-3 rounded-md border border-input bg-background text-xs"
          aria-label="Ordenar por"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <StatsPopover stats={statBadges} />
      </div>

      <div className="hidden sm:flex items-center gap-1.5">
        <RecentlyViewedPopover maxVisible={10} />
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
