import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useCategoryIcons, getCategoryIcon } from "@/hooks/useCategoryIcons";
import { ColorGroupFilter, ColorFilterSelection } from "./ColorGroupFilter";
import {
  CATEGORIES,
  SUPPLIERS,
  PUBLICO_ALVO,
  DATAS_COMEMORATIVAS,
  ENDOMARKETING,
  NICHOS,
  MATERIAIS,
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
  const [openSections, setOpenSections] = useState<string[]>(['cores', 'categorias', 'preco']);
  const { data: categoryIcons = [] } = useCategoryIcons();

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
                    <span className="break-words">{category.name}</span>
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
          <div className="flex flex-wrap gap-1.5">
            {PUBLICO_ALVO.slice(0, 10).map((publico) => (
              <button
                key={publico}
                onClick={() => toggleArrayFilter('publicoAlvo', publico)}
                className={cn(
                  "filter-tag",
                  filters.publicoAlvo.includes(publico) && "active"
                )}
              >
                {publico}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Datas Comemorativas */}
        <FilterSection id="datas" title="Datas Comemorativas">
          <div className="flex flex-wrap gap-1.5">
            {DATAS_COMEMORATIVAS.slice(0, 8).map((data) => (
              <button
                key={data}
                onClick={() => toggleArrayFilter('datasComemorativas', data)}
                className={cn(
                  "filter-tag",
                  filters.datasComemorativas.includes(data) && "active"
                )}
              >
                {data}
              </button>
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

        {/* Materiais */}
        <FilterSection id="materiais" title="Materiais">
          <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
            {MATERIAIS.slice(0, 12).map((material) => (
              <div key={material} className="flex items-center gap-2">
                <Checkbox
                  id={`mat-${material}`}
                  checked={filters.materiais.includes(material)}
                  onCheckedChange={() => toggleArrayFilter('materiais', material)}
                />
                <Label htmlFor={`mat-${material}`} className="text-sm cursor-pointer">
                  {material}
                </Label>
              </div>
            ))}
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
