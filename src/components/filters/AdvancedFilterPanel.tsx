import React, { useState, useEffect, useMemo } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Package,
  Truck,
  Layers,
  Tag,
  DollarSign,
  Clock,
  Filter,
  Sparkles,
  Box,
  Paintbrush,
  Search,
  X,
  Gem,
  Calendar,
  Users,
  Building2,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { 
  useAdvancedFilters, 
  AdvancedFilterState, 
  STOCK_FILTER_OPTIONS,
  SORT_OPTIONS,
  CategoryOption,
} from "@/hooks/useAdvancedFilters";
import { useMaterialFilter } from "@/hooks/useMaterialFilter";
import { useRamoAtividadeFilter } from "@/hooks/useRamoAtividadeFilter";
import { MaterialBadge } from "@/components/materials/MaterialBadge";
import { RamoAtividadeBadge } from "@/components/ramo-atividade/RamoAtividadeBadge";
import { RamoAtividadeGroupAccordion } from "@/components/ramo-atividade/RamoAtividadeGroupAccordion";
import { ColorGroupFilter, ColorFilterSelection } from "./ColorGroupFilter";
import { CommemorativeDateFilter } from "./CommemorativeDateFilter";
import { PUBLICO_ALVO, ENDOMARKETING } from "@/data/mockData";

import { toTitleCase } from "@/lib/textUtils";

interface AdvancedFilterPanelProps {
  filters: AdvancedFilterState;
  onFilterChange: (filters: AdvancedFilterState) => void;
  onReset: () => void;
  activeFiltersCount: number;
  className?: string;
}

