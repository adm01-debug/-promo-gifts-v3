import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronsUpDown, 
  RefreshCw, 
  Search, 
  X, 
  Gem, 
  Building2, 
  Gift, 
  Palette, 
  Sparkles, 
  Filter, 
  Paintbrush, 
  Clock, 
  Tag, 
  LayoutGrid, 
  List, 
  Settings2, 
  Package,
  DollarSign,
  Truck,
  Users,
  Calendar,
  Briefcase,
  Zap,
  Target,
  TrendingUp,
  SlidersHorizontal,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// TIPOS E DEFAULTS
// ============================================

export interface FilterState {
  search: string;
  colorGroups: string[];
  colorVariations: string[];
  colorNuances: string[];
  colors: string[];
  categories: string[];
  suppliers: string[];
  publicoAlvo: string[];
  datasComemorativas: string[];
  endomarketing: string[];
  ramosAtividade: string[];
  segmentosAtividade: string[];
  materialGroups: string[];
  materialTypes: string[];
  materiais: string[];
  techniques: string[];
  tags: string[];
  priceRange: [number, number];
  minStock: number;
  inStock: boolean;
  isKit: boolean;
  featured: boolean;
  isNew: boolean;
  hasPersonalization: boolean;
  hasCommercialPackaging: boolean;
  sortBy: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  activeFiltersCount: number;
  products?: Array<{ tags?: { publicoAlvo?: string[]; endomarketing?: string[]; ramo?: string[]; nicho?: string[] } }>;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
  gridColumns?: import("@/components/products/ColumnSelector").ColumnCount;
  onGridColumnsChange?: (cols: import("@/components/products/ColumnSelector").ColumnCount) => void;
  /** Melhoria #11: total de resultados filtrados para footer sticky */
  filteredResultsCount?: number;
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

// ============================================
// MELHORIA #5: ÍCONES COLORIDOS POR TIPO
// ============================================
const SECTION_ICON_COLORS: Record<string, string> = {
  cores: "text-orange",
  categorias: "text-orange/80",
  estoque: "text-blue-400",
  preco: "text-emerald-400",
  fornecedores: "text-cyan-400",
  publico: "text-violet-400",
  "datas-comemorativas": "text-pink-400",
  endomarketing: "text-amber-400",
  materiais: "text-teal-400",
  "ramos-atividade": "text-indigo-400",
  tecnicas: "text-rose-400",
  tags: "text-lime-400",
  "opcoes-rapidas": "text-yellow-400",
  ordenacao: "text-slate-400",
};

// ============================================
// MELHORIA #14: TOOLTIPS INFORMATIVOS
// ============================================
const SECTION_TOOLTIPS: Record<string, string> = {
  cores: "Filtre por família de cores, variações e nuances",
  categorias: "Navegue pela árvore de categorias do catálogo",
  estoque: "Defina a quantidade mínima de estoque por cor",
  preco: "Defina a faixa de preço unitário desejada",
  fornecedores: "Selecione um ou mais fornecedores",
  publico: "Filtre por público-alvo do produto",
  "datas-comemorativas": "Encontre produtos ideais para cada data",
  endomarketing: "Produtos para ações de endomarketing",
  materiais: "Filtre por tipo de material e acabamento",
  "ramos-atividade": "Filtre por ramo de atividade e segmento",
  tecnicas: "Selecione técnicas de gravação disponíveis",
  tags: "Etiquetas e classificações adicionais",
  "opcoes-rapidas": "Atalhos para filtros comuns",
  ordenacao: "Defina a ordem de exibição dos resultados",
};

// ============================================
// MELHORIA #2: AGRUPAMENTO SEMÂNTICO
// ============================================
const SECTION_GROUPS = [
  { 
    label: "PRODUTO", 
    sections: ["cores", "categorias", "estoque", "preco", "materiais"],
    icon: Package,
  },
  { 
    label: "COMERCIAL", 
    sections: ["fornecedores", "tecnicas"],
    icon: TrendingUp,
  },
  { 
    label: "MARKETING", 
    sections: ["publico", "datas-comemorativas", "endomarketing", "ramos-atividade"],
    icon: Target,
  },
  { 
    label: "ATALHOS", 
    sections: ["tags", "opcoes-rapidas", "ordenacao"],
    icon: Zap,
  },
];

// ============================================
// COMPONENTE: FilterSection Premium (Melhorias #3, #6, #7, #8, #9, #14)
// ============================================
function FilterSection({
  id,
  title,
  icon,
  children,
  openSections,
  onToggle,
  activeCount,
  activeSummary,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  openSections: string[];
  onToggle: (id: string) => void;
  activeCount?: number;
  activeSummary?: string;
}) {
  const isOpen = openSections.includes(id);
  const hasActive = (activeCount ?? 0) > 0;
  const iconColor = SECTION_ICON_COLORS[id] || "text-muted-foreground";
  const tooltip = SECTION_TOOLTIPS[id];

  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle(id)}>
      {/* Melhoria #8: Borda esquerda laranja quando ativo */}
      <div className={cn(
        "transition-all duration-200 border-l-[3px]",
        hasActive 
          ? "border-l-orange bg-orange/5" 
          : "border-l-transparent hover:border-l-muted-foreground/20"
      )}>
        <CollapsibleTrigger className={cn(
          "flex items-center justify-between w-full py-2.5 px-3 text-sm font-medium transition-all duration-200 group",
          isOpen 
            ? "text-orange" 
            : hasActive 
              ? "text-foreground" 
              : "text-foreground/80 hover:text-foreground"
        )}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Melhoria #5: Ícone colorido */}
            {icon && (
              <span className={cn(
                "transition-colors duration-200 shrink-0",
                isOpen ? "text-orange" : iconColor
              )}>
                {icon}
              </span>
            )}
            <span className="truncate">{title}</span>
            
