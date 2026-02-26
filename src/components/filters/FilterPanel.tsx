import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { ChevronDown, ChevronUp, ChevronsUpDown, RefreshCw, Search, X, Gem, Building2, Gift, Palette, Sparkles, Filter, Paintbrush, Clock, Tag, LayoutGrid, List, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { toTitleCase } from "@/lib/textUtils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DebouncedPriceInput } from "./DebouncedPriceInput";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ColumnSelector } from "@/components/products/ColumnSelector";
import { useCategoryIcons, getCategoryIcon } from "@/hooks/useCategoryIcons";
import { useMaterialFilter } from "@/hooks/useMaterialFilter";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useRamoAtividadeFilter } from "@/hooks/useRamoAtividadeFilter";
import { MaterialBadge } from "@/components/materials/MaterialBadge";
import { RamoAtividadeBadge } from "@/components/ramo-atividade/RamoAtividadeBadge";
import { RamoAtividadeGroupAccordion } from "@/components/ramo-atividade/RamoAtividadeGroupAccordion";
import { ColorFilterSelection } from "./ColorGroupFilter";
import { InlineColorGroupFilter } from "./InlineColorGroupFilter";
import { ExternalCategoryFilter } from "./ExternalCategoryFilter";
import {
  FAIXAS_PRECO,
} from "@/data/mockData";
import { CommemorativeDateFilter } from "./CommemorativeDateFilter";
import { useAdvancedFilters, SORT_OPTIONS } from "@/hooks/useAdvancedFilters";

export interface FilterState {
  // Busca textual
  search: string;
  // Sistema hierárquico de cores
  colorGroups: string[];
  colorVariations: string[];
  colorNuances: string[];
  colors: string[];
  categories: string[];
  suppliers: string[];
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
  // Ramos de Atividade
  ramosAtividade: string[];
  segmentosAtividade: string[];
  // Materiais
  materialGroups: string[];
  materialTypes: string[];
  materiais: string[];
  // Técnicas de gravação
  techniques: string[];
  // Tags
  tags: string[];
  priceRange: [number, number];
  minStock: number;
  inStock: boolean;
  isKit: boolean;
  featured: boolean;
  isNew: boolean;
  hasPersonalization: boolean;
  hasCommercialPackaging: boolean;
  // Ordenação
  sortBy: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  activeFiltersCount: number;
  products?: Array<{ tags?: { publicoAlvo?: string[]; endomarketing?: string[]; ramo?: string[]; nicho?: string[] } }>;
  // Layout controls
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  gridColumns?: import("@/components/products/ColumnSelector").ColumnCount;
  onGridColumnsChange?: (cols: import("@/components/products/ColumnSelector").ColumnCount) => void;
}

export const defaultFilters: FilterState = {
  search: '',
  colorGroups: [],
  colorVariations: [],
  colorNuances: [],
  colors: [],
  categories: [],
  suppliers: [],
  publicoAlvo: [],
  datasComemorativas: [],
  endomarketing: [],
  ramosAtividade: [],
  segmentosAtividade: [],
  materialGroups: [],
  materialTypes: [],
  materiais: [],
  techniques: [],
  tags: [],
  priceRange: [0, 9999],
  minStock: 0,
  inStock: false,
  isKit: false,
  featured: false,
  isNew: false,
  hasPersonalization: false,
  hasCommercialPackaging: false,
  sortBy: 'name',
};

