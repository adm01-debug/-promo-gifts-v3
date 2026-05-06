import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ArrowUpDown, X, ChevronUp, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SORT_OPTIONS } from '@/constants/filters';

interface StickyFilterBarProps {
  isVisible: boolean;
  activeFiltersCount: number;
  totalProducts: number;
  sortBy: string;
  onSortChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  onScrollToTop: () => void;
  viewMode: 'grid' | 'list' | 'table';
  onViewModeChange: (mode: 'grid' | 'list' | 'table') => void;
}

export function StickyFilterBar({
  isVisible,
  activeFiltersCount,
  totalProducts,
  sortBy,
  onSortChange,
  onOpenFilters,
  onClearFilters,
  onScrollToTop,
  viewMode,
  onViewModeChange,
}: StickyFilterBarProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed left-0 right-0 top-[4.5rem] z-50 border-b border-border bg-background/95 shadow-lg backdrop-blur-md"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Filters */}
              <div className="flex items-center gap-3">
                {/* Botão Filtros */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onOpenFilters} className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">Filtros</span>
                      {activeFiltersCount > 0 && (
                        <Badge
                          variant="secondary"
                          className="ml-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
                        >
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
                  >
                    Abrir painel de filtros
                  </TooltipContent>
                </Tooltip>

                {/* Limpar filtros (se houver) */}
                {activeFiltersCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearFilters}
                        className="gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                        <span className="hidden sm:inline">Limpar</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
                    >
                      Remover todos os filtros
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Contador de produtos */}
                <span className="hidden text-sm text-muted-foreground md:block">
                  <strong className="text-foreground">{totalProducts}</strong> produtos
                </span>
              </div>

              {/* Right side - Sort & View */}
              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                <div className="hidden rounded-xl border border-border p-0.5 sm:flex">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="icon"
                        aria-label="LayoutGrid"
                        className="h-7 w-7"
                        onClick={() => onViewModeChange('grid')}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
                    >
                      Visualização em Grade
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="icon"
                        aria-label="Lista"
                        className="h-7 w-7"
                        onClick={() => onViewModeChange('list')}
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
                    >
                      Visualização em Lista
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Sort */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <Select value={sortBy} onValueChange={onSortChange}>
                        <SelectTrigger className="h-8 w-[180px] text-sm">
                          <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                          <SelectValue placeholder="Ordenar" />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
                  >
                    Ordenar resultados
                  </TooltipContent>
                </Tooltip>

                {/* Voltar ao topo */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Expandir"
                      className="h-8 w-8"
                      onClick={onScrollToTop}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
                  >
                    Voltar ao topo
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Barra de filtros compacta para ficar fixa DENTRO do grid de produtos
interface InlineFilterBarProps {
  activeFiltersCount: number;
  totalProducts: number;
  sortBy: string;
  onSortChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  viewMode: 'grid' | 'list' | 'table';
  onViewModeChange: (mode: 'grid' | 'list' | 'table') => void;
  columnSelector?: React.ReactNode;
}

export function InlineFilterBar({
  activeFiltersCount,
  totalProducts,
  sortBy,
  onSortChange,
  onOpenFilters,
  onClearFilters,
  viewMode,
  onViewModeChange,
  columnSelector,
}: InlineFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {/* Left side - Filters */}
      <div className="flex items-center gap-2">
        {/* Botão Filtros */}
        <Button variant="outline" size="sm" onClick={onOpenFilters} className="h-8 gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden text-xs sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Limpar filtros (se houver) */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            <span className="hidden text-xs sm:inline">Limpar</span>
          </Button>
        )}

        {/* Contador de produtos */}
        <span className="text-[11px] text-muted-foreground">
          <strong className="text-foreground">{totalProducts}</strong> produtos
        </span>
      </div>

      {/* Right side - Sort & View */}
      <div className="flex items-center gap-2">
        {/* Column selector */}
        {viewMode === 'grid' && columnSelector}
        {/* View mode toggle */}
        <div className="hidden rounded-xl border border-border p-0.5 sm:flex">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                aria-label="LayoutGrid"
                className="h-6 w-6"
                onClick={() => onViewModeChange('grid')}
              >
                <LayoutGrid className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
            >
              Grade
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                aria-label="Lista"
                className="h-6 w-6"
                onClick={() => onViewModeChange('list')}
              >
                <List className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="border-none bg-primary px-2 py-1 text-[11px] text-primary-foreground"
            >
              Lista
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <ArrowUpDown className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
