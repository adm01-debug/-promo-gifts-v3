import React from "react";
import { Search, X, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdvancedFilterState } from "@/hooks/useAdvancedFilters";
import { RamoAtividadeBadge } from "@/components/ramo-atividade/RamoAtividadeBadge";
import { RamoAtividadeGroupAccordion } from "@/components/ramo-atividade/RamoAtividadeGroupAccordion";
import { FilterSection } from "../FilterSection";

interface RamoGroup {
  id: string;
  slug: string;
  name: string;
}

interface Segmento {
  id: string;
  slug: string;
  name: string;
}

interface FilterSectionRamosProps {
  isOpen: boolean;
  onToggle: (id: string) => void;
  filters: AdvancedFilterState;
  onFilterChange: (filters: AdvancedFilterState) => void;
  ramoGroups: RamoGroup[];
  allSegmentos: Segmento[];
  ramosLoading: boolean;
  getSegmentosForRamo: (slug: string) => Segmento[];
}

export function FilterSectionRamos({
  isOpen,
  onToggle,
  filters,
  onFilterChange,
  ramoGroups,
  allSegmentos,
  ramosLoading,
  getSegmentosForRamo,
}: FilterSectionRamosProps) {
  const [ramoSearch, setRamoSearch] = React.useState('');

  return (
    <FilterSection
      id="ramos-atividade"
      title="Ramos de Atividade"
      icon={<Building2 className="h-4 w-4" />}
      badge={(filters.ramosAtividade?.length || 0) + (filters.segmentosAtividade?.length || 0)}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Selected badges */}
        {((filters.ramosAtividade?.length || 0) > 0 || (filters.segmentosAtividade?.length || 0) > 0) && (
          <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                Selecionados
              </span>
              <button type="button" onClick={() => onFilterChange({ ...filters, ramosAtividade: [], segmentosAtividade: [] })} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                Limpar todos
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(filters.ramosAtividade || []).map(slug => {
                const ramo = ramoGroups.find(r => r.slug === slug);
                return ramo ? (
                  <RamoAtividadeBadge key={`ramo-${slug}`} name={ramo.name} size="sm" variant="solid" onRemove={() => onFilterChange({ ...filters, ramosAtividade: (filters.ramosAtividade || []).filter(r => r !== slug) })} />
                ) : null;
              })}
              {(filters.segmentosAtividade || []).map(slug => {
                const segmento = allSegmentos.find(s => s.slug === slug);
                return segmento ? (
                  <RamoAtividadeBadge key={`seg-${slug}`} name={segmento.name} size="sm" variant="outline" onRemove={() => onFilterChange({ ...filters, segmentosAtividade: (filters.segmentosAtividade || []).filter(s => s !== slug) })} />
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar ramo..." value={ramoSearch} onChange={(e) => setRamoSearch(e.target.value)} className="h-8 text-sm pl-8 pr-8" />
          {ramoSearch && (
            <button type="button" onClick={() => setRamoSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {ramosLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-1.5 pr-3">
              {ramoGroups
                .filter(ramo =>
                  !ramoSearch ||
                  ramo.name.toLowerCase().includes(ramoSearch.toLowerCase()) ||
                  getSegmentosForRamo(ramo.slug).some(s => s.name.toLowerCase().includes(ramoSearch.toLowerCase()))
                )
                .map(ramo => (
                  <RamoAtividadeGroupAccordion
                    key={ramo.id}
                    ramo={ramo}
                    segmentos={getSegmentosForRamo(ramo.slug)}
                    selectedRamos={filters.ramosAtividade || []}
                    selectedSegmentos={filters.segmentosAtividade || []}
                    onToggleRamo={(slug) => {
                      const current = filters.ramosAtividade || [];
                      onFilterChange({ ...filters, ramosAtividade: current.includes(slug) ? current.filter(r => r !== slug) : [...current, slug] });
                    }}
                    onToggleSegmento={(slug) => {
                      const current = filters.segmentosAtividade || [];
                      onFilterChange({ ...filters, segmentosAtividade: current.includes(slug) ? current.filter(s => s !== slug) : [...current, slug] });
                    }}
                  />
                ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </FilterSection>
  );
}