export function FilterPanel({ filters, onFilterChange, onReset, activeFiltersCount, products = [], viewMode, onViewModeChange, gridColumns, onGridColumnsChange }: FilterPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [ramoSearch, setRamoSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Debounced search - local state updates immediately, filter updates after delay
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(localSearch, 500);

  // Sync debounced value to filters
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // Sync external filter changes back to local (e.g. reset)
  useEffect(() => {
    if (filters.search !== localSearch && filters.search === '') {
      setLocalSearch('');
    }
  }, [filters.search]);
  const { data: categoryIcons = [] } = useCategoryIcons();

  // Extrair opções dinâmicas de Público-Alvo e Endomarketing dos produtos reais (#8)
  const publicoAlvoOptions = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.tags?.publicoAlvo?.forEach(v => set.add(v)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const endomarketingOptions = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.tags?.endomarketing?.forEach(v => set.add(v)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  // #14 Product counts per ramo/segmento
  const productCountsByRamo = React.useMemo(() => {
    const ramoCounts = new Map<string, number>();
    const segmentoCounts = new Map<string, number>();
    products.forEach(p => {
      p.tags?.ramo?.forEach(r => {
        const key = r.toLowerCase();
        ramoCounts.set(key, (ramoCounts.get(key) || 0) + 1);
      });
      p.tags?.nicho?.forEach(n => {
        const key = n.toLowerCase();
        segmentoCounts.set(key, (segmentoCounts.get(key) || 0) + 1);
      });
    });
    return { ramoCounts, segmentoCounts };
  }, [products]);
  // Dados do hook avançado (técnicas, tags)
  const { techniqueOptions, tagOptions } = useAdvancedFilters();

  const stableSorted = (arr: string[] | undefined) => [...(arr ?? [])].slice().sort();

  // Hook de fornecedores (API externa)
  const { suppliers: supplierOptions, isLoading: suppliersLoading } = useSuppliers();

  // Hook de materiais
  const {
    groups: materialGroups,
    materials: allMaterials,
    isLoading: materialsLoading,
    filterState: materialFilterState,
    toggleGroup: toggleMaterialGroup,
    toggleType: toggleMaterialType,
    isGroupSelected: isMaterialGroupSelected,
    getTypesForGroup,
    clearFilters: clearMaterialFilters,
  } = useMaterialFilter();

  // Hook de Ramos de Atividade
  const {
    groups: ramoGroups,
    segmentos: allSegmentos,
    isLoading: ramosLoading,
    totalGroups: totalRamoGroups,
    totalSegmentos: totalRamoSegmentos,
    getSegmentosForRamo,
  } = useRamoAtividadeFilter();

  // Expandir automaticamente grupos com materiais selecionados
  useEffect(() => {
    if (materialGroups.length > 0 && (materialFilterState.selectedGroups.length > 0 || materialFilterState.selectedTypes.length > 0)) {
      const groupsWithSelection = new Set<string>();
      
      materialFilterState.selectedGroups.forEach(slug => {
        groupsWithSelection.add(`mat-${slug}`);
      });
      
      materialFilterState.selectedTypes.forEach(typeSlug => {
        const material = allMaterials.find(m => m.type_slug === typeSlug);
        if (material) {
          groupsWithSelection.add(`mat-${material.group_slug}`);
        }
      });
      
      setOpenSections(prev => {
        const newSections = [...prev];
        groupsWithSelection.forEach(section => {
          if (!newSections.includes(section)) {
            newSections.push(section);
          }
        });
        return newSections;
      });
    }
  }, [materialFilterState.selectedGroups, materialFilterState.selectedTypes, materialGroups, allMaterials]);

  // Ref para rastrear se filtros externos já tiveram valores (para distinguir reset de estado inicial)
  const prevMaterialFiltersRef = useRef<{ groups: string[]; types: string[] }>({ groups: [], types: [] });

  // Sincronizar seleção de materiais do hook interno com o FilterState externo
  useEffect(() => {
    const currentMaterialGroups = filters.materialGroups || [];
    const currentMaterialTypes = filters.materialTypes || [];
    
    // CRÍTICO: nunca mutar arrays do state com .sort() (isso causa UI "bugada" e toggles instáveis)
    const groupsChanged = JSON.stringify(stableSorted(currentMaterialGroups)) !== JSON.stringify(stableSorted(materialFilterState.selectedGroups));
    const typesChanged = JSON.stringify(stableSorted(currentMaterialTypes)) !== JSON.stringify(stableSorted(materialFilterState.selectedTypes));
    
    if (groupsChanged || typesChanged) {
      // Se filtros externos foram limpos (reset explícito: antes tinham valores, agora estão vazios)
      const wasExternallyReset = 
        currentMaterialGroups.length === 0 && currentMaterialTypes.length === 0 &&
        (prevMaterialFiltersRef.current.groups.length > 0 || prevMaterialFiltersRef.current.types.length > 0);
      
      if (wasExternallyReset && (materialFilterState.selectedGroups.length > 0 || materialFilterState.selectedTypes.length > 0)) {
        clearMaterialFilters();
      } else {
        onFilterChange({
          ...filters,
          materialGroups: materialFilterState.selectedGroups,
          materialTypes: materialFilterState.selectedTypes,
        });
      }
    }
    
    // Atualizar ref com estado atual
    prevMaterialFiltersRef.current = { groups: currentMaterialGroups, types: currentMaterialTypes };
  }, [materialFilterState.selectedGroups, materialFilterState.selectedTypes, filters.materialGroups, filters.materialTypes]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const toggleArrayFilter = (
    key: keyof FilterState,
    value: string | number
  ) => {
    const currentValues = filters[key] as (string | number)[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    onFilterChange({ ...filters, [key]: newValues });
  };

  const toggleBooleanFilter = (key: keyof FilterState) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const FilterSection = ({
    id,
    title,
    icon,
    children,
  }: {
    id: string;
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const isOpen = openSections.includes(id);

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(id)}>
        <CollapsibleTrigger className={cn(
          "flex items-center justify-between w-full py-3 text-sm font-medium transition-colors",
          isOpen ? "text-primary" : "text-foreground hover:text-primary"
        )}>
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-4 space-y-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const collapseAllSections = useCallback(() => {
    setOpenSections([]);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-start gap-2">
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="rounded-full">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 -ml-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onReset(); toast.success('Filtros resetados'); }}
            className="text-xs h-7 px-3 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            aria-label="Resetar todos os filtros"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAllSections}
            className="text-xs h-7 px-3 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            aria-label="Colapsar todas as seções de filtro"
          >
            <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
            Closer
          </Button>
        </div>
      </div>


      <div className="divide-y divide-border">
        {/* Cores - Inline com Radix Tooltip (#1 + #10) */}
        <FilterSection id="cores" title="Cores" icon={<Palette className="h-4 w-4" />}>
          <InlineColorGroupFilter
            selection={{
              groups: filters.colorGroups,
              variations: filters.colorVariations,
              nuances: filters.colorNuances,
            }}
            onChange={(selection: ColorFilterSelection) => {
              onFilterChange({
                ...filters,
                colorGroups: selection.groups,
                colorVariations: selection.variations,
                colorNuances: selection.nuances,
              });
            }}
            showNuances={true}
            showVariations={true}
          />
        </FilterSection>

        {/* Categorias - Sistema com categorias externas */}
        <FilterSection id="categorias" title="Categorias">
          <ExternalCategoryFilter
            selectedCategories={filters.categories}
            onCategoriesChange={(categories) => 
              onFilterChange({ ...filters, categories })
            }
            compact
          />
        </FilterSection>

        {/* Estoque */}
        <FilterSection id="estoque" title="Estoque">
          <div className="px-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs whitespace-nowrap">Mínimo por cor</span>
              <DebouncedPriceInput
                value={filters.minStock || ''}
                onChange={(v) => onFilterChange({ ...filters, minStock: v })}
                fallback={0}
                placeholder="Ex: 500"
                min={0}
                className={filters.minStock > 0 ? 'border-primary/60' : ''}
              />
              <span className="text-muted-foreground text-xs">un.</span>
            </div>
          </div>
        </FilterSection>

        {/* Preço - com inputs numéricos editáveis (#6) */}
        <FilterSection id="preco" title="Faixa de Preço">
          <div className="px-1">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-muted-foreground text-xs">R$</span>
                <DebouncedPriceInput
                  value={filters.priceRange[0]}
                  onChange={(v) => onFilterChange({ ...filters, priceRange: [v, filters.priceRange[1]] })}
                  fallback={0}
                  min={0}
                  className={filters.priceRange[0] > 0 ? 'border-primary/60' : ''}
                />
              </div>
              <span className="text-muted-foreground text-xs">até</span>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-muted-foreground text-xs">R$</span>
                <DebouncedPriceInput
                  value={filters.priceRange[1] >= 9999 ? '' : filters.priceRange[1]}
                  onChange={(v) => onFilterChange({ ...filters, priceRange: [filters.priceRange[0], v || 9999] })}
                  fallback={9999}
                  placeholder="Sem limite"
                  min={0}
                  className={filters.priceRange[1] < 9999 ? 'border-primary/60' : ''}
                />
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Fornecedores - com busca (#7) */}
        <FilterSection id="fornecedores" title="Fornecedores">
          <div className="space-y-2">
            {/* Busca de fornecedores */}
            {!suppliersLoading && supplierOptions.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar fornecedor..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="h-8 text-sm pl-8 pr-8"
                  aria-label="Buscar fornecedor por nome"
                />
                {supplierSearch && (
                  <button
                    type="button"
                    onClick={() => setSupplierSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            {suppliersLoading ? (
              <>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
              </>
            ) : supplierOptions.length > 0 ? (
              <div className="max-h-48 overflow-y-auto overscroll-contain pr-2" style={{ overscrollBehavior: 'contain' }}>
                <div className="space-y-2">
                  {supplierOptions
                    .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                    .map((supplier) => (
                    <div key={supplier.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`sup-${supplier.id}`}
                        checked={filters.suppliers.includes(supplier.id)}
                        onCheckedChange={() => toggleArrayFilter('suppliers', supplier.id)}
                      />
                      <Label htmlFor={`sup-${supplier.id}`} className="text-sm cursor-pointer flex items-center gap-2">
                        <span>{supplier.name}</span>
                        {supplier.leadTimeDays && (
                          <span className="text-xs text-muted-foreground">({supplier.leadTimeDays}d)</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum fornecedor disponível</p>
            )}
          </div>
        </FilterSection>

        {/* Público-Alvo */}
        <FilterSection id="publico" title="Público-Alvo">
          {publicoAlvoOptions.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain scrollbar-thin" style={{ overscrollBehavior: 'contain' }}>
              {publicoAlvoOptions.map((publico) => (
                <div key={publico} className="flex items-center gap-2">
                  <Checkbox
                    id={`pub-${publico}`}
                    checked={filters.publicoAlvo.includes(publico)}
                    onCheckedChange={() => toggleArrayFilter('publicoAlvo', publico)}
                  />
                  <Label htmlFor={`pub-${publico}`} className="text-sm cursor-pointer">
                    {toTitleCase(publico)}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Carregando opções dos produtos...</p>
          )}
        </FilterSection>

        {/* Datas Comemorativas - Agora com dados reais da API */}
        <FilterSection id="datas-comemorativas" title="Datas Comemorativas">
          <CommemorativeDateFilter
            selectedDates={filters.datasComemorativas}
            onToggleDate={(slug) => toggleArrayFilter('datasComemorativas', slug)}
            onClearDates={() => onFilterChange({ ...filters, datasComemorativas: [] })}
            compact
          />
        </FilterSection>

        {/* Endomarketing */}
        <FilterSection id="endomarketing" title="Endomarketing">
          {endomarketingOptions.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {endomarketingOptions.map((endo) => (
                <div key={endo} className="flex items-center gap-2">
                  <Checkbox
                    id={`endo-${endo}`}
                    checked={filters.endomarketing.includes(endo)}
                    onCheckedChange={() => toggleArrayFilter('endomarketing', endo)}
                  />
                  <Label htmlFor={`endo-${endo}`} className="text-sm cursor-pointer">
                    {toTitleCase(endo)}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Carregando opções dos produtos...</p>
          )}
        </FilterSection>

        {/* Materiais - Sistema Dinâmico com Accordion */}
        <FilterSection id="materiais" title="Materiais">
          <div className="space-y-3">
            {/* Badges dos materiais selecionados */}
            {(materialFilterState.selectedGroups.length > 0 || materialFilterState.selectedTypes.length > 0) && (
              <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                    <Gem className="h-3 w-3" />
                    Selecionados
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      materialFilterState.selectedGroups.forEach(slug => toggleMaterialGroup(slug));
                      materialFilterState.selectedTypes.forEach(slug => toggleMaterialType(slug));
                    }}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Limpar todos os materiais selecionados"
                  >
                    Limpar todos
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {materialFilterState.selectedGroups.map(slug => {
                    const group = materialGroups.find(g => g.group_slug === slug);
                    return group ? (
                      <MaterialBadge
                        key={`group-${slug}`}
                        name={group.group_name}
                        hexCode={group.group_hex_code}
                        size="sm"
                        variant="solid"
                        onRemove={() => toggleMaterialGroup(slug)}
                      />
                    ) : null;
                  })}
                  {materialFilterState.selectedTypes.map(slug => {
                    const material = allMaterials.find(m => m.type_slug === slug);
                    const group = material ? materialGroups.find(g => g.group_slug === material.group_slug) : null;
                    return material ? (
                      <MaterialBadge
                        key={`type-${slug}`}
                        name={material.type_name}
                        hexCode={group?.group_hex_code}
                        size="sm"
                        variant="outline"
                        onRemove={() => toggleMaterialType(slug)}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Busca de materiais */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar material..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="h-8 text-sm pl-8 pr-8"
                aria-label="Buscar material por nome"
              />
              {materialSearch && (
                <button
                  type="button"
                  onClick={() => setMaterialSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca de material"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Estatísticas rápidas */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>{materialGroups.length} grupos</span>
              <span>•</span>
              <span>{allMaterials.length} materiais</span>
              <span>•</span>
              <span className="text-primary font-medium">
                {materialFilterState.selectedGroups.length + materialFilterState.selectedTypes.length} selecionados
              </span>
            </div>
            
            {/* Loading */}
            {materialsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-1.5 pr-3">
                  {/* Grupos de materiais com accordion */}
                  {materialGroups
                    .filter(g => 
                      !materialSearch || 
                      g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                      getTypesForGroup(g.group_slug).some(t => 
                        t.type_name.toLowerCase().includes(materialSearch.toLowerCase())
                      )
                    )
                    .map(group => {
                      const types = getTypesForGroup(group.group_slug);
                      const isOpen = openSections.includes(`mat-${group.group_slug}`);
                      const isSelected = isMaterialGroupSelected(group.group_slug);
                      const selectedTypesCount = types.filter(t => 
                        materialFilterState.selectedTypes.includes(t.type_slug)
                      ).length;
                      const hasSelection = isSelected || selectedTypesCount > 0;
                      
                      return (
                        <div 
                          key={group.group_slug} 
                          className={cn(
                            "rounded-lg border transition-all",
                            hasSelection 
                              ? "border-primary/30 bg-primary/5" 
                              : "border-border/50 hover:border-border"
                          )}
                        >
                          {/* Header do grupo */}
                          <div className="flex items-center gap-2 p-2">
                            {/* Checkbox do grupo */}
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleMaterialGroup(group.group_slug)}
                              className="h-4 w-4"
                            />
                            
                            
                            {/* Nome do grupo e contador */}
                            <button
                              type="button"
                              onClick={() => toggleSection(`mat-${group.group_slug}`)}
                              className="flex-1 flex items-center justify-between text-left"
                              aria-label={`${openSections.includes(`mat-${group.group_slug}`) ? 'Recolher' : 'Expandir'} tipos de ${group.group_name}`}
                            >
                              <span className={cn(
                                "text-sm font-medium",
                                hasSelection && "text-primary"
                              )}>
                                {group.group_name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {selectedTypesCount > 0 && (
                                  <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                                    {selectedTypesCount}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="h-4 text-[10px] px-1.5">
                                  {types.length}
                                </Badge>
                                {isOpen ? (
                                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </button>
                          </div>
                          
                          {/* Tipos de material (expandido) */}
                          {isOpen && types.length > 0 && (
                            <div className="px-2 pb-2 pt-1 border-t border-border/30">
                              <div className="space-y-1 pl-6">
                                {types
                                  .filter(t => 
                                    !materialSearch || 
                                    t.type_name.toLowerCase().includes(materialSearch.toLowerCase())
                                  )
                                  .map(type => {
                                    const isTypeSelected = materialFilterState.selectedTypes.includes(type.type_slug);
                                    return (
                                      <div 
                                        key={type.type_slug} 
                                        className={cn(
                                          "flex items-center gap-2 py-1 px-2 rounded-md transition-colors",
                                          isTypeSelected 
                                            ? "bg-primary/10" 
                                            : "hover:bg-muted/50"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isTypeSelected}
                                          onCheckedChange={() => toggleMaterialType(type.type_slug)}
                                          className="h-3.5 w-3.5"
                                        />
                                        <Label className="text-xs cursor-pointer flex-1">
                                          {type.type_name}
                                        </Label>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                  {/* Nenhum material encontrado */}
                  {materialGroups.filter(g => 
                    !materialSearch || 
                    g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                    getTypesForGroup(g.group_slug).some(t => 
                      t.type_name.toLowerCase().includes(materialSearch.toLowerCase())
                    )
                  ).length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      Nenhum material encontrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </FilterSection>

        {/* Ramos de Atividade (Nichos/Segmentos) - Sistema Hierárquico */}
        <FilterSection id="ramos-atividade" title="Nichos/Segmentos">
          <div className="space-y-3">
            {/* Badges dos ramos/segmentos selecionados */}
            {(filters.ramosAtividade.length > 0 || filters.segmentosAtividade.length > 0) && (
              <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    Selecionados
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onFilterChange({
                        ...filters,
                        ramosAtividade: [],
                        segmentosAtividade: [],
                      });
                    }}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Limpar todos os nichos e segmentos selecionados"
                  >
                    Limpar todos
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {filters.ramosAtividade.map(slug => {
                    const group = ramoGroups.find(g => g.group_slug === slug);
                    return group ? (
                      <RamoAtividadeBadge
                        key={`ramo-${slug}`}
                        name={group.group_name}
                        hexCode={group.group_hex_code}
                        size="sm"
                        variant="solid"
                        onRemove={() => {
                          const segmentosNoRamo = getSegmentosForRamo(slug).map(s => s.segmento_slug);
                          onFilterChange({
                            ...filters,
                            ramosAtividade: filters.ramosAtividade.filter(r => r !== slug),
                            segmentosAtividade: filters.segmentosAtividade.filter(s => !segmentosNoRamo.includes(s)),
                          });
                        }}
                      />
                    ) : null;
                  })}
                  {filters.segmentosAtividade.map(slug => {
                    const segmento = allSegmentos.find(s => s.segmento_slug === slug);
                    const group = segmento ? ramoGroups.find(g => g.group_slug === segmento.ramo_slug) : null;
                    return segmento ? (
                      <RamoAtividadeBadge
                        key={`seg-${slug}`}
                        name={segmento.segmento_name}
                        hexCode={group?.group_hex_code}
                        size="sm"
                        variant="outline"
                        onRemove={() => {
                          onFilterChange({
                            ...filters,
                            segmentosAtividade: filters.segmentosAtividade.filter(s => s !== slug),
                          });
                        }}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Busca de ramos/segmentos */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar nicho/segmento..."
                value={ramoSearch}
                onChange={(e) => setRamoSearch(e.target.value)}
                className="h-8 text-sm pl-8 pr-8"
                aria-label="Buscar nicho ou segmento de atividade"
              />
              {ramoSearch && (
                <button
                  type="button"
                  onClick={() => setRamoSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca de nicho/segmento"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Estatísticas rápidas */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>{totalRamoGroups} ramos</span>
              <span>•</span>
              <span>{totalRamoSegmentos} segmentos</span>
              <span>•</span>
              <span className="text-primary font-medium">
                {filters.ramosAtividade.length + filters.segmentosAtividade.length} selecionados
              </span>
            </div>

            {/* Loading */}
            {ramosLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-1.5 pr-3">
                  {/* Grupos de ramos com accordion */}
                  {ramoGroups
                    .filter(g => 
                      !ramoSearch || 
                      g.group_name.toLowerCase().includes(ramoSearch.toLowerCase()) ||
                      getSegmentosForRamo(g.group_slug).some(s => 
                        s.segmento_name.toLowerCase().includes(ramoSearch.toLowerCase())
                      )
                    )
                    .map(group => {
                      const segmentos = getSegmentosForRamo(group.group_slug).filter(s =>
                        !ramoSearch || s.segmento_name.toLowerCase().includes(ramoSearch.toLowerCase())
                      );
                      const isRamoSelected = filters.ramosAtividade.includes(group.group_slug);
                      
                      return (
                        <RamoAtividadeGroupAccordion
                          key={group.group_slug}
                          group={group}
                          segmentos={segmentos}
                          isRamoSelected={isRamoSelected}
                          selectedSegmentos={filters.segmentosAtividade}
                          productCountsByRamo={productCountsByRamo}
                          onRamoToggle={(ramoSlug) => {
                            const currentSelected = filters.ramosAtividade.includes(ramoSlug);
                            if (currentSelected) {
                              // Remove ramo e todos os segmentos desse ramo
                              const segmentosNoRamo = getSegmentosForRamo(ramoSlug).map(s => s.segmento_slug);
                              onFilterChange({
                                ...filters,
                                ramosAtividade: filters.ramosAtividade.filter(r => r !== ramoSlug),
                                segmentosAtividade: filters.segmentosAtividade.filter(s => !segmentosNoRamo.includes(s)),
                              });
                            } else {
                              onFilterChange({
                                ...filters,
                                ramosAtividade: [...filters.ramosAtividade, ramoSlug],
                              });
                            }
                          }}
                          onSegmentoToggle={(segmentoSlug) => {
                            const currentSelected = filters.segmentosAtividade.includes(segmentoSlug);
                            if (currentSelected) {
                              onFilterChange({
                                ...filters,
                                segmentosAtividade: filters.segmentosAtividade.filter(s => s !== segmentoSlug),
                              });
                            } else {
                              onFilterChange({
                                ...filters,
                                segmentosAtividade: [...filters.segmentosAtividade, segmentoSlug],
                              });
                            }
                          }}
                          defaultOpen={isRamoSelected || segmentos.some(s => filters.segmentosAtividade.includes(s.segmento_slug))}
                          compact
                        />
                      );
                    })}
                    
                  {/* Nenhum ramo encontrado */}
                  {ramoGroups.filter(g => 
                    !ramoSearch || 
                    g.group_name.toLowerCase().includes(ramoSearch.toLowerCase()) ||
                    getSegmentosForRamo(g.group_slug).some(s => 
                      s.segmento_name.toLowerCase().includes(ramoSearch.toLowerCase())
                    )
                  ).length === 0 && (
                    <p className="text-sm text-muted-foreground py-2 text-center">
                      Nenhum nicho/segmento encontrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </FilterSection>

        {/* Técnicas de Gravação (#2) */}
        {techniqueOptions.length > 0 && (
          <FilterSection id="tecnicas" title="Técnicas de Gravação" icon={<Paintbrush className="h-4 w-4" />}>
            <div className="max-h-40 overflow-y-auto overscroll-contain pr-3" style={{ overscrollBehavior: 'contain' }}>
              <div className="space-y-2">
                {techniqueOptions.map(tech => (
                  <div key={tech.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`tech-${tech.id}`}
                      checked={(filters.techniques || []).includes(tech.id)}
                      onCheckedChange={() => toggleArrayFilter('techniques', tech.id)}
                    />
                    <Label
                      htmlFor={`tech-${tech.id}`}
                      className="text-sm cursor-pointer flex-1 flex items-center justify-between"
                    >
                      <span>{tech.name}</span>
                      {tech.estimatedDays && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tech.estimatedDays}d
                        </span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </FilterSection>
        )}

        {/* Tags (#2) */}
        {tagOptions.length > 0 && (
          <FilterSection id="tags" title="Tags" icon={<Tag className="h-4 w-4" />}>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1" style={{ overscrollBehavior: 'contain' }}>
              {tagOptions.slice(0, 20).map(tag => (
                <button
                  key={tag.id}
                  onClick={() => toggleArrayFilter('tags', tag.id)}
                  aria-label={`Tag ${tag.name}`}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border transition-all",
                    (filters.tags || []).includes(tag.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Opções Rápidas (#2) */}
        <FilterSection id="opcoes-rapidas" title="Opções Rápidas" icon={<Sparkles className="h-4 w-4" />}>
          <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain" style={{ overscrollBehavior: 'contain' }}>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-isKit"
                checked={filters.isKit}
                onCheckedChange={() => toggleBooleanFilter('isKit')}
              />
              <Label htmlFor="filter-isKit" className="text-sm cursor-pointer">
                Apenas KITs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-featured"
                checked={filters.featured}
                onCheckedChange={() => toggleBooleanFilter('featured')}
              />
              <Label htmlFor="filter-featured" className="text-sm cursor-pointer">
                Destaques
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-isNew"
                checked={filters.isNew}
                onCheckedChange={() => toggleBooleanFilter('isNew')}
              />
              <Label htmlFor="filter-isNew" className="text-sm cursor-pointer">
                Novidades
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-hasPersonalization"
                checked={filters.hasPersonalization}
                onCheckedChange={() => toggleBooleanFilter('hasPersonalization')}
              />
              <Label htmlFor="filter-hasPersonalization" className="text-sm cursor-pointer">
                Com Personalização
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="filter-inStock"
                checked={filters.inStock}
                onCheckedChange={() => toggleBooleanFilter('inStock')}
              />
              <Label htmlFor="filter-inStock" className="text-sm cursor-pointer">
                Em Estoque
              </Label>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-warning/20 bg-warning/5">
              <Checkbox
                id="has-commercial-packaging"
                checked={filters.hasCommercialPackaging}
                onCheckedChange={() => toggleBooleanFilter('hasCommercialPackaging')}
                className="border-warning/50 data-[state=checked]:bg-warning data-[state=checked]:border-warning"
              />
              <Label htmlFor="has-commercial-packaging" className="text-sm cursor-pointer flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-warning" />
                Com Embalagem Nativa
              </Label>
            </div>
          </div>
        </FilterSection>

        {/* Ordenação (#2) */}
        <FilterSection id="ordenacao" title="Ordenar por" icon={<Filter className="h-4 w-4" />}>
          <Select
            value={filters.sortBy || 'name'}
            onValueChange={(value) => onFilterChange({ ...filters, sortBy: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>
      </div>
    </div>
  );
}
