import React, { Suspense } from "react";
import { Filter, ArrowUpDown, CheckSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilterState } from "@/components/filters/FilterPanel";
import { StatsPopover } from "@/components/products/StatsPopover";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import type { ViewMode, SortOption } from "@/hooks/useCatalogState";
import { Skeleton } from "@/components/ui/skeleton";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount?: number;
}

export function CatalogToolbar({
  filters, setFilters, activeFiltersCount,
  filterSheetOpen, setFilterSheetOpen, resetFilters,
  sortBy, setSortBy,
  statBadges,
  viewMode, setViewMode,
  gridColumns, setGridColumns,
  selectionMode, onToggleSelectionMode,
  selectedCount = 0,
}: CatalogToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="px-2.5 sm:px-3">
              <Filter className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 sm:ml-2 h-5 min-w-5 text-xs">
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

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-10 sm:w-44" aria-label="Ordenar por">
            <ArrowUpDown className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline"><SelectValue placeholder="Ordenar" /></span>
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
          <StatsPopover stats={statBadges} isFiltered={activeFiltersCount > 0} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Selecionar toggle with animated badge */}
        <Button
          variant={selectionMode ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5 h-8 transition-all relative",
            selectionMode
              ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
              : "hover:border-primary/50"
          )}
          onClick={onToggleSelectionMode}
        >
          {selectionMode ? (
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.3 }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
            </motion.div>
          ) : (
            <CheckSquare className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline text-xs">Selecionar</span>

          {/* Animated counter badge */}
          <AnimatePresence>
            {selectionMode && selectedCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute -top-2 -right-2"
              >
                <Badge
                  className="bg-destructive text-destructive-foreground h-5 min-w-5 text-[10px] font-bold px-1.5 py-0 flex items-center justify-center tabular-nums shadow-lg"
                >
                  {selectedCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Cancel selection — visible when selection mode is active */}
        <AnimatePresence>
          {selectionMode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={onToggleSelectionMode}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="hidden sm:block">
          <LayoutPopover
            viewMode={viewMode}
            setViewMode={setViewMode}
            gridColumns={gridColumns}
            setGridColumns={setGridColumns}
          />
        </div>
      </div>
    </div>
  );
}
