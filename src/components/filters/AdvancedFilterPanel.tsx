import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  Palette, 
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [openSections, setOpenSections] = useState<string[]>(['search', 'categories', 'stock']);
  const [categorySearch, setCategorySearch] = useState('');
  
  const {
    isLoading,
    categoryOptions,
    techniqueOptions,
    supplierOptions,
    colorOptions,
    tagOptions,
  } = useAdvancedFilters();

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
          <h3 className="font-display font-semibold text-foreground">Filtros Avançados</h3>
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

        {/* Cores */}
        <FilterSection 
          id="colors" 
          title="Cores" 
          icon={<Palette className="h-4 w-4" />}
          badge={filters.colors.length}
        >
          <div className="flex flex-wrap gap-2">
            {colorOptions.map(color => (
              <button
                key={color.id}
                onClick={() => toggleArrayFilter('colors', color.id)}
                className={cn(
                  "w-7 h-7 rounded-full border-2 transition-all hover:scale-110",
                  filters.colors.includes(color.id) 
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                    : "border-border"
                )}
                style={{ 
                  backgroundColor: color.hex,
                  borderColor: color.hex === '#FFFFFF' ? 'hsl(var(--border))' : 'transparent'
                }}
                title={color.name}
              />
            ))}
            {colorOptions.length === 0 && (
              <p className="text-sm text-muted-foreground">Carregando cores...</p>
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
          <ScrollArea className="h-40">
            <div className="space-y-2 pr-3">
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
          </ScrollArea>
        </FilterSection>

        {/* Fornecedores */}
        <FilterSection 
          id="suppliers" 
          title="Fornecedores" 
          icon={<Truck className="h-4 w-4" />}
          badge={filters.suppliers.length}
        >
          <ScrollArea className="h-32">
            <div className="space-y-2 pr-3">
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
          </ScrollArea>
        </FilterSection>

        {/* Faixa de Preço */}
        <FilterSection 
          id="price" 
          title="Faixa de Preço" 
          icon={<DollarSign className="h-4 w-4" />}
          badge={filters.priceRange[0] > 0 || filters.priceRange[1] < 1000 ? 1 : 0}
        >
          <div className="space-y-4 px-1">
            <Slider
              value={filters.priceRange}
              onValueChange={(value) => updateFilter('priceRange', value as [number, number])}
              min={0}
              max={1000}
              step={10}
            />
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">R$</span>
                <Input
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) => updateFilter('priceRange', [Number(e.target.value), filters.priceRange[1]])}
                  className="w-20 h-8 text-sm"
                />
              </div>
              <span className="text-muted-foreground">até</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">R$</span>
                <Input
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], Number(e.target.value)])}
                  className="w-20 h-8 text-sm"
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