export function AdvancedFilterPanel({ 
  filters, 
  onFilterChange, 
  onReset, 
  activeFiltersCount,
  className 
}: AdvancedFilterPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(['search', 'categories', 'stock', 'materials', 'colors']);
  const [categorySearch, setCategorySearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [ramoSearch, setRamoSearch] = useState('');
  
  const {
    isLoading,
    categoryOptions,
    techniqueOptions,
    supplierOptions,
    tagOptions,
  } = useAdvancedFilters();

  // Hook de materiais
  const {
    groups: materialGroups,
    materials: allMaterials,
    byGroup: materialsByGroup,
    isLoading: materialsLoading,
    filterState: materialFilterState,
    toggleGroup: toggleMaterialGroup,
    toggleType: toggleMaterialType,
    isGroupSelected: isMaterialGroupSelected,
    getTypesForGroup,
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
  React.useEffect(() => {
    if (materialGroups.length > 0 && (materialFilterState.selectedGroups.length > 0 || materialFilterState.selectedTypes.length > 0)) {
      const groupsWithSelection = new Set<string>();
      
      // Adicionar grupos selecionados
      materialFilterState.selectedGroups.forEach(slug => {
        groupsWithSelection.add(`mat-${slug}`);
      });
      
      // Adicionar grupos que contêm tipos selecionados
      materialFilterState.selectedTypes.forEach(typeSlug => {
        const material = allMaterials.find(m => m.type_slug === typeSlug);
        if (material) {
          groupsWithSelection.add(`mat-${material.group_slug}`);
        }
      });
      
      // Expandir esses grupos se ainda não estiverem abertos
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

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const toggleArrayFilter = (
    key: keyof AdvancedFilterState,
    value: string
  ) => {
    const currentValues = filters[key] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange({ ...filters, [key]: newValues });
  };

  const updateFilter = <K extends keyof AdvancedFilterState>(
    key: K,
    value: AdvancedFilterState[K]
  ) => {
    onFilterChange({ ...filters, [key]: value });
  };

  // Filtrar categorias pela busca
  const filteredCategories = categoryOptions.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Componente de seção colapsável
  const FilterSection = ({
    id,
    title,
    icon,
    badge,
    children,
  }: {
    id: string;
    title: string;
    icon?: React.ReactNode;
    badge?: number;
    children: React.ReactNode;
  }) => {
    const isOpen = openSections.includes(id);

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(id)}>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-sm font-medium hover:text-primary transition-colors">
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
            {badge !== undefined && badge > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 flex items-center justify-center text-xs">
                {badge}
              </Badge>
            )}
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

  // Renderizar categoria com indentação
  const renderCategoryItem = (category: CategoryOption) => (
    <div 
      key={category.id} 
      className="flex items-center gap-2"
      style={{ paddingLeft: `${category.level * 12}px` }}
    >
      <Checkbox
        id={`cat-${category.id}`}
        checked={filters.categories.includes(category.id)}
        onCheckedChange={() => toggleArrayFilter('categories', category.id)}
      />
      <Label
        htmlFor={`cat-${category.id}`}
        className="text-sm cursor-pointer truncate flex-1"
        title={category.name}
      >
        {category.level > 0 && <span className="text-muted-foreground mr-1">└</span>}
        {category.name}
      </Label>
    </div>
  );

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Super Filtro</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="rounded-full">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* Busca */}
        <FilterSection id="search" title="Buscar" icon={<Search className="h-4 w-4" />}>
          <div className="relative">
            <Input
              placeholder="Nome, SKU, descrição..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pr-8"
            />
            {filters.search && (
              <button
                onClick={() => updateFilter('search', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </FilterSection>

        {/* Categorias com busca */}
        <FilterSection 
          id="categories" 
          title="Categorias" 
          icon={<Layers className="h-4 w-4" />}
          badge={filters.categories.length}
        >
          <div className="space-y-2">
            <Input
              placeholder="Buscar categoria..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="h-8 text-sm"
            />
            <ScrollArea className="h-48">
              <div className="space-y-1 pr-3">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map(renderCategoryItem)
                ) : (
                  <p className="text-sm text-muted-foreground py-2">Nenhuma categoria encontrada</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </FilterSection>

        {/* Status de Estoque */}
        <FilterSection 
          id="stock" 
          title="Estoque" 
          icon={<Package className="h-4 w-4" />}
          badge={filters.stockStatus !== 'all' ? 1 : 0}
        >
          <div className="space-y-3">
            <Select
              value={filters.stockStatus}
              onValueChange={(value) => updateFilter('stockStatus', value as AdvancedFilterState['stockStatus'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STOCK_FILTER_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {filters.stockStatus === 'in_stock' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Estoque mínimo: {filters.minStock} unidades
                </Label>
                <Slider
                  value={[filters.minStock]}
                  onValueChange={([value]) => updateFilter('minStock', value)}
                  min={0}
                  max={1000}
                  step={10}
                />
              </div>
            )}
          </div>
        </FilterSection>

        {/* Cores - Sistema Hierárquico */}
        <div className="py-3">
          <ColorGroupFilter
            selection={{
              groups: filters.colorGroups || [],
              variations: filters.colorVariations || [],
              nuances: filters.colorNuances || [],
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
        </div>

        {/* Materiais - Design Aprimorado */}
        <FilterSection 
          id="materials" 
          title="Materiais" 
          icon={<Gem className="h-4 w-4" />}
          badge={materialFilterState.selectedGroups.length + materialFilterState.selectedTypes.length}
        >
          <div className="space-y-3">
            {/* Badges dos materiais selecionados - No topo para melhor UX */}
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

            {/* Busca de materiais aprimorada */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar material ou grupo..."
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="h-8 text-sm pl-8 pr-8"
              />
              {materialSearch && (
                <button
                  type="button"
                  onClick={() => setMaterialSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            ) : (
              <ScrollArea className="h-56">
                <div className="space-y-1.5 pr-3">
                  {/* Grupos de materiais com design aprimorado */}
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
                      const hasAnySelection = isSelected || selectedTypesCount > 0;
                      
                      return (
                        <div 
                          key={group.group_id} 
                          className={cn(
                            "rounded-lg overflow-hidden transition-all duration-200",
                            hasAnySelection 
                              ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30" 
                              : "bg-muted/30 hover:bg-muted/50"
                          )}
                        >
                          {/* Header do grupo - Design aprimorado */}
                          <div className="flex items-center gap-2 p-2.5">
                            {/* Botão de expandir com animação */}
                            <button
                              type="button"
                              onClick={() => toggleSection(`mat-${group.group_slug}`)}
                              className={cn(
                                "p-1 rounded-md transition-all duration-200",
                                isOpen ? "bg-primary/10 rotate-0" : "bg-muted hover:bg-muted/80"
                              )}
                            >
                              <ChevronDown className={cn(
                                "h-3.5 w-3.5 transition-transform duration-200",
                                isOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                              )} />
                            </button>
                            
                            {/* Checkbox e info do grupo */}
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleMaterialGroup(group.group_slug)}
                                className={cn(
                                  "data-[state=checked]:bg-primary data-[state=checked]:border-primary",
                                  "transition-all duration-200"
                                )}
                              />
                              
                              {/* Indicador de cor do grupo */}
                              <div 
                                className={cn(
                                  "w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all",
                                  hasAnySelection ? "ring-primary/50 scale-110" : "ring-border/50"
                                )}
                                style={{ 
                                  backgroundColor: group.group_hex_code || 'hsl(var(--muted))',
                                  boxShadow: group.group_hex_code ? `0 2px 8px ${group.group_hex_code}40` : 'none'
                                }}
                              />
                              
                              {/* Nome do grupo */}
                              <span className={cn(
                                "text-sm font-medium truncate transition-colors",
                                hasAnySelection ? "text-primary" : "text-foreground"
                              )}>
                                {group.group_name}
                              </span>
                            </div>
                            
                            {/* Contadores */}
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {selectedTypesCount > 0 && (
                                <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                  {selectedTypesCount}
                                </span>
                              )}
                              <span className={cn(
                                "text-[11px] px-1.5 py-0.5 rounded-full",
                                hasAnySelection 
                                  ? "bg-primary/20 text-primary font-medium" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {group.total_materials}
                              </span>
                            </div>
                          </div>
                          
                          {/* Tipos do grupo - Design aprimorado */}
                          {isOpen && types.length > 0 && (
                            <div className="px-2.5 pb-2.5 space-y-0.5">
                              <div className="border-t border-border/30 pt-2 ml-8">
                                {types
                                  .filter(t => 
                                    !materialSearch || 
                                    t.type_name.toLowerCase().includes(materialSearch.toLowerCase())
                                  )
                                  .map(type => {
                                    const isTypeSelected = materialFilterState.selectedTypes.includes(type.type_slug);
                                    return (
                                      <label
                                        key={type.type_id}
                                        className={cn(
                                          "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150",
                                          isTypeSelected
                                            ? "bg-primary/15 text-foreground font-medium shadow-sm"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        )}
                                      >
                                        <Checkbox
                                          checked={isTypeSelected}
                                          onCheckedChange={() => toggleMaterialType(type.type_slug)}
                                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        {/* Mini indicador de cor herdado do grupo */}
                                        <span 
                                          className="w-2 h-2 rounded-full flex-shrink-0"
                                          style={{ backgroundColor: group.group_hex_code || 'hsl(var(--muted))' }}
                                        />
                                        <span className="truncate flex-1">{type.type_name}</span>
                                        {isTypeSelected && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        )}
                                      </label>
                                    );
                                  })
                                }
                              </div>
                            </div>
                          )}
                          
                          {/* Mensagem se grupo vazio */}
                          {isOpen && types.length === 0 && (
                            <div className="px-2.5 pb-2.5">
                              <div className="border-t border-border/30 pt-2 ml-8">
                                <p className="text-xs text-muted-foreground italic py-2">
                                  Nenhum material neste grupo
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                  
                  {/* Mensagem se nenhum grupo */}
                  {materialGroups.length === 0 && !materialsLoading && (
                    <div className="text-center py-8">
                      <Gem className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum material disponível
                      </p>
                    </div>
                  )}

                  {/* Mensagem se busca não encontrou */}
                  {materialSearch && materialGroups.filter(g => 
                    g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) ||
                    getTypesForGroup(g.group_slug).some(t => 
                      t.type_name.toLowerCase().includes(materialSearch.toLowerCase())
                    )
                  ).length === 0 && (
                    <div className="text-center py-6">
                      <Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum resultado para "{materialSearch}"
                      </p>
                      <button
                        type="button"
                        onClick={() => setMaterialSearch('')}
                        className="text-xs text-primary hover:underline mt-1"
                      >
                        Limpar busca
                      </button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </FilterSection>

        {/* Técnicas de Personalização */}
        <FilterSection 
          id="techniques" 
          title="Técnicas de Gravação" 
          icon={<Paintbrush className="h-4 w-4" />}
          badge={filters.techniques.length}
        >
            <div className="h-40 overflow-y-auto overscroll-contain pr-3" style={{ overscrollBehavior: 'contain' }}>
              <div className="space-y-2">
              {techniqueOptions.map(tech => (
                <div key={tech.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`tech-${tech.id}`}
                    checked={filters.techniques.includes(tech.id)}
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

        {/* Fornecedores */}
        <FilterSection 
          id="suppliers" 
          title="Fornecedores" 
          icon={<Truck className="h-4 w-4" />}
          badge={filters.suppliers.length}
        >
            <div className="h-32 overflow-y-auto overscroll-contain pr-3" style={{ overscrollBehavior: 'contain' }}>
              <div className="space-y-2">
              {supplierOptions.map(supplier => (
                <div key={supplier.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`sup-${supplier.id}`}
                    checked={filters.suppliers.includes(supplier.id)}
                    onCheckedChange={() => toggleArrayFilter('suppliers', supplier.id)}
                  />
                  <Label 
                    htmlFor={`sup-${supplier.id}`} 
                    className="text-sm cursor-pointer flex-1 flex items-center justify-between"
                  >
                    <span>{supplier.name}</span>
                    {supplier.leadTimeDays && (
                      <span className="text-xs text-muted-foreground">
                        {supplier.leadTimeDays}d
                      </span>
                    )}
                  </Label>
                </div>
              ))}
              </div>
            </div>
        </FilterSection>

        {/* Faixa de Preço */}
        <FilterSection 
          id="price" 
          title="Faixa de Preço" 
          icon={<DollarSign className="h-4 w-4" />}
          badge={filters.priceRange[0] > 0 || filters.priceRange[1] < 1000 ? 1 : 0}
        >
          <div className="px-1">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-muted-foreground text-xs">R$</span>
                <DebouncedPriceInput
                  value={filters.priceRange[0]}
                  onChange={(v) => updateFilter('priceRange', [v, filters.priceRange[1]])}
                  className={filters.priceRange[0] > 0 ? 'border-primary/60' : ''}
                />
              </div>
              <span className="text-muted-foreground text-xs">até</span>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-muted-foreground text-xs">R$</span>
                <DebouncedPriceInput
                  value={filters.priceRange[1]}
                  onChange={(v) => updateFilter('priceRange', [filters.priceRange[0], v])}
                  className={filters.priceRange[1] < 1000 ? 'border-primary/60' : ''}
                />
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Tiragem / Quantidade */}
        <FilterSection 
          id="quantity" 
          title="Tiragem" 
          icon={<Box className="h-4 w-4" />}
          badge={filters.quantityRange[0] > 1 || filters.quantityRange[1] < 10000 ? 1 : 0}
        >
          <div className="space-y-4 px-1">
            <Slider
              value={filters.quantityRange}
              onValueChange={(value) => updateFilter('quantityRange', value as [number, number])}
              min={1}
              max={10000}
              step={50}
            />
            <div className="flex items-center justify-between text-sm">
              <Input
                type="number"
                value={filters.quantityRange[0]}
                onChange={(e) => updateFilter('quantityRange', [Number(e.target.value), filters.quantityRange[1]])}
                className="w-24 h-8 text-sm"
                placeholder="Mín."
              />
              <span className="text-muted-foreground">até</span>
              <Input
                type="number"
                value={filters.quantityRange[1]}
                onChange={(e) => updateFilter('quantityRange', [filters.quantityRange[0], Number(e.target.value)])}
                className="w-24 h-8 text-sm"
                placeholder="Máx."
              />
            </div>
          </div>
        </FilterSection>

        {/* Datas Comemorativas */}
        <FilterSection 
          id="datas-comemorativas" 
          title="Datas Comemorativas" 
          icon={<Calendar className="h-4 w-4" />}
          badge={(filters.datasComemorativas?.length || 0)}
        >
          <CommemorativeDateFilter
            selectedDates={filters.datasComemorativas || []}
            onToggleDate={(slug) => toggleArrayFilter('datasComemorativas', slug)}
            onClearDates={() => onFilterChange({ ...filters, datasComemorativas: [] })}
            compact
          />
        </FilterSection>

        {/* Público-Alvo */}
        <FilterSection 
          id="publico" 
          title="Público-Alvo" 
          icon={<Users className="h-4 w-4" />}
          badge={(filters.publicoAlvo?.length || 0)}
        >
          <ScrollArea className="h-40">
            <div className="space-y-2 pr-3">
              {[...PUBLICO_ALVO].sort((a, b) => a.localeCompare(b)).map((publico) => (
                <div key={publico} className="flex items-center gap-2">
                  <Checkbox
                    id={`adv-pub-${publico}`}
                    checked={(filters.publicoAlvo || []).includes(publico)}
                    onCheckedChange={() => toggleArrayFilter('publicoAlvo', publico)}
                  />
                  <Label htmlFor={`adv-pub-${publico}`} className="text-sm cursor-pointer">
                    {toTitleCase(publico)}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </FilterSection>

        {/* Endomarketing */}
        <FilterSection 
          id="endomarketing" 
          title="Endomarketing" 
          icon={<Briefcase className="h-4 w-4" />}
          badge={(filters.endomarketing?.length || 0)}
        >
          <ScrollArea className="h-40">
            <div className="space-y-2 pr-3">
              {[...ENDOMARKETING].sort((a, b) => a.localeCompare(b)).map((endo) => (
                <div key={endo} className="flex items-center gap-2">
                  <Checkbox
                    id={`adv-endo-${endo}`}
                    checked={(filters.endomarketing || []).includes(endo)}
                    onCheckedChange={() => toggleArrayFilter('endomarketing', endo)}
                  />
                  <Label htmlFor={`adv-endo-${endo}`} className="text-sm cursor-pointer">
                    {toTitleCase(endo)}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </FilterSection>

        {/* Ramos de Atividade */}
        <FilterSection 
          id="ramos-atividade" 
          title="Ramos de Atividade" 
          icon={<Building2 className="h-4 w-4" />}
          badge={(filters.ramosAtividade?.length || 0) + (filters.segmentosAtividade?.length || 0)}
        >
          <div className="space-y-3">
            {/* Badges dos ramos selecionados */}
            {((filters.ramosAtividade?.length || 0) > 0 || (filters.segmentosAtividade?.length || 0) > 0) && (
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
                  >
                    Limpar todos
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(filters.ramosAtividade || []).map(slug => {
                    const ramo = ramoGroups.find(r => r.slug === slug);
                    return ramo ? (
                      <RamoAtividadeBadge
                        key={`ramo-${slug}`}
                        name={ramo.name}
                        size="sm"
                        variant="solid"
                        onRemove={() => {
                          onFilterChange({
                            ...filters,
                            ramosAtividade: (filters.ramosAtividade || []).filter(r => r !== slug),
                          });
                        }}
                      />
                    ) : null;
                  })}
                  {(filters.segmentosAtividade || []).map(slug => {
                    const segmento = allSegmentos.find(s => s.slug === slug);
                    return segmento ? (
                      <RamoAtividadeBadge
                        key={`seg-${slug}`}
                        name={segmento.name}
                        size="sm"
                        variant="outline"
                        onRemove={() => {
                          onFilterChange({
                            ...filters,
                            segmentosAtividade: (filters.segmentosAtividade || []).filter(s => s !== slug),
                          });
                        }}
                      />
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* Busca de ramos */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar ramo..."
                value={ramoSearch}
                onChange={(e) => setRamoSearch(e.target.value)}
                className="h-8 text-sm pl-8 pr-8"
              />
              {ramoSearch && (
                <button
                  type="button"
                  onClick={() => setRamoSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Loading */}
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
                      getSegmentosForRamo(ramo.slug).some(s => 
                        s.name.toLowerCase().includes(ramoSearch.toLowerCase())
                      )
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
                          onFilterChange({
                            ...filters,
                            ramosAtividade: current.includes(slug)
                              ? current.filter(r => r !== slug)
                              : [...current, slug],
                          });
                        }}
                        onToggleSegmento={(slug) => {
                          const current = filters.segmentosAtividade || [];
                          onFilterChange({
                            ...filters,
                            segmentosAtividade: current.includes(slug)
                              ? current.filter(s => s !== slug)
                              : [...current, slug],
                          });
                        }}
                      />
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </FilterSection>

        {/* Tags */}
        <FilterSection 
          id="tags" 
          title="Tags" 
          icon={<Tag className="h-4 w-4" />}
          badge={filters.tags.length}
        >
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.slice(0, 20).map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleArrayFilter('tags', tag.id)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border transition-all",
                  filters.tags.includes(tag.id)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Opções Rápidas */}
        <FilterSection 
          id="quick" 
          title="Opções Rápidas" 
          icon={<Sparkles className="h-4 w-4" />}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-kit"
                checked={filters.isKit}
                onCheckedChange={(checked) => updateFilter('isKit', checked as boolean)}
              />
              <Label htmlFor="is-kit" className="text-sm cursor-pointer">
                Apenas KITs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-featured"
                checked={filters.isFeatured}
                onCheckedChange={(checked) => updateFilter('isFeatured', checked as boolean)}
              />
              <Label htmlFor="is-featured" className="text-sm cursor-pointer">
                Destaques
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-new"
                checked={filters.isNew}
                onCheckedChange={(checked) => updateFilter('isNew', checked as boolean)}
              />
              <Label htmlFor="is-new" className="text-sm cursor-pointer">
                Novidades
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-personalization"
                checked={filters.hasPersonalization}
                onCheckedChange={(checked) => updateFilter('hasPersonalization', checked as boolean)}
              />
              <Label htmlFor="has-personalization" className="text-sm cursor-pointer">
                Com Personalização
              </Label>
            </div>
          </div>
        </FilterSection>

        {/* Ordenação */}
        <FilterSection 
          id="sort" 
          title="Ordenar por" 
          icon={<Filter className="h-4 w-4" />}
        >
          <Select
            value={filters.sortBy}
            onValueChange={(value) => updateFilter('sortBy', value as AdvancedFilterState['sortBy'])}
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
