import React from "react";
import { Search, X, Gem, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { MaterialBadge } from "@/components/materials/MaterialBadge";
import { FilterSection } from "../FilterSection";

interface MaterialGroup {
  group_id: string;
  group_slug: string;
  group_name: string;
  group_hex_code: string | null;
  total_materials: number;
}

interface MaterialType {
  type_id: string;
  type_slug: string;
  type_name: string;
  group_slug: string;
}

interface FilterSectionMaterialsProps {
  isOpen: boolean;
  onToggle: (id: string) => void;
  materialGroups: MaterialGroup[];
  allMaterials: MaterialType[];
  materialsLoading: boolean;
  selectedGroups: string[];
  selectedTypes: string[];
  toggleMaterialGroup: (slug: string) => void;
  toggleMaterialType: (slug: string) => void;
  isMaterialGroupSelected: (slug: string) => boolean;
  getTypesForGroup: (slug: string) => MaterialType[];
  openSections: string[];
  onToggleSection: (id: string) => void;
}

export function FilterSectionMaterials({
  isOpen,
  onToggle,
  materialGroups,
  allMaterials,
  materialsLoading,
  selectedGroups,
  selectedTypes,
  toggleMaterialGroup,
  toggleMaterialType,
  isMaterialGroupSelected,
  getTypesForGroup,
  openSections,
  onToggleSection,
}: FilterSectionMaterialsProps) {
  const [materialSearch, setMaterialSearch] = React.useState('');

  return (
    <FilterSection
      id="materials"
      title="Materiais"
      icon={<Gem className="h-4 w-4" />}
      badge={selectedGroups.length + selectedTypes.length}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Selected badges */}
        {(selectedGroups.length > 0 || selectedTypes.length > 0) && (
          <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                <Gem className="h-3 w-3" />
                Selecionados
              </span>
              <button
                type="button"
                onClick={() => {
                  selectedGroups.forEach(slug => toggleMaterialGroup(slug));
                  selectedTypes.forEach(slug => toggleMaterialType(slug));
                }}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
              >
                Limpar todos
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedGroups.map(slug => {
                const group = materialGroups.find(g => g.group_slug === slug);
                return group ? (
                  <MaterialBadge key={`group-${slug}`} name={group.group_name} hexCode={group.group_hex_code} size="sm" variant="solid" onRemove={() => toggleMaterialGroup(slug)} />
                ) : null;
              })}
              {selectedTypes.map(slug => {
                const material = allMaterials.find(m => m.type_slug === slug);
                const group = material ? materialGroups.find(g => g.group_slug === material.group_slug) : null;
                return material ? (
                  <MaterialBadge key={`type-${slug}`} name={material.type_name} hexCode={group?.group_hex_code} size="sm" variant="outline" onRemove={() => toggleMaterialType(slug)} />
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar material ou grupo..." value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} className="h-8 text-sm pl-8 pr-8" />
          {materialSearch && (
            <button type="button" onClick={() => setMaterialSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>{materialGroups.length} grupos</span>
          <span>•</span>
          <span>{allMaterials.length} materiais</span>
          <span>•</span>
          <span className="text-primary font-medium">{selectedGroups.length + selectedTypes.length} selecionados</span>
        </div>

        {materialsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : (
          <ScrollArea className="h-56">
            <div className="space-y-1.5 pr-3">
              {[...materialGroups]
                .sort((a, b) => a.group_name.localeCompare(b.group_name, 'pt-BR'))
                .filter(g =>
                  !materialSearch ||
                  g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                  getTypesForGroup(g.group_slug).some(t => t.type_name.toLowerCase().includes(materialSearch.toLowerCase()))
                )
                .map(group => {
                  const types = getTypesForGroup(group.group_slug);
                  const matSectionOpen = openSections.includes(`mat-${group.group_slug}`);
                  const isSelected = isMaterialGroupSelected(group.group_slug);
                  const selectedTypesCount = types.filter(t => selectedTypes.includes(t.type_slug)).length;
                  const hasAnySelection = isSelected || selectedTypesCount > 0;

                  return (
                    <div key={group.group_id} className={cn("rounded-lg overflow-hidden transition-all duration-200", hasAnySelection ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30" : "bg-muted/30 hover:bg-muted/50")}>
                      <div className="flex items-center gap-2 p-2.5">
                        <button type="button" onClick={() => onToggleSection(`mat-${group.group_slug}`)} className={cn("p-1 rounded-md transition-all duration-200", matSectionOpen ? "bg-primary/10" : "bg-muted hover:bg-muted/80")}>
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", matSectionOpen ? "rotate-180 text-primary" : "text-muted-foreground")} />
                        </button>
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleMaterialGroup(group.group_slug)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-200" />
                          <div className={cn("w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all", hasAnySelection ? "ring-primary/50 scale-110" : "ring-border/50")} style={{ backgroundColor: group.group_hex_code || 'hsl(var(--muted))', boxShadow: group.group_hex_code ? `0 2px 8px ${group.group_hex_code}40` : 'none' }} />
                          <span className={cn("text-sm font-medium truncate transition-colors", hasAnySelection ? "text-primary" : "text-foreground")}>{group.group_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {selectedTypesCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{selectedTypesCount}</span>}
                          <span className={cn("text-[11px] px-1.5 py-0.5 rounded-full", hasAnySelection ? "bg-primary/20 text-primary font-medium" : "bg-muted text-muted-foreground")}>{group.total_materials}</span>
                        </div>
                      </div>
                      {matSectionOpen && types.length > 0 && (
                        <div className="px-2.5 pb-2.5 space-y-0.5">
                          <div className="border-t border-border/30 pt-2 ml-8">
                            {[...types]
                              .sort((a, b) => a.type_name.localeCompare(b.type_name, 'pt-BR'))
                              .filter(t => !materialSearch || t.type_name.toLowerCase().includes(materialSearch.toLowerCase()))
                              .map(type => {
                                const isTypeSelected = selectedTypes.includes(type.type_slug);
                                return (
                                  <label key={type.type_id} className={cn("flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150", isTypeSelected ? "bg-primary/15 text-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                                    <Checkbox checked={isTypeSelected} onCheckedChange={() => toggleMaterialType(type.type_slug)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: group.group_hex_code || 'hsl(var(--muted))' }} />
                                    <span className="truncate flex-1">{type.type_name}</span>
                                    {isTypeSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      {matSectionOpen && types.length === 0 && (
                        <div className="px-2.5 pb-2.5">
                          <div className="border-t border-border/30 pt-2 ml-8">
                            <p className="text-xs text-muted-foreground italic py-2">Nenhum material neste grupo</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {materialGroups.length === 0 && !materialsLoading && (
                <div className="text-center py-8">
                  <Gem className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum material disponível</p>
                </div>
              )}

              {materialSearch && materialGroups.filter(g =>
                g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                getTypesForGroup(g.group_slug).some(t => t.type_name.toLowerCase().includes(materialSearch.toLowerCase()))
              ).length === 0 && (
                <div className="text-center py-6">
                  <Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum resultado para "{materialSearch}"</p>
                  <button type="button" onClick={() => setMaterialSearch('')} className="text-xs text-primary hover:underline mt-1">Limpar busca</button>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </FilterSection>
  );
}
