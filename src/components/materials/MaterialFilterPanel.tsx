import React, { useState } from "react";
import { Search, X, Layers, Package, RotateCcw, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMaterialFilter, MaterialFilterState } from "@/hooks/useMaterialFilter";
import { MaterialGroupAccordion } from "./MaterialGroupAccordion";
import { MaterialBadge } from "./MaterialBadge";

interface MaterialFilterPanelProps {
  onFilterChange?: (state: MaterialFilterState) => void;
  className?: string;
  maxHeight?: string;
  showStats?: boolean;
  showSearch?: boolean;
  compactMode?: boolean;
}

export function MaterialFilterPanel({
  onFilterChange,
  className,
  maxHeight = "400px",
  showStats = true,
  showSearch = true,
  compactMode = false,
}: MaterialFilterPanelProps) {
  const {
    filterState,
    groups,
    materials,
    byGroup,
    isLoading,
    error,
    toggleGroup,
    toggleType,
    setSearchTerm,
    clearFilters,
    activeFiltersCount,
    totalGroups,
    totalMaterials,
    isGroupSelected,
    getTypesForGroup,
  } = useMaterialFilter();

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
      const types = getTypesForGroup(g.group_slug);
      const matchTypes = types.some(t => t.type_name.toLowerCase().includes(term));
      return matchGroup || matchTypes;
    });
  }, [groups, filterState.searchTerm, getTypesForGroup]);

  if (error) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <p className="text-sm text-destructive mb-2">Erro ao carregar materiais</p>
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
            <Layers className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Materiais</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium">{totalGroups}</span> grupos
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">{totalMaterials}</span> tipos
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
              placeholder="Buscar material..."
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
            <span className="text-xs font-medium text-muted-foreground">
              Filtros ativos
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-xs px-2"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterState.selectedGroups.map(slug => {
              const group = groups.find(g => g.group_slug === slug);
              return group ? (
                <MaterialBadge
                  key={`group-${slug}`}
                  name={group.group_name}
                  hexCode={group.group_hex_code}
                  variant="solid"
                  size="sm"
                  onRemove={() => toggleGroup(slug)}
                />
              ) : null;
            })}
            {filterState.selectedTypes.map(slug => {
              const material = materials.find(m => m.type_slug === slug);
              return material ? (
                <MaterialBadge
                  key={`type-${slug}`}
                  name={material.type_name}
                  variant="outline"
                  size="sm"
                  onRemove={() => toggleType(slug)}
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
              {filterState.searchTerm
                ? "Nenhum material encontrado"
                : "Nenhum grupo de materiais"}
            </div>
          ) : (
            filteredGroups.map(group => (
              <MaterialGroupAccordion
                key={group.group_id}
                group={group}
                types={getTypesForGroup(group.group_slug)}
                isGroupSelected={isGroupSelected(group.group_slug)}
                selectedTypes={filterState.selectedTypes}
                onGroupToggle={toggleGroup}
                onTypeToggle={toggleType}
                defaultOpen={activeFiltersCount > 0 && isGroupSelected(group.group_slug)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// Versão compacta para sidebar
export function CompactMaterialFilter({
  onFilterChange,
  className,
}: Pick<MaterialFilterPanelProps, 'onFilterChange' | 'className'>) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Materiais</span>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>
      
      {isExpanded && (
        <MaterialFilterPanel
          onFilterChange={onFilterChange}
          showStats={false}
          maxHeight="300px"
          className="border-t"
        />
      )}
    </div>
  );
}
