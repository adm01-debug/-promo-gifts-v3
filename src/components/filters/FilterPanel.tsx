import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Search, X, Gem } from "lucide-react";

// Função para padronizar texto: primeira letra maiúscula, resto minúsculo
// Mantém preposições em minúsculo
const toTitleCase = (str: string): string => {
  const prepositions = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por'];
  return str
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index > 0 && prepositions.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useCategoryIcons, getCategoryIcon } from "@/hooks/useCategoryIcons";
import { useMaterialFilter } from "@/hooks/useMaterialFilter";
import { MaterialBadge } from "@/components/materials/MaterialBadge";
import { ColorGroupFilter, ColorFilterSelection } from "./ColorGroupFilter";
import {
  CATEGORIES,
  SUPPLIERS,
  PUBLICO_ALVO,
  DATAS_COMEMORATIVAS,
  ENDOMARKETING,
  NICHOS,
  FAIXAS_PRECO,
} from "@/data/mockData";

export interface FilterState {
  // Sistema hierárquico de cores
  colorGroups: string[];      // slugs dos grupos (Azul, Verde, etc.)
  colorVariations: string[];  // slugs das variações (Azul Royal, etc.)
  colorNuances: string[];     // slugs das nuances (Metalizado, etc.)
  // Mantém compatibilidade com o antigo
  colors: string[];
  categories: number[];
  suppliers: string[];
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
  nichos: string[];
  materiais: string[];
  priceRange: [number, number];
  inStock: boolean;
  isKit: boolean;
  featured: boolean;
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  activeFiltersCount: number;
}

export const defaultFilters: FilterState = {
  colorGroups: [],
  colorVariations: [],
  colorNuances: [],
  colors: [],
  categories: [],
  suppliers: [],
  publicoAlvo: [],
  datasComemorativas: [],
  endomarketing: [],
  nichos: [],
  materiais: [],
  priceRange: [0, 500],
  inStock: false,
  isKit: false,
  featured: false,
};

export function FilterPanel({ filters, onFilterChange, onReset, activeFiltersCount }: FilterPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(['cores', 'categorias', 'preco', 'materiais']);
  const [materialSearch, setMaterialSearch] = useState('');
  const { data: categoryIcons = [] } = useCategoryIcons();

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
  } = useMaterialFilter();

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
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-sm font-medium hover:text-primary transition-colors">
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-semibold text-foreground">Filtros</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="rounded-full">
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
        {/* Cores - Sistema Hierárquico */}
        <div className="py-3">
          <ColorGroupFilter
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
        </div>

        {/* Categorias */}
        <FilterSection id="categorias" title="Categorias">
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {CATEGORIES.map((category) => {
              const icon = getCategoryIcon(category.name, categoryIcons) !== '📦' 
                ? getCategoryIcon(category.name, categoryIcons) 
                : category.icon || '📦';
              return (
                <div key={category.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${category.id}`}
                    checked={filters.categories.includes(category.id)}
                    onCheckedChange={() => toggleArrayFilter('categories', category.id)}
                  />
                  <Label
                    htmlFor={`cat-${category.id}`}
                    className="text-sm cursor-pointer flex items-center gap-1.5 leading-tight"
                  >
                    <span className="flex-shrink-0">{icon}</span>
                    <span className="break-words">{toTitleCase(category.name)}</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </FilterSection>

        {/* Preço */}
        <FilterSection id="preco" title="Faixa de Preço">
          <div className="space-y-4 px-1">
            <Slider
              value={filters.priceRange}
              onValueChange={(value) =>
                onFilterChange({ ...filters, priceRange: value as [number, number] })
              }
              min={0}
              max={500}
              step={10}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>R$ {filters.priceRange[0]}</span>
              <span>R$ {filters.priceRange[1]}+</span>
            </div>
          </div>
        </FilterSection>

        {/* Fornecedores */}
        <FilterSection id="fornecedores" title="Fornecedores">
          <div className="space-y-2">
            {SUPPLIERS.map((supplier) => (
              <div key={supplier.id} className="flex items-center gap-2">
                <Checkbox
                  id={`sup-${supplier.id}`}
                  checked={filters.suppliers.includes(supplier.id)}
                  onCheckedChange={() => toggleArrayFilter('suppliers', supplier.id)}
                />
                <Label htmlFor={`sup-${supplier.id}`} className="text-sm cursor-pointer">
                  {supplier.name}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Público-Alvo */}
        <FilterSection id="publico" title="Público-Alvo">
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {[...PUBLICO_ALVO].sort((a, b) => a.localeCompare(b)).map((publico) => (
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
        </FilterSection>

        {/* Datas Comemorativas */}
        <FilterSection id="datas" title="Datas Comemorativas">
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
            {[...DATAS_COMEMORATIVAS].sort((a, b) => a.localeCompare(b)).map((data) => (
              <div key={data} className="flex items-center gap-2">
                <Checkbox
                  id={`data-${data}`}
                  checked={filters.datasComemorativas.includes(data)}
                  onCheckedChange={() => toggleArrayFilter('datasComemorativas', data)}
                />
                <Label htmlFor={`data-${data}`} className="text-sm cursor-pointer">
                  {toTitleCase(data)}
                </Label>
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Endomarketing */}
        <FilterSection id="endomarketing" title="Endomarketing">
          <div className="flex flex-wrap gap-1.5">
            {ENDOMARKETING.slice(0, 6).map((endo) => (
              <button
                key={endo}
                onClick={() => toggleArrayFilter('endomarketing', endo)}
                className={cn(
                  "filter-tag",
                  filters.endomarketing.includes(endo) && "active"
                )}
              >
                {endo}
              </button>
            ))}
          </div>
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
                            
                            {/* Cor do grupo */}
                            {group.group_hex_code && (
                              <div 
                                className="w-3 h-3 rounded-full ring-1 ring-border/50"
                                style={{ backgroundColor: group.group_hex_code }}
                              />
                            )}
                            
                            {/* Nome do grupo e contador */}
                            <button
                              type="button"
                              onClick={() => toggleSection(`mat-${group.group_slug}`)}
                              className="flex-1 flex items-center justify-between text-left"
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

        {/* Nichos */}
        <FilterSection id="nichos" title="Nichos/Segmentos">
          <div className="flex flex-wrap gap-1.5">
            {NICHOS.slice(0, 8).map((nicho) => (
              <button
                key={nicho}
                onClick={() => toggleArrayFilter('nichos', nicho)}
                className={cn(
                  "filter-tag",
                  filters.nichos.includes(nicho) && "active"
                )}
              >
                {nicho}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Opções Rápidas */}
        <FilterSection id="opcoes" title="Opções Rápidas">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="in-stock"
                checked={filters.inStock}
                onCheckedChange={() => toggleBooleanFilter('inStock')}
              />
              <Label htmlFor="in-stock" className="text-sm cursor-pointer">
                Apenas em estoque
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-kit"
                checked={filters.isKit}
                onCheckedChange={() => toggleBooleanFilter('isKit')}
              />
              <Label htmlFor="is-kit" className="text-sm cursor-pointer">
                Apenas KITs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="featured"
                checked={filters.featured}
                onCheckedChange={() => toggleBooleanFilter('featured')}
              />
              <Label htmlFor="featured" className="text-sm cursor-pointer">
                Apenas destaques
              </Label>
            </div>
          </div>
        </FilterSection>
      </div>
    </div>
  );
}
