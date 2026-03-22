import React, { useState, useEffect, useMemo } from "react";
import { 
  RefreshCw, Package, Truck, Layers, Tag, DollarSign, Clock,
  Filter, Sparkles, Box, Paintbrush, Search, X, Calendar, Users, Briefcase
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { 
  useAdvancedFilters, AdvancedFilterState, STOCK_FILTER_OPTIONS, SORT_OPTIONS, CategoryOption,
} from "@/hooks/useAdvancedFilters";
import { useMaterialFilter } from "@/hooks/useMaterialFilter";
import { useRamoAtividadeFilter } from "@/hooks/useRamoAtividadeFilter";
import { ColorGroupFilter, ColorFilterSelection } from "./ColorGroupFilter";
import { CommemorativeDateFilter } from "./CommemorativeDateFilter";
import { PUBLICO_ALVO, ENDOMARKETING } from "@/data/mockData";
import { toTitleCase } from "@/lib/textUtils";
import { FilterSection } from "./FilterSection";
import { FilterSectionMaterials } from "./sections/FilterSectionMaterials";
import { FilterSectionRamos } from "./sections/FilterSectionRamos";

interface AdvancedFilterPanelProps {
  filters: AdvancedFilterState;
  onFilterChange: (filters: AdvancedFilterState) => void;
  onReset: () => void;
  activeFiltersCount: number;
  className?: string;
}

export function AdvancedFilterPanel({ 
  filters, onFilterChange, onReset, activeFiltersCount, className 
}: AdvancedFilterPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  
  const { isLoading, categoryOptions, techniqueOptions, supplierOptions, tagOptions } = useAdvancedFilters();
  const {
    groups: materialGroups, materials: allMaterials,
    isLoading: materialsLoading, filterState: materialFilterState,
    toggleGroup: toggleMaterialGroup, toggleType: toggleMaterialType,
    isGroupSelected: isMaterialGroupSelected, getTypesForGroup,
  } = useMaterialFilter();
  const {
    groups: ramoGroups, segmentos: allSegmentos,
    isLoading: ramosLoading, getSegmentosForRamo,
  } = useRamoAtividadeFilter();

  // Auto-expand groups with selected materials
  useEffect(() => {
    if (materialGroups.length > 0 && (materialFilterState.selectedGroups.length > 0 || materialFilterState.selectedTypes.length > 0)) {
      const groupsWithSelection = new Set<string>();
      materialFilterState.selectedGroups.forEach(slug => groupsWithSelection.add(`mat-${slug}`));
      materialFilterState.selectedTypes.forEach(typeSlug => {
        const material = allMaterials.find(m => m.type_slug === typeSlug);
        if (material) groupsWithSelection.add(`mat-${material.group_slug}`);
      });
      setOpenSections(prev => {
        const newSections = [...prev];
        groupsWithSelection.forEach(section => { if (!newSections.includes(section)) newSections.push(section); });
        return newSections;
      });
    }
  }, [materialFilterState.selectedGroups, materialFilterState.selectedTypes, materialGroups, allMaterials]);

  const toggleSection = (section: string) => {
    setOpenSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
  };

  const toggleArrayFilter = (key: keyof AdvancedFilterState, value: string) => {
    const currentValues = filters[key] as string[];
    const newValues = currentValues.includes(value) ? currentValues.filter(v => v !== value) : [...currentValues, value];
    onFilterChange({ ...filters, [key]: newValues });
  };

  const updateFilter = <K extends keyof AdvancedFilterState>(key: K, value: AdvancedFilterState[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const filteredCategories = categoryOptions.filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()));

  const renderCategoryItem = (category: CategoryOption) => (
    <div key={category.id} className="flex items-center gap-2" style={{ paddingLeft: `${category.level * 12}px` }}>
      <Checkbox id={`cat-${category.id}`} checked={filters.categories.includes(category.id)} onCheckedChange={() => toggleArrayFilter('categories', category.id)} />
      <Label htmlFor={`cat-${category.id}`} className="text-sm cursor-pointer truncate flex-1" title={category.name}>
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
          {activeFiltersCount > 0 && <Badge variant="default" className="rounded-full">{activeFiltersCount}</Badge>}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="divide-y divide-border">
        {/* Busca */}
        <FilterSection id="search" title="Buscar" icon={<Search className="h-4 w-4" />} isOpen={openSections.includes("search")} onToggle={toggleSection}>
          <div className="relative">
            <Input placeholder="Nome, SKU, descrição..." value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} className="pr-8" />
            {filters.search && (
              <button onClick={() => updateFilter('search', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </FilterSection>

        {/* Categorias */}
        <FilterSection id="categories" title="Categorias" icon={<Layers className="h-4 w-4" />} badge={filters.categories.length} isOpen={openSections.includes("categories")} onToggle={toggleSection}>
          <div className="space-y-2">
            <Input placeholder="Buscar categoria..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} className="h-8 text-sm" />
            <ScrollArea className="h-48">
              <div className="space-y-1 pr-3">
                {filteredCategories.length > 0 ? filteredCategories.map(renderCategoryItem) : <p className="text-sm text-muted-foreground py-2">Nenhuma categoria encontrada</p>}
              </div>
            </ScrollArea>
          </div>
        </FilterSection>

        {/* Estoque Status */}
        <FilterSection id="stock-status" title="Status de Estoque" icon={<Package className="h-4 w-4" />} badge={filters.stockStatus !== 'all' ? 1 : 0} isOpen={openSections.includes("stock-status")} onToggle={toggleSection}>
          <div className="space-y-3">
            <Select value={filters.stockStatus} onValueChange={(value) => updateFilter('stockStatus', value as AdvancedFilterState['stockStatus'])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STOCK_FILTER_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {filters.stockStatus === 'in_stock' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Estoque mínimo: {filters.minStock} unidades</Label>
                <Slider value={[filters.minStock]} onValueChange={([value]) => updateFilter('minStock', value)} min={0} max={1000} step={10} />
              </div>
            )}
          </div>
        </FilterSection>

        {/* Cores */}
        <div className="py-3">
          <ColorGroupFilter
            selection={{ groups: filters.colorGroups || [], variations: filters.colorVariations || [], nuances: filters.colorNuances || [] }}
            onChange={(selection: ColorFilterSelection) => onFilterChange({ ...filters, colorGroups: selection.groups, colorVariations: selection.variations, colorNuances: selection.nuances })}
            showNuances={true} showVariations={true}
          />
        </div>

        {/* Materiais - Extracted */}
        <FilterSectionMaterials
          isOpen={openSections.includes("materials")}
          onToggle={toggleSection}
          materialGroups={materialGroups}
          allMaterials={allMaterials}
          materialsLoading={materialsLoading}
          selectedGroups={materialFilterState.selectedGroups}
          selectedTypes={materialFilterState.selectedTypes}
          toggleMaterialGroup={toggleMaterialGroup}
          toggleMaterialType={toggleMaterialType}
          isMaterialGroupSelected={isMaterialGroupSelected}
          getTypesForGroup={getTypesForGroup}
          openSections={openSections}
          onToggleSection={toggleSection}
        />

        {/* Técnicas */}
        <FilterSection id="techniques" title="Técnicas de Gravação" icon={<Paintbrush className="h-4 w-4" />} badge={filters.techniques.length} isOpen={openSections.includes("techniques")} onToggle={toggleSection}>
          <div className="h-40 overflow-y-auto overscroll-contain pr-3" style={{ overscrollBehavior: 'contain' }}>
            <div className="space-y-2">
              {techniqueOptions.map(tech => (
                <div key={tech.id} className="flex items-center gap-2">
                  <Checkbox id={`tech-${tech.id}`} checked={filters.techniques.includes(tech.id)} onCheckedChange={() => toggleArrayFilter('techniques', tech.id)} />
                  <Label htmlFor={`tech-${tech.id}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
                    <span>{tech.name}</span>
                    {tech.estimatedDays && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{tech.estimatedDays}d</span>}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Fornecedores */}
        <FilterSection id="suppliers" title="Fornecedores" icon={<Truck className="h-4 w-4" />} badge={filters.suppliers.length} isOpen={openSections.includes("suppliers")} onToggle={toggleSection}>
          <div className="h-32 overflow-y-auto overscroll-contain pr-3" style={{ overscrollBehavior: 'contain' }}>
            <div className="space-y-2">
              {supplierOptions.map(supplier => (
                <div key={supplier.id} className="flex items-center gap-2">
                  <Checkbox id={`sup-${supplier.id}`} checked={filters.suppliers.includes(supplier.id)} onCheckedChange={() => toggleArrayFilter('suppliers', supplier.id)} />
                  <Label htmlFor={`sup-${supplier.id}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
                    <span>{supplier.name}</span>
                    {supplier.leadTimeDays && <span className="text-xs text-muted-foreground">{supplier.leadTimeDays}d</span>}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </FilterSection>

        {/* Estoque Mínimo */}
        <FilterSection id="stock" title="Estoque Mínimo" icon={<Package className="h-4 w-4" />} badge={filters.minStock > 0 ? 1 : 0} isOpen={openSections.includes("stock")} onToggle={toggleSection}>
          <div className="px-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs whitespace-nowrap">Mínimo por cor</span>
              <DebouncedPriceInput value={filters.minStock || ''} onChange={(v) => updateFilter('minStock', v)} fallback={0} placeholder="Ex: 500" min={0} className={filters.minStock > 0 ? 'border-primary/60' : ''} />
              <span className="text-muted-foreground text-xs">un.</span>
            </div>
          </div>
        </FilterSection>

        {/* Preço */}
        <FilterSection id="price" title="Faixa de Preço" icon={<DollarSign className="h-4 w-4" />} badge={filters.priceRange[0] > 0 || filters.priceRange[1] < 1000 ? 1 : 0} isOpen={openSections.includes("price")} onToggle={toggleSection}>
          <div className="px-1">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 flex-1">
                <span className="text-muted-foreground text-xs">R$</span>
                <DebouncedPriceInput value={filters.priceRange[0]} onChange={(v) => updateFilter('priceRange', [v, filters.priceRange[1]])} className={filters.priceRange[0] > 0 ? 'border-primary/60' : ''} />
              </div>
              <span className="text-muted-foreground text-xs">até</span>
              <div className="flex items-center gap-1 flex-1">
                <span className="text-muted-foreground text-xs">R$</span>
                <DebouncedPriceInput value={filters.priceRange[1]} onChange={(v) => updateFilter('priceRange', [filters.priceRange[0], v])} className={filters.priceRange[1] < 1000 ? 'border-primary/60' : ''} />
              </div>
            </div>
          </div>
        </FilterSection>

        {/* Tiragem */}
        <FilterSection id="quantity" title="Tiragem" icon={<Box className="h-4 w-4" />} badge={filters.quantityRange[0] > 1 || filters.quantityRange[1] < 10000 ? 1 : 0} isOpen={openSections.includes("quantity")} onToggle={toggleSection}>
          <div className="space-y-4 px-1">
            <Slider value={filters.quantityRange} onValueChange={(value) => updateFilter('quantityRange', value as [number, number])} min={1} max={10000} step={50} />
            <div className="flex items-center justify-between text-sm">
              <Input type="number" value={filters.quantityRange[0]} onChange={(e) => updateFilter('quantityRange', [Number(e.target.value), filters.quantityRange[1]])} className="w-24 h-8 text-sm" placeholder="Mín." />
              <span className="text-muted-foreground">até</span>
              <Input type="number" value={filters.quantityRange[1]} onChange={(e) => updateFilter('quantityRange', [filters.quantityRange[0], Number(e.target.value)])} className="w-24 h-8 text-sm" placeholder="Máx." />
            </div>
          </div>
        </FilterSection>

        {/* Datas Comemorativas */}
        <FilterSection id="datas-comemorativas" title="Datas Comemorativas" icon={<Calendar className="h-4 w-4" />} badge={filters.datasComemorativas?.length || 0} isOpen={openSections.includes("datas-comemorativas")} onToggle={toggleSection}>
          <CommemorativeDateFilter selectedDates={filters.datasComemorativas || []} onToggleDate={(slug) => toggleArrayFilter('datasComemorativas', slug)} onClearDates={() => onFilterChange({ ...filters, datasComemorativas: [] })} compact />
        </FilterSection>

        {/* Público-Alvo */}
        <FilterSection id="publico" title="Público-Alvo" icon={<Users className="h-4 w-4" />} badge={filters.publicoAlvo?.length || 0} isOpen={openSections.includes("publico")} onToggle={toggleSection}>
          <ScrollArea className="h-40">
            <div className="space-y-2 pr-3">
              {[...PUBLICO_ALVO].sort((a, b) => a.localeCompare(b)).map((publico) => (
                <div key={publico} className="flex items-center gap-2">
                  <Checkbox id={`adv-pub-${publico}`} checked={(filters.publicoAlvo || []).includes(publico)} onCheckedChange={() => toggleArrayFilter('publicoAlvo', publico)} />
                  <Label htmlFor={`adv-pub-${publico}`} className="text-sm cursor-pointer">{toTitleCase(publico)}</Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </FilterSection>

        {/* Endomarketing */}
        <FilterSection id="endomarketing" title="Endomarketing" icon={<Briefcase className="h-4 w-4" />} badge={filters.endomarketing?.length || 0} isOpen={openSections.includes("endomarketing")} onToggle={toggleSection}>
          <ScrollArea className="h-40">
            <div className="space-y-2 pr-3">
              {[...ENDOMARKETING].sort((a, b) => a.localeCompare(b)).map((endo) => (
                <div key={endo} className="flex items-center gap-2">
                  <Checkbox id={`adv-endo-${endo}`} checked={(filters.endomarketing || []).includes(endo)} onCheckedChange={() => toggleArrayFilter('endomarketing', endo)} />
                  <Label htmlFor={`adv-endo-${endo}`} className="text-sm cursor-pointer">{toTitleCase(endo)}</Label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </FilterSection>

        {/* Ramos de Atividade - Extracted */}
        <FilterSectionRamos
          isOpen={openSections.includes("ramos-atividade")}
          onToggle={toggleSection}
          filters={filters}
          onFilterChange={onFilterChange}
          ramoGroups={ramoGroups}
          allSegmentos={allSegmentos}
          ramosLoading={ramosLoading}
          getSegmentosForRamo={getSegmentosForRamo}
        />

        {/* Tags */}
        <FilterSection id="tags" title="Tags" icon={<Tag className="h-4 w-4" />} badge={filters.tags.length} isOpen={openSections.includes("tags")} onToggle={toggleSection}>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.slice(0, 20).map(tag => (
              <button key={tag.id} onClick={() => toggleArrayFilter('tags', tag.id)} className={cn("px-2.5 py-1 text-xs rounded-full border transition-all", filters.tags.includes(tag.id) ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted")}>
                {tag.name}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Opções Rápidas */}
        <FilterSection id="quick" title="Opções Rápidas" icon={<Sparkles className="h-4 w-4" />} isOpen={openSections.includes("quick")} onToggle={toggleSection}>
          <div className="space-y-2">
            {[
              { id: 'is-kit', label: 'Apenas KITs', key: 'isKit' as const },
              { id: 'is-featured', label: 'Destaques', key: 'isFeatured' as const },
              { id: 'is-new', label: 'Novidades', key: 'isNew' as const },
              { id: 'has-personalization', label: 'Com Personalização', key: 'hasPersonalization' as const },
            ].map(opt => (
              <div key={opt.id} className="flex items-center gap-2">
                <Checkbox id={opt.id} checked={filters[opt.key] as boolean} onCheckedChange={(checked) => updateFilter(opt.key, checked as boolean)} />
                <Label htmlFor={opt.id} className="text-sm cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </div>
        </FilterSection>

        {/* Ordenação */}
        <FilterSection id="sort" title="Ordenar por" icon={<Filter className="h-4 w-4" />} isOpen={openSections.includes("sort")} onToggle={toggleSection}>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value as AdvancedFilterState['sortBy'])}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterSection>
      </div>
    </div>
  );
}
