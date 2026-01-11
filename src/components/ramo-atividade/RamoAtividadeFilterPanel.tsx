import React from "react";
import { Search, X, Building2, RotateCcw, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRamoAtividadeFilter, type UseRamoAtividadeFilterReturn } from "@/hooks/useRamoAtividadeFilter";
import type { RamoAtividadeFilterState } from "@/types/ramo-atividade";
import { RamoAtividadeGroupAccordion } from "./RamoAtividadeGroupAccordion";
import { RamoAtividadeBadge } from "./RamoAtividadeBadge";

interface RamoAtividadeFilterPanelProps {
  onFilterChange?: (state: RamoAtividadeFilterState) => void;
  className?: string;
  maxHeight?: string;
  showStats?: boolean;
  showSearch?: boolean;
  compactMode?: boolean;
}

export function RamoAtividadeFilterPanel({
  onFilterChange,
  className,
  maxHeight = "400px",
  showStats = true,
  showSearch = true,
  compactMode = false,
}: RamoAtividadeFilterPanelProps) {
  const {
    filterState,
    groups,
    segmentos,
    isLoading,
    error,
    toggleRamo,
    toggleSegmento,
    setSearchTerm,
    clearFilters,
    activeFiltersCount,
    totalGroups,
    totalSegmentos,
    isRamoSelected,
    getSegmentosForRamo,
  } = useRamoAtividadeFilter();

  // Notificar mudanças
  React.useEffect(() => {
    onFilterChange?.(filterState);
  }, [filterState, onFilterChange]);

  // Filtrar grupos por busca
  const filteredGroups = React.useMemo(() => {
    if (!filterState.searchTerm) return groups;
    
    const term = filterState.searchTerm.toLowerCase();
    return groups.filter(g => {
      const matchGroup = g.group_name.toLowerCase().includes(term);
      const segs = getSegmentosForRamo(g.group_slug);
      const matchSegs = segs.some(s => s.segmento_name.toLowerCase().includes(term));
      return matchGroup || matchSegs;
    });
  }, [groups, filterState.searchTerm, getSegmentosForRamo]);

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="text-sm text-destructive mb-2">Erro ao carregar ramos de atividade</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header com stats */}
      {showStats && (
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Nichos/Segmentos</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium">{totalGroups}</span> ramos
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">{totalSegmentos}</span> segmentos
            </span>
          </div>
        </div>
      )}

      {/* Busca */}
      {showSearch && (
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nicho/segmento..."
              value={filterState.searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
            {filterState.searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Badges dos filtros ativos */}
      {activeFiltersCount > 0 && (
        <div className="p-3 border-b bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Filtros ativos</span>
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs px-2">
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterState.selectedRamos.map(slug => {
              const group = groups.find(g => g.group_slug === slug);
              return group ? (
                <RamoAtividadeBadge
                  key={`ramo-${slug}`}
                  name={group.group_name}
                  hexCode={group.group_hex_code}
                  variant="solid"
                  size="sm"
                  onRemove={() => toggleRamo(slug)}
                />
              ) : null;
            })}
            {filterState.selectedSegmentos.map(slug => {
              const segmento = segmentos.find(s => s.segmento_slug === slug);
              const group = segmento ? groups.find(g => g.group_slug === segmento.ramo_slug) : null;
              return segmento ? (
                <RamoAtividadeBadge
                  key={`seg-${slug}`}
                  name={segmento.segmento_name}
                  hexCode={group?.group_hex_code}
                  variant="outline"
                  size="sm"
                  onRemove={() => toggleSegmento(slug)}
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Lista de grupos */}
      <ScrollArea style={{ maxHeight }} className="flex-1">
        <div className="p-3 space-y-2">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {filterState.searchTerm ? "Nenhum ramo encontrado" : "Nenhum ramo de atividade"}
            </div>
          ) : (
            filteredGroups.map(group => (
              <RamoAtividadeGroupAccordion
                key={group.group_id}
                group={group}
                segmentos={getSegmentosForRamo(group.group_slug)}
                isRamoSelected={isRamoSelected(group.group_slug)}
                selectedSegmentos={filterState.selectedSegmentos}
                onRamoToggle={toggleRamo}
                onSegmentoToggle={toggleSegmento}
                defaultOpen={activeFiltersCount > 0 && isRamoSelected(group.group_slug)}
                compact={compactMode}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