            {/* Melhoria #3: Badge de contagem ativo */}
            {hasActive && !isOpen && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full bg-orange text-orange-foreground shrink-0 animate-scale-in">
                {activeCount}
              </span>
            )}

            {/* Melhoria #14: Tooltip informativo */}
            {tooltip && (
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span className="opacity-0 group-hover:opacity-40 transition-opacity text-muted-foreground shrink-0 cursor-help">
                    <SlidersHorizontal className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-48 text-xs bg-card border-border z-[100]">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Melhoria #9: Mini-summary quando fechado */}
            {!isOpen && activeSummary && (
              <span className="text-[10px] text-muted-foreground max-w-24 truncate hidden sm:inline">
                {activeSummary}
              </span>
            )}
            
            {/* Melhoria #7: Hover premium no chevron */}
            <span className={cn(
              "transition-all duration-200",
              "group-hover:text-orange",
              isOpen ? "text-orange" : "text-muted-foreground/50"
            )}>
              {isOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </div>
        </CollapsibleTrigger>

        {/* Melhoria #6: Conteúdo com animação suave + Performance: lazy render */}
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="pb-3 px-3 space-y-2">
            {isOpen && children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================
// MELHORIA #12: Separador com label
// ============================================
function GroupSeparator({ label, icon: Icon }: { label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1 px-1 first:pt-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase shrink-0">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export function FilterPanel({ filters, onFilterChange, onReset, activeFiltersCount, products = [], viewMode, onViewModeChange, gridColumns, onGridColumnsChange, filteredResultsCount }: FilterPanelProps) {
  // Todas as seções fechadas por padrão — vendedor abre gradativamente
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [materialSearch, setMaterialSearch] = useState('');
  const [ramoSearch, setRamoSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [techniqueSearch, setTechniqueSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [publicoSearch, setPublicoSearch] = useState('');
  const [endoSearch, setEndoSearch] = useState('');
  // Melhoria #10: Busca rápida de filtros
  const [filterSearch, setFilterSearch] = useState('');

  // Debounced search
  const [localSearch, setLocalSearch] = useState(filters.search);
  const debouncedSearch = useDebounce(localSearch, 500);

  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]);

  useEffect(() => {
    if (filters.search !== localSearch && filters.search === '') {
      setLocalSearch('');
    }
  }, [filters.search]);

  const { data: categoryIcons = [] } = useCategoryIcons();

  const publicoAlvoOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.tags?.publicoAlvo?.forEach(v => set.add(v)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const endomarketingOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => p.tags?.endomarketing?.forEach(v => set.add(v)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const productCountsByRamo = useMemo(() => {
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

  const { techniqueOptions, tagOptions } = useAdvancedFilters();
  const stableSorted = (arr: string[] | undefined) => [...(arr ?? [])].slice().sort();
  const { suppliers: supplierOptions, isLoading: suppliersLoading } = useSuppliers();

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

  const {
    groups: ramoGroups,
    segmentos: allSegmentos,
    isLoading: ramosLoading,
    totalGroups: totalRamoGroups,
    totalSegmentos: totalRamoSegmentos,
    getSegmentosForRamo,
  } = useRamoAtividadeFilter();

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
        groupsWithSelection.forEach(section => {
          if (!newSections.includes(section)) newSections.push(section);
        });
        return newSections;
      });
    }
  }, [materialFilterState.selectedGroups, materialFilterState.selectedTypes, materialGroups, allMaterials]);

  const prevMaterialFiltersRef = useRef<{ groups: string[]; types: string[] }>({ groups: [], types: [] });

  useEffect(() => {
    const currentMaterialGroups = filters.materialGroups || [];
    const currentMaterialTypes = filters.materialTypes || [];
    const groupsChanged = JSON.stringify(stableSorted(currentMaterialGroups)) !== JSON.stringify(stableSorted(materialFilterState.selectedGroups));
    const typesChanged = JSON.stringify(stableSorted(currentMaterialTypes)) !== JSON.stringify(stableSorted(materialFilterState.selectedTypes));
    if (groupsChanged || typesChanged) {
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
    prevMaterialFiltersRef.current = { groups: currentMaterialGroups, types: currentMaterialTypes };
  }, [materialFilterState.selectedGroups, materialFilterState.selectedTypes, filters.materialGroups, filters.materialTypes]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const toggleArrayFilter = (key: keyof FilterState, value: string | number) => {
    const currentValues = filters[key] as (string | number)[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    onFilterChange({ ...filters, [key]: newValues });
  };

  const toggleBooleanFilter = (key: keyof FilterState) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  };

  const collapseAllSections = useCallback(() => {
    setOpenSections([]);
  }, []);

  // ============================================
  // MELHORIA #3 + #9: Contagem e resumo por seção
  // ============================================
  const sectionCounts = useMemo(() => {
    const colorCount = (filters.colorGroups?.length || 0) + (filters.colorVariations?.length || 0) + (filters.colorNuances?.length || 0);
    const materialCount = materialFilterState.selectedGroups.length + materialFilterState.selectedTypes.length;
    const ramoCount = (filters.ramosAtividade?.length || 0) + (filters.segmentosAtividade?.length || 0);
    const quickCount = [filters.isKit, filters.featured, filters.isNew, filters.hasPersonalization, filters.inStock, filters.hasCommercialPackaging].filter(Boolean).length;
    
    return {
      cores: colorCount,
      categorias: filters.categories?.length || 0,
      estoque: filters.minStock > 0 ? 1 : 0,
      preco: (filters.priceRange[0] > 0 || filters.priceRange[1] < 9999) ? 1 : 0,
      fornecedores: filters.suppliers?.length || 0,
      publico: filters.publicoAlvo?.length || 0,
      "datas-comemorativas": filters.datasComemorativas?.length || 0,
      endomarketing: filters.endomarketing?.length || 0,
      materiais: materialCount,
      "ramos-atividade": ramoCount,
      tecnicas: (filters.techniques || []).length,
      tags: (filters.tags || []).length,
      "opcoes-rapidas": quickCount,
      ordenacao: filters.sortBy !== 'name' ? 1 : 0,
    } as Record<string, number>;
  }, [filters, materialFilterState]);

  // Melhoria #9: Mini-summaries
  const sectionSummaries = useMemo(() => {
    const summaries: Record<string, string> = {};
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 9999) {
      summaries.preco = `R$${filters.priceRange[0]}–${filters.priceRange[1] >= 9999 ? '∞' : filters.priceRange[1]}`;
    }
    if (filters.minStock > 0) {
      summaries.estoque = `≥${filters.minStock} un.`;
    }
    if (filters.sortBy !== 'name') {
      const opt = SORT_OPTIONS.find(o => o.value === filters.sortBy);
      summaries.ordenacao = opt?.label || '';
    }
    return summaries;
  }, [filters]);

  // Melhoria #10: Filtrar seções pela busca rápida
  const sectionMatchesSearch = useCallback((sectionId: string, sectionTitle: string) => {
    if (!filterSearch) return true;
    const q = filterSearch.toLowerCase();
    return sectionTitle.toLowerCase().includes(q) || sectionId.toLowerCase().includes(q);
  }, [filterSearch]);

  // Map de IDs para títulos/ícones das seções
  const SECTION_CONFIG: Record<string, { title: string; icon: React.ReactNode }> = {
    cores: { title: "Cores", icon: <Palette className="h-4 w-4" /> },
    categorias: { title: "Categorias", icon: <LayoutGrid className="h-4 w-4" /> },
    estoque: { title: "Estoque", icon: <Package className="h-4 w-4" /> },
    preco: { title: "Faixa de Preço", icon: <DollarSign className="h-4 w-4" /> },
    fornecedores: { title: "Fornecedores", icon: <Truck className="h-4 w-4" /> },
    publico: { title: "Público-Alvo", icon: <Users className="h-4 w-4" /> },
    "datas-comemorativas": { title: "Datas Comemorativas", icon: <Calendar className="h-4 w-4" /> },
    endomarketing: { title: "Endomarketing", icon: <Briefcase className="h-4 w-4" /> },
    materiais: { title: "Materiais", icon: <Gem className="h-4 w-4" /> },
    "ramos-atividade": { title: "Nichos/Segmentos", icon: <Building2 className="h-4 w-4" /> },
    tecnicas: { title: "Técnicas de Gravação", icon: <Paintbrush className="h-4 w-4" /> },
    tags: { title: "Tags", icon: <Tag className="h-4 w-4" /> },
    "opcoes-rapidas": { title: "Opções Rápidas", icon: <Sparkles className="h-4 w-4" /> },
    ordenacao: { title: "Ordenar por", icon: <Filter className="h-4 w-4" /> },
  };

  // Helper: renderiza uma FilterSection com config automática
  // Performance: usa renderFn (callback) para lazy-render do conteúdo apenas quando aberto
  const renderSection = (id: string, renderContent: () => React.ReactNode) => {
    const config = SECTION_CONFIG[id];
    if (!config) return null;
    if (!sectionMatchesSearch(id, config.title)) return null;
    
    return (
      <FilterSection
        key={id}
        id={id}
        title={config.title}
        icon={config.icon}
        openSections={openSections}
        onToggle={toggleSection}
        activeCount={sectionCounts[id]}
        activeSummary={sectionSummaries[id]}
      >
        {openSections.includes(id) && renderContent()}
      </FilterSection>
    );
  };

  // Performance: seções como funções para lazy-render (só executam quando a seção está aberta)
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    cores: () => (
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
    ),
    categorias: () => (
      <ExternalCategoryFilter
        selectedCategories={filters.categories}
        onCategoriesChange={(categories) => 
          onFilterChange({ ...filters, categories })
        }
        compact
      />
    ),
    estoque: () => (
      <div className="px-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground text-xs whitespace-nowrap">Mínimo por cor</span>
          <DebouncedPriceInput
            value={filters.minStock || ''}
            onChange={(v) => onFilterChange({ ...filters, minStock: v })}
            fallback={0}
            placeholder="Ex: 500"
            min={0}
            className={filters.minStock > 0 ? 'border-orange/60' : ''}
          />
          <span className="text-muted-foreground text-xs">un.</span>
        </div>
      </div>
    ),
    preco: () => (
      <div className="px-1">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1 flex-1">
            <span className="text-muted-foreground text-xs">R$</span>
            <DebouncedPriceInput
              value={filters.priceRange[0]}
              onChange={(v) => onFilterChange({ ...filters, priceRange: [v, filters.priceRange[1]] })}
              fallback={0}
              min={0}
              className={filters.priceRange[0] > 0 ? 'border-orange/60' : ''}
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
              className={filters.priceRange[1] < 9999 ? 'border-orange/60' : ''}
            />
          </div>
        </div>
      </div>
    ),
    fornecedores: () => (
      <div className="space-y-2">
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
    ),
    publico: () => publicoAlvoOptions.length > 0 ? (
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
    ),
    "datas-comemorativas": () => (
      <CommemorativeDateFilter
        selectedDates={filters.datasComemorativas}
        onToggleDate={(slug) => toggleArrayFilter('datasComemorativas', slug)}
        onClearDates={() => onFilterChange({ ...filters, datasComemorativas: [] })}
        compact
      />
    ),
    endomarketing: () => endomarketingOptions.length > 0 ? (
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
    ),
    materiais: () => (
      <div className="space-y-3">
        {(materialFilterState.selectedGroups.length > 0 || materialFilterState.selectedTypes.length > 0) && (
          <div className="p-2.5 bg-orange/5 rounded-lg border border-orange/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange flex items-center gap-1.5">
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
                  <MaterialBadge key={`group-${slug}`} name={group.group_name} hexCode={group.group_hex_code} size="sm" variant="solid" onRemove={() => toggleMaterialGroup(slug)} />
                ) : null;
              })}
              {materialFilterState.selectedTypes.map(slug => {
                const material = allMaterials.find(m => m.type_slug === slug);
                const group = material ? materialGroups.find(g => g.group_slug === material.group_slug) : null;
                return material ? (
                  <MaterialBadge key={`type-${slug}`} name={material.type_name} hexCode={group?.group_hex_code} size="sm" variant="outline" onRemove={() => toggleMaterialType(slug)} />
                ) : null;
              })}
            </div>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar material..." value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} className="h-8 text-sm pl-8 pr-8" aria-label="Buscar material por nome" />
          {materialSearch && (
            <button type="button" onClick={() => setMaterialSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca de material">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>{materialGroups.length} grupos</span>
          <span>•</span>
          <span>{allMaterials.length} materiais</span>
          <span>•</span>
          <span className="text-orange font-medium">
            {materialFilterState.selectedGroups.length + materialFilterState.selectedTypes.length} selecionados
          </span>
        </div>
        {materialsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-1.5 pr-3">
              {[...materialGroups]
                .sort((a, b) => a.group_name.localeCompare(b.group_name, 'pt-BR'))
                .filter(g => !materialSearch || g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) || getTypesForGroup(g.group_slug).some(t => t.type_name.toLowerCase().includes(materialSearch.toLowerCase())))
                .map(group => {
                  const types = getTypesForGroup(group.group_slug);
                  const isOpen = openSections.includes(`mat-${group.group_slug}`);
                  const isSelected = isMaterialGroupSelected(group.group_slug);
                  const selectedTypesCount = types.filter(t => materialFilterState.selectedTypes.includes(t.type_slug)).length;
                  const hasSelection = isSelected || selectedTypesCount > 0;
                  return (
                    <div key={group.group_slug} className={cn("rounded-lg border transition-all", hasSelection ? "border-orange/30 bg-orange/5" : "border-border/50 hover:border-border")}>
                      <div className="flex items-center gap-2 p-2">
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleMaterialGroup(group.group_slug)} className="h-4 w-4" />
                        <button type="button" onClick={() => toggleSection(`mat-${group.group_slug}`)} className="flex-1 flex items-center justify-between text-left" aria-label={`${isOpen ? 'Recolher' : 'Expandir'} tipos de ${group.group_name}`}>
                          <span className={cn("text-sm font-medium", hasSelection && "text-orange")}>{group.group_name}</span>
                          <div className="flex items-center gap-1.5">
                            {selectedTypesCount > 0 && <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{selectedTypesCount}</Badge>}
                            <Badge variant="outline" className="h-4 text-[10px] px-1.5">{types.length}</Badge>
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </button>
                      </div>
                      {isOpen && types.length > 0 && (
                        <div className="px-2 pb-2 pt-1 border-t border-border/30">
                          <div className="space-y-1 pl-6">
                            {[...types].sort((a, b) => a.type_name.localeCompare(b.type_name, 'pt-BR')).filter(t => !materialSearch || t.type_name.toLowerCase().includes(materialSearch.toLowerCase())).map(type => {
                              const isTypeSelected = materialFilterState.selectedTypes.includes(type.type_slug);
                              return (
                                <div key={type.type_slug} className={cn("flex items-center gap-2 py-1 px-2 rounded-md transition-colors", isTypeSelected ? "bg-orange/10" : "hover:bg-muted/50")}>
                                  <Checkbox checked={isTypeSelected} onCheckedChange={() => toggleMaterialType(type.type_slug)} className="h-3.5 w-3.5" />
                                  <Label className="text-xs cursor-pointer flex-1">{type.type_name}</Label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              {materialGroups.filter(g => !materialSearch || g.group_name.toLowerCase().includes(materialSearch.toLowerCase()) || getTypesForGroup(g.group_slug).some(t => t.type_name.toLowerCase().includes(materialSearch.toLowerCase()))).length === 0 && (
                <p className="text-sm text-muted-foreground py-2 text-center">Nenhum material encontrado</p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    ),
    "ramos-atividade": () => (
      <div className="space-y-3">
        {(filters.ramosAtividade.length > 0 || filters.segmentosAtividade.length > 0) && (
          <div className="p-2.5 bg-orange/5 rounded-lg border border-orange/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange flex items-center gap-1.5">
                <Building2 className="h-3 w-3" />
                Selecionados
              </span>
              <button type="button" onClick={() => { onFilterChange({ ...filters, ramosAtividade: [], segmentosAtividade: [] }); }} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors" aria-label="Limpar todos os nichos e segmentos selecionados">
                Limpar todos
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filters.ramosAtividade.map(slug => {
                const group = ramoGroups.find(g => g.group_slug === slug);
                return group ? (
                  <RamoAtividadeBadge key={`ramo-${slug}`} name={group.group_name} hexCode={group.group_hex_code} size="sm" variant="solid" onRemove={() => {
                    const segmentosNoRamo = getSegmentosForRamo(slug).map(s => s.segmento_slug);
                    onFilterChange({ ...filters, ramosAtividade: filters.ramosAtividade.filter(r => r !== slug), segmentosAtividade: filters.segmentosAtividade.filter(s => !segmentosNoRamo.includes(s)) });
                  }} />
                ) : null;
              })}
              {filters.segmentosAtividade.map(slug => {
                const segmento = allSegmentos.find(s => s.segmento_slug === slug);
                const group = segmento ? ramoGroups.find(g => g.group_slug === segmento.ramo_slug) : null;
                return segmento ? (
                  <RamoAtividadeBadge key={`seg-${slug}`} name={segmento.segmento_name} hexCode={group?.group_hex_code} size="sm" variant="outline" onRemove={() => {
                    onFilterChange({ ...filters, segmentosAtividade: filters.segmentosAtividade.filter(s => s !== slug) });
                  }} />
                ) : null;
              })}
            </div>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar nicho/segmento..." value={ramoSearch} onChange={(e) => setRamoSearch(e.target.value)} className="h-8 text-sm pl-8 pr-8" aria-label="Buscar nicho ou segmento de atividade" />
          {ramoSearch && (
            <button type="button" onClick={() => setRamoSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Limpar busca de nicho/segmento">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
          <span>{totalRamoGroups} ramos</span>
          <span>•</span>
          <span>{totalRamoSegmentos} segmentos</span>
          <span>•</span>
          <span className="text-orange font-medium">
            {filters.ramosAtividade.length + filters.segmentosAtividade.length} selecionados
          </span>
        </div>
        {ramosLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-1.5 pr-3">
              {ramoGroups
                .filter(g => !ramoSearch || g.group_name.toLowerCase().includes(ramoSearch.toLowerCase()) || getSegmentosForRamo(g.group_slug).some(s => s.segmento_name.toLowerCase().includes(ramoSearch.toLowerCase())))
                .map(group => {
                  const segmentos = getSegmentosForRamo(group.group_slug).filter(s => !ramoSearch || s.segmento_name.toLowerCase().includes(ramoSearch.toLowerCase()));
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
                          const segmentosNoRamo = getSegmentosForRamo(ramoSlug).map(s => s.segmento_slug);
                          onFilterChange({ ...filters, ramosAtividade: filters.ramosAtividade.filter(r => r !== ramoSlug), segmentosAtividade: filters.segmentosAtividade.filter(s => !segmentosNoRamo.includes(s)) });
                        } else {
                          onFilterChange({ ...filters, ramosAtividade: [...filters.ramosAtividade, ramoSlug] });
                        }
                      }}
                      onSegmentoToggle={(segmentoSlug) => {
                        const currentSelected = filters.segmentosAtividade.includes(segmentoSlug);
                        if (currentSelected) {
                          onFilterChange({ ...filters, segmentosAtividade: filters.segmentosAtividade.filter(s => s !== segmentoSlug) });
                        } else {
                          onFilterChange({ ...filters, segmentosAtividade: [...filters.segmentosAtividade, segmentoSlug] });
                        }
                      }}
                      defaultOpen={isRamoSelected || segmentos.some(s => filters.segmentosAtividade.includes(s.segmento_slug))}
                      compact
                    />
                  );
                })}
              {ramoGroups.filter(g => !ramoSearch || g.group_name.toLowerCase().includes(ramoSearch.toLowerCase()) || getSegmentosForRamo(g.group_slug).some(s => s.segmento_name.toLowerCase().includes(ramoSearch.toLowerCase()))).length === 0 && (
                <p className="text-sm text-muted-foreground py-2 text-center">Nenhum nicho/segmento encontrado</p>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    ),
    tecnicas: () => techniqueOptions.length > 0 ? (
      <div className="max-h-40 overflow-y-auto overscroll-contain pr-3" style={{ overscrollBehavior: 'contain' }}>
        <div className="space-y-2">
          {techniqueOptions.map(tech => (
            <div key={tech.id} className="flex items-center gap-2">
              <Checkbox id={`tech-${tech.id}`} checked={(filters.techniques || []).includes(tech.id)} onCheckedChange={() => toggleArrayFilter('techniques', tech.id)} />
              <Label htmlFor={`tech-${tech.id}`} className="text-sm cursor-pointer flex-1 flex items-center justify-between">
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
    ) : null,
    tags: () => tagOptions.length > 0 ? (
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1" style={{ overscrollBehavior: 'contain' }}>
        {tagOptions.slice(0, 20).map(tag => (
          <button
            key={tag.id}
            onClick={() => toggleArrayFilter('tags', tag.id)}
            aria-label={`Tag ${tag.name}`}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full border transition-all",
              (filters.tags || []).includes(tag.id)
                ? "bg-orange text-orange-foreground border-orange"
                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {tag.name}
          </button>
        ))}
      </div>
    ) : null,
    "opcoes-rapidas": () => (
      <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain" style={{ overscrollBehavior: 'contain' }}>
        <div className="flex items-center gap-2">
          <Checkbox id="filter-isKit" checked={filters.isKit} onCheckedChange={() => toggleBooleanFilter('isKit')} />
          <Label htmlFor="filter-isKit" className="text-sm cursor-pointer">Apenas KITs</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="filter-featured" checked={filters.featured} onCheckedChange={() => toggleBooleanFilter('featured')} />
          <Label htmlFor="filter-featured" className="text-sm cursor-pointer">Destaques</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="filter-isNew" checked={filters.isNew} onCheckedChange={() => toggleBooleanFilter('isNew')} />
          <Label htmlFor="filter-isNew" className="text-sm cursor-pointer">Novidades</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="filter-hasPersonalization" checked={filters.hasPersonalization} onCheckedChange={() => toggleBooleanFilter('hasPersonalization')} />
          <Label htmlFor="filter-hasPersonalization" className="text-sm cursor-pointer">Com Personalização</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="filter-inStock" checked={filters.inStock} onCheckedChange={() => toggleBooleanFilter('inStock')} />
          <Label htmlFor="filter-inStock" className="text-sm cursor-pointer">Em Estoque</Label>
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
    ),
    ordenacao: () => (
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
    ),
  };

  return (
    <div className="space-y-0">
      {/* ============================================
          MELHORIA #1: HEADER PREMIUM
          ============================================ */}
      <div className="pb-3 mb-1">
        {/* Título com gradiente sutil */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange to-orange-hover flex items-center justify-center shadow-md shadow-orange/20">
              <SlidersHorizontal className="h-4 w-4 text-orange-foreground" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-foreground tracking-tight">
                Filtros
              </h3>
              {/* Melhoria #15: Estado vazio ou contagem animada */}
              {activeFiltersCount > 0 ? (
                <span className="text-[10px] text-orange font-medium">
                  {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground/50">
                  Refine sua busca
                </span>
              )}
            </div>
          </div>

          {/* Contador global animado */}
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center justify-center h-7 min-w-7 px-2 text-xs font-bold rounded-full bg-orange text-orange-foreground shadow-sm shadow-orange/30 animate-scale-in">
              {activeFiltersCount}
            </span>
          )}
        </div>

        {/* Melhoria #13: Botões corrigidos + melhorados */}
        <div className="flex items-center gap-1.5">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onReset(); toast.success('Filtros resetados'); }}
                className={cn(
                  "text-xs h-7 px-3 gap-1.5 transition-all",
                  activeFiltersCount > 0 
                    ? "border-orange/40 text-orange hover:bg-orange/10 hover:text-orange" 
                    : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
                )}
                disabled={activeFiltersCount === 0}
                aria-label="Resetar todos os filtros"
              >
                <RefreshCw className="h-3 w-3" />
                Reset
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs bg-card border-border">
              Limpar todos os filtros ativos
            </TooltipContent>
          </Tooltip>

          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAllSections}
                className="text-xs h-7 px-3 gap-1.5 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                aria-label="Fechar todas as seções de filtro"
              >
                <ChevronsUpDown className="h-3 w-3" />
                Fechar
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs bg-card border-border">
              Recolher todas as seções
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ============================================
            MELHORIA #10: BUSCA RÁPIDA DE FILTROS
            ============================================ */}
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange z-10" />
          <Input
            placeholder="Buscar filtro..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            className="h-8 text-xs pl-8 pr-8 bg-muted/30 border-border/40 placeholder:text-muted-foreground/40 focus:border-orange/50"
            aria-label="Buscar seção de filtro por nome"
          />
          {filterSearch && (
            <button
              type="button"
              onClick={() => setFilterSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================
          SEÇÕES COM AGRUPAMENTO SEMÂNTICO (Melhoria #2 + #12)
          ============================================ */}
      <div className="space-y-0">
        {SECTION_GROUPS.map((group, groupIdx) => {
          // Verificar se alguma seção do grupo é visível
          const visibleSections = group.sections.filter(sId => {
            const config = SECTION_CONFIG[sId];
            if (!config) return false;
            if (!sectionMatchesSearch(sId, config.title)) return false;
            // Técnicas e tags podem não ter opções
            if (sId === 'tecnicas' && techniqueOptions.length === 0) return false;
            if (sId === 'tags' && tagOptions.length === 0) return false;
            return true;
          });

          if (visibleSections.length === 0) return null;

          return (
            <div key={group.label}>
              <GroupSeparator label={group.label} icon={group.icon} />
              <div className="space-y-0">
                {visibleSections.map(sId => renderSection(sId, sectionRenderers[sId]))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
