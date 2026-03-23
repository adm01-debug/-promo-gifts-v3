import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { FilterPanel, FilterState, defaultFilters } from "@/components/filters/FilterPanel";
import { PresetsBar } from "@/components/filters/PresetsBar";
import { VirtualizedProductGrid } from "@/components/products/VirtualizedProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { ColumnSelector, getDefaultColumns, type ColumnCount } from "@/components/products/ColumnSelector";
import { VoiceSearchOverlay } from "@/components/search/VoiceSearchOverlay";
import { useProductsCatalog } from "@/hooks/useProductsLightweight";
import { resolveColorImage, type ActiveColorFilter } from "@/utils/color-image-resolver";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Filter, 
  ArrowUpDown,
  X,
} from "lucide-react";
import { LayoutPopover } from "@/components/products/LayoutPopover";
import { SmartSearchInput } from "@/components/search";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import { useComparisonContext } from "@/contexts/ComparisonContext";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useVoiceCommands } from "@/hooks/useVoiceCommands";
import { useProductsByMaterial } from "@/hooks/useProductsByMaterial";
import { useProductsByCategory } from "@/hooks/useProductsByCategory";
import { useProductFuzzySearch } from "@/hooks/useProductFuzzySearch";
import { toast } from "sonner";

export default function FiltersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const { isInCompare, toggleCompare, canAddMore } = useComparisonContext();
  const isInitialMount = useRef(true);

  // #22 Deep linking: deserialize filters from URL on mount
  const [filters, setFilters] = useState<FilterState>(() => {
    const f = { ...defaultFilters };
    const get = (k: string) => searchParams.get(k);
    const getArr = (k: string) => {
      const v = searchParams.get(k);
      return v ? v.split(',').filter(Boolean) : [];
    };
    
    if (get('search')) f.search = get('search')!;
    const cg = getArr('colorGroups'); if (cg.length) f.colorGroups = cg;
    const cv = getArr('colorVariations'); if (cv.length) f.colorVariations = cv;
    const cn = getArr('colorNuances'); if (cn.length) f.colorNuances = cn;
    const colors = getArr('colors'); if (colors.length) f.colors = colors;
    const cats = getArr('categories'); if (cats.length) f.categories = cats;
    const suppliers = getArr('suppliers'); if (suppliers.length) f.suppliers = suppliers;
    // Legacy: support old ?supplier= param
    const singleSupplier = get('supplier');
    if (singleSupplier && !f.suppliers.includes(singleSupplier)) f.suppliers = [...f.suppliers, singleSupplier];
    const pa = getArr('publicoAlvo'); if (pa.length) f.publicoAlvo = pa;
    const dc = getArr('datasComemorativas'); if (dc.length) f.datasComemorativas = dc;
    const endo = getArr('endomarketing'); if (endo.length) f.endomarketing = endo;
    const ra = getArr('ramosAtividade'); if (ra.length) f.ramosAtividade = ra;
    const sa = getArr('segmentosAtividade'); if (sa.length) f.segmentosAtividade = sa;
    const mg = getArr('materialGroups'); if (mg.length) f.materialGroups = mg;
    const mt = getArr('materialTypes'); if (mt.length) f.materialTypes = mt;
    const mat = getArr('materiais'); if (mat.length) f.materiais = mat;
    const tech = getArr('techniques'); if (tech.length) f.techniques = tech;
    const tags = getArr('tags'); if (tags.length) f.tags = tags;
    const pMin = get('priceMin'); const pMax = get('priceMax');
    if (pMin || pMax) f.priceRange = [pMin ? parseInt(pMin) : 0, pMax ? parseInt(pMax) : 9999];
    const ms = get('minStock'); if (ms) f.minStock = parseInt(ms);
    if (get('inStock') === '1') f.inStock = true;
    if (get('isKit') === '1') f.isKit = true;
    if (get('featured') === '1') f.featured = true;
    if (get('isNew') === '1') f.isNew = true;
    if (get('hasPersonalization') === '1') f.hasPersonalization = true;
    if (get('hasCommercialPackaging') === '1') f.hasCommercialPackaging = true;
    if (get('sortBy')) f.sortBy = get('sortBy')!;
    
    return f;
  });

  // Debounce da busca do FilterPanel para server-side search
  const debouncedServerSearch = useDebounce(filters.search || '', 400);
  // Debounce da busca da URL
  const urlSearch = searchParams.get('search') || '';
  const debouncedUrlSearch = useDebounce(urlSearch, 400);
  // Combinar: prioridade para busca do FilterPanel, senão URL
  const serverSearchTerm = debouncedServerSearch || debouncedUrlSearch;

  // Progressive loading: uses lightweight catalog (reuses prefetch cache, ~2s first paint)
  const {
    data: catalogData,
    isLoading: isLoadingProducts,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useProductsCatalog(
    serverSearchTerm ? { search: serverSearchTerm } : undefined
  );

  // Auto-fetch ALL remaining pages for complete filtering
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten infinite query pages into a single array
  const realProducts = useMemo(() => {
    if (!catalogData?.pages) return [];
    return catalogData.pages.flatMap(page => page.products);
  }, [catalogData]);

  const totalEstimate = catalogData?.pages?.[0]?.totalEstimate ?? null;
  const isFullyLoaded = !hasNextPage && !isFetchingNextPage;

  // #22 Deep linking: serialize filters to URL on change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const params = new URLSearchParams();
    const setArr = (k: string, arr: string[]) => { if (arr.length) params.set(k, arr.join(',')); };
    
    if (filters.search) params.set('search', filters.search);
    setArr('colorGroups', filters.colorGroups);
    setArr('colorVariations', filters.colorVariations);
    setArr('colorNuances', filters.colorNuances);
    setArr('colors', filters.colors);
    setArr('categories', filters.categories);
    setArr('suppliers', filters.suppliers);
    setArr('publicoAlvo', filters.publicoAlvo);
    setArr('datasComemorativas', filters.datasComemorativas);
    setArr('endomarketing', filters.endomarketing);
    setArr('ramosAtividade', filters.ramosAtividade || []);
    setArr('segmentosAtividade', filters.segmentosAtividade || []);
    setArr('materialGroups', filters.materialGroups || []);
    setArr('materialTypes', filters.materialTypes || []);
    setArr('materiais', filters.materiais);
    setArr('techniques', filters.techniques || []);
    setArr('tags', filters.tags || []);
    if (filters.priceRange[0] > 0) params.set('priceMin', String(filters.priceRange[0]));
    if (filters.priceRange[1] < 9999) params.set('priceMax', String(filters.priceRange[1]));
    if (filters.minStock > 0) params.set('minStock', String(filters.minStock));
    if (filters.inStock) params.set('inStock', '1');
    if (filters.isKit) params.set('isKit', '1');
    if (filters.featured) params.set('featured', '1');
    if (filters.isNew) params.set('isNew', '1');
    if (filters.hasPersonalization) params.set('hasPersonalization', '1');
    if (filters.hasCommercialPackaging) params.set('hasCommercialPackaging', '1');
    if (filters.sortBy && filters.sortBy !== 'name') params.set('sortBy', filters.sortBy);
    
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);
  
  // Hook para buscar produtos por materiais (usa tabela product_materials)
  const { productIds: materialFilteredProductIds, hasFilter: hasMaterialFilter, isLoading: isLoadingMaterialFilter } = useProductsByMaterial({
    materialGroupSlugs: filters.materialGroups || [],
    materialTypeSlugs: filters.materialTypes || [],
  });

  // Hook para buscar produtos por categorias (usa tabela product_category_assignments)
  const { productIds: categoryFilteredProductIds, hasFilter: hasCategoryFilter, isLoading: isLoadingCategoryFilter } = useProductsByCategory({
    categoryIds: filters.categories, // Já são UUIDs (strings)
    includeDescendants: true,
  });
  const [activePresetId, setActivePresetId] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState<ColumnCount>(getDefaultColumns);
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [commandAction, setCommandAction] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<Array<{ type: "category" | "color" | "price" | "material" | "stock" | "featured" | "kit"; label: string }>>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  // Loading transition when filters change (#5)
  const filtersJson = JSON.stringify(filters);
  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => setIsFiltering(false), 350);
    return () => clearTimeout(timer);
  }, [filtersJson]);

  // Use sortBy from FilterState
  const sortBy = filters.sortBy || 'name';
  const setSortBy = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, sortBy: value }));
  }, []);

  const { parseCommand } = useVoiceCommands();

  const handleVoiceResult = useCallback((transcript: string) => {
    const command = parseCommand(transcript);
    setAppliedFilters([]); // Reset applied filters
    
    switch (command.type) {
      case "compound":
        // Apply multiple filters at once
        if (command.filters && command.filters.length > 0) {
          const newAppliedFilters: typeof appliedFilters = [];
          
          setFilters(prev => {
            const newFilters = { ...prev };
            command.filters!.forEach(filter => {
              if (filter.filterKey === "colors" && Array.isArray(filter.value)) {
                newFilters.colors = [...prev.colors, ...(filter.value as string[])];
                (filter.value as string[]).forEach(c => {
                  newAppliedFilters.push({ type: "color", label: c });
                });
              } else if (filter.filterKey === "categories" && Array.isArray(filter.value)) {
                newFilters.categories = [...prev.categories, ...(filter.value as number[])];
                newAppliedFilters.push({ type: "category", label: "Categoria" });
              } else if (filter.filterKey === "materiais" && Array.isArray(filter.value)) {
                newFilters.materiais = [...prev.materiais, ...(filter.value as string[])];
                (filter.value as string[]).forEach(m => {
                  newAppliedFilters.push({ type: "material", label: m });
                });
              } else if (filter.filterKey === "priceRange" && Array.isArray(filter.value)) {
                const [min, max] = filter.value as string[];
                newFilters.priceRange = [parseInt(min) || 0, parseInt(max) || 500];
                newAppliedFilters.push({ type: "price", label: `Até R$${max}` });
              } else if (filter.filterKey === "isKit") {
                newFilters.isKit = true;
                newAppliedFilters.push({ type: "kit", label: "Kits" });
              } else if (filter.filterKey === "inStock") {
                newFilters.inStock = true;
                newAppliedFilters.push({ type: "stock", label: "Em estoque" });
              } else if (filter.filterKey === "featured") {
                newFilters.featured = true;
                newAppliedFilters.push({ type: "featured", label: "Destaques" });
              }
            });
            return newFilters;
          });
          
          setAppliedFilters(newAppliedFilters);
          setCommandAction(command.action || "Filtros aplicados");
          toast.success(`${newAppliedFilters.length} filtros aplicados`);
        }
        setActivePresetId(undefined);
        break;

      case "filter":
        if (command.filterKey === "colors" && command.value) {
          setFilters(prev => ({ ...prev, colors: [...prev.colors, ...(command.value as string[])] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "categories" && command.value) {
          // Categories são agora UUIDs (strings)
          const categoryIds = command.value as string[];
          setFilters(prev => ({ ...prev, categories: [...prev.categories, ...categoryIds] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "materiais" && command.value) {
          setFilters(prev => ({ ...prev, materiais: [...prev.materiais, ...(command.value as string[])] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "priceRange" && command.value) {
          const [min, max] = command.value as string[];
          setFilters(prev => ({ ...prev, priceRange: [parseInt(min) || 0, parseInt(max) || 500] }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Filtro aplicado");
        } else if (command.filterKey === "isKit") {
          setFilters(prev => ({ ...prev, isKit: true }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Mostrando kits");
        } else if (command.filterKey === "inStock") {
          setFilters(prev => ({ ...prev, inStock: true }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Mostrando em estoque");
        } else if (command.filterKey === "featured") {
          setFilters(prev => ({ ...prev, featured: true }));
          setCommandAction(command.action || null);
          toast.success(command.action || "Mostrando destaques");
        }
        setActivePresetId(undefined);
        break;
        
      case "sort":
        if (command.sortValue) {
          setSortBy(command.sortValue);
          setCommandAction(command.action || null);
          toast.success(command.action || "Ordenação aplicada");
        }
        break;
        
      case "clear":
        setFilters(defaultFilters);
        setActivePresetId(undefined);
        setCommandAction("Filtros limpos");
        toast.success("Filtros limpos");
        break;
        
      case "search":
        setCommandAction(`Buscar "${command.value}"`);
        toast.info(`Busca: "${command.value}"`);
        break;
        
      default:
        setCommandAction("Comando não reconhecido");
        toast.warning("Comando não reconhecido");
    }

    // Clear action after 3 seconds
    setTimeout(() => {
      setCommandAction(null);
      setAppliedFilters([]);
    }, 3000);
    
    // Close overlay after processing
    setTimeout(() => setVoiceOverlayOpen(false), 2000);
  }, [parseCommand]);

  const { 
    isListening, 
    isSupported, 
    transcript, 
    startListening, 
    stopListening, 
    error 
  } = useSpeechRecognition({
    onResult: handleVoiceResult,
    language: "pt-BR",
  });

  const handleToggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleApplyPreset = (presetFilters: FilterState, presetId?: string) => {
    setFilters(presetFilters);
    setActivePresetId(presetId);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setActivePresetId(undefined);
  };

  const handleReset = () => {
    const hadFilters = activeFiltersCount > 0;
    setFilters(defaultFilters);
    setActivePresetId(undefined);
    if (hadFilters) {
      toast.success('Filtros limpos', { description: 'Todos os filtros foram removidos.' });
    }
  };

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    // Cores hierárquicas
    if ((filters.colorGroups?.length || 0) + (filters.colorVariations?.length || 0) + (filters.colorNuances?.length || 0) + filters.colors.length > 0) count++;
    if (filters.categories.length > 0) count++;
    if (filters.suppliers.length > 0) count++;
    if (filters.publicoAlvo.length > 0) count++;
    if (filters.datasComemorativas.length > 0) count++;
    if (filters.endomarketing.length > 0) count++;
    if (filters.ramosAtividade?.length > 0) count++;
    if (filters.segmentosAtividade?.length > 0) count++;
    if ((filters.materialGroups?.length || 0) + (filters.materialTypes?.length || 0) + filters.materiais.length > 0) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 9999) count++;
    if (filters.minStock > 0) count++;
    if (filters.inStock) count++;
    if (filters.isKit) count++;
    if (filters.featured) count++;
    if (filters.isNew) count++;
    if (filters.hasPersonalization) count++;
    if (filters.hasCommercialPackaging) count++;
    if ((filters.techniques?.length || 0) > 0) count++;
    if ((filters.tags?.length || 0) > 0) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  // Pegar search da URL
  const searchQuery = searchParams.get('search') || '';

  // Busca fuzzy de produtos - tolerante a erros de digitação
  const { results: fuzzySearchResults, hasSearch: hasFuzzySearch } = useProductFuzzySearch(realProducts, searchQuery);

  // Aplicar filtros nos produtos - USANDO PRODUTOS REAIS
  const filteredProducts = useMemo(() => {
    // Se há busca da URL, usar resultados do fuzzy search
    let result = hasFuzzySearch ? [...fuzzySearchResults] : [...realProducts];

    // Busca textual inline do FilterPanel (#2)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }

    // Filtro por cores - sistema hierárquico (colorGroups / colorVariations / colorNuances)
    // Lógica: variações são mais específicas que grupos; nuances se aplicam sobre qualquer cor
    const hasGroupFilter = filters.colorGroups.length > 0;
    const hasVariationFilter = filters.colorVariations.length > 0;
    const hasNuanceFilter = filters.colorNuances.length > 0;
    const hasLegacyColors = filters.colors.length > 0;
    const hasColorFilter = hasGroupFilter || hasVariationFilter || hasNuanceFilter || hasLegacyColors;

    if (hasColorFilter) {
      result = result.filter((product) => {
        if (!product.colors?.length) return false;
        return product.colors.some((color: any) => {
          const colorName = (color.name || '').toLowerCase();
          const colorGroup = (color.group || '').toLowerCase();
          const colorGroupSlug = color.groupSlug || '';
          const colorVariationSlug = color.variationSlug || '';
          const colorNuance = (color.nuance || color.finish || '').toLowerCase();

          // Se há variações selecionadas, elas têm prioridade sobre grupos
          if (hasVariationFilter) {
            const matchesVariation = filters.colorVariations.some(slug =>
              colorVariationSlug === slug ||
              colorName.includes(slug.toLowerCase().replace(/-/g, ' '))
            );
            if (matchesVariation) {
              if (hasNuanceFilter) {
                return filters.colorNuances.some(n => colorNuance.includes(n.toLowerCase()));
              }
              return true;
            }
            if (hasGroupFilter) return false;
          }

          // Filtro por grupo — usa groupSlug do banco com fallback keyword
          if (hasGroupFilter) {
            const matchesGroup = filters.colorGroups.some(slug =>
              colorGroupSlug === slug ||
              colorGroup.includes(slug.toLowerCase()) ||
              colorName.includes(slug.toLowerCase())
            );
            if (matchesGroup) {
              if (hasNuanceFilter) {
                return filters.colorNuances.some(n => colorNuance.includes(n.toLowerCase()));
              }
              return true;
            }
          }

          // Apenas nuance selecionada (sem grupo nem variação)
          if (hasNuanceFilter && !hasGroupFilter && !hasVariationFilter) {
            return filters.colorNuances.some(n => colorNuance.includes(n.toLowerCase()));
          }

          // Fallback legado
          if (hasLegacyColors) {
            return filters.colors.includes(color.name);
          }
          return false;
        });
      });
    }


    if (hasCategoryFilter && categoryFilteredProductIds.size > 0) {
      result = result.filter((p) => categoryFilteredProductIds.has(p.id));
    } else if (hasCategoryFilter && categoryFilteredProductIds.size === 0 && !isLoadingCategoryFilter) {
      // Filtro ativo mas sem resultados = nenhum produto corresponde
      result = [];
    }

    // Filtro por fornecedores (por ID ou nome)
    if (filters.suppliers.length > 0) {
      result = result.filter((product) => {
        const supplierId = product.supplier?.id || '';
        const supplierName = (product.supplier?.name || product.brand || '').toLowerCase();
        return (
          filters.suppliers.includes(supplierId) ||
          filters.suppliers.some(s => supplierName.includes(s.toLowerCase())) ||
          filters.suppliers.includes(product.supplier_reference || '')
        );
      });
    }

    // Filtro por Público-Alvo
    if (filters.publicoAlvo.length > 0) {
      result = result.filter((product) => {
        const tags = product.tags?.publicoAlvo || [];
        return filters.publicoAlvo.some(p =>
          tags.some((t: string) => t.toLowerCase() === p.toLowerCase())
        );
      });
    }

    // Filtro por Datas Comemorativas
    if (filters.datasComemorativas.length > 0) {
      result = result.filter((product) => {
        const tags = product.tags?.datasComemorativas || [];
        return filters.datasComemorativas.some(d =>
          tags.some((t: string) => t.toLowerCase().includes(d.toLowerCase()))
        );
      });
    }

    // Filtro por Endomarketing
    if (filters.endomarketing.length > 0) {
      result = result.filter((product) => {
        const tags = product.tags?.endomarketing || [];
        return filters.endomarketing.some(e =>
          tags.some((t: string) => t.toLowerCase() === e.toLowerCase())
        );
      });
    }

    // Filtro por ramos de atividade (nichos/segmentos)
    if (filters.ramosAtividade?.length > 0 || filters.segmentosAtividade?.length > 0) {
      result = result.filter((product) => {
        const ramos = product.tags?.ramo || [];
        const nichos = product.tags?.nicho || [];
        const matchesRamo = filters.ramosAtividade?.length
          ? filters.ramosAtividade.some(r =>
              ramos.some((t: string) => t.toLowerCase().includes(r.toLowerCase()))
            )
          : true;
        const matchesSegmento = filters.segmentosAtividade?.length
          ? filters.segmentosAtividade.some(s =>
              nichos.some((t: string) => t.toLowerCase().includes(s.toLowerCase()))
            )
          : true;
        return matchesRamo || matchesSegmento;
      });
    }

    // Filtro por materiais usando tabela product_materials (hierárquico)
    if (hasMaterialFilter && materialFilteredProductIds.size > 0) {
      result = result.filter((p) => materialFilteredProductIds.has(p.id));
    } else if (hasMaterialFilter && materialFilteredProductIds.size === 0 && !isLoadingMaterialFilter) {
      // Filtro ativo mas sem resultados = nenhum produto corresponde
      result = [];
    }

    // Fallback: Filtro por materiais legado (campo texto)
    if (!hasMaterialFilter && filters.materiais.length > 0) {
      result = result.filter((product) => {
        const materialsStr = Array.isArray(product.materials) ? product.materials.join(' ').toLowerCase() : (product.materials || '').toLowerCase();
        return filters.materiais.some((m) => materialsStr.includes(m.toLowerCase()));
      });
    }

    // Filtro por faixa de preço (só aplica se o usuário realmente ajustou o slider)
    const priceFilterActive = filters.priceRange[0] > 0 || filters.priceRange[1] < 9999;
    if (priceFilterActive) {
      result = result.filter(
        (product) =>
          product.price >= filters.priceRange[0] &&
          product.price <= filters.priceRange[1]
      );
    }

    // Filtro por estoque mínimo por variante (cor)
    if (filters.minStock > 0) {
      result = result.filter((product) => {
        if (product.variations && product.variations.length > 0) {
          return product.variations.some((v: any) => (v.stock ?? 0) >= filters.minStock);
        }
        return (product.stock || 0) >= filters.minStock;
      });
    }

    // Filtro por estoque (boolean)
    if (filters.inStock) {
      result = result.filter((product) => (product.stock || 0) > 0);
    }

    // Filtro por embalagem especial nativa
    if (filters.hasCommercialPackaging) {
      result = result.filter((product) => product.hasCommercialPackaging === true);
    }

    // Filtro por Kit
    if (filters.isKit) {
      result = result.filter((product) => product.isKit === true);
    }

    // Ordenação — pular ordenação por nome quando há busca ativa (preservar relevância)
    const skipSort = hasFuzzySearch && sortBy === 'name';
    if (!skipSort) {
      switch (sortBy) {
        case "name":
          result.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "price-asc":
          result.sort((a, b) => a.price - b.price);
          break;
        case "price-desc":
          result.sort((a, b) => b.price - a.price);
          break;
        case "stock":
          result.sort((a, b) => (b.stock || 0) - (a.stock || 0));
          break;
      }
    }

    return result;
  }, [filters, sortBy, hasFuzzySearch, fuzzySearchResults, realProducts, hasMaterialFilter, materialFilteredProductIds, isLoadingMaterialFilter, hasCategoryFilter, categoryFilteredProductIds, isLoadingCategoryFilter]);

  // Toast indicando quantos produtos foram encontrados após busca
  const prevSearchRef = useRef<string>('');
  useEffect(() => {
    const currentSearch = filters.search || '';
    if (currentSearch && currentSearch !== prevSearchRef.current) {
      toast.info(
        `${filteredProducts.length.toLocaleString('pt-BR')} produto${filteredProducts.length !== 1 ? 's' : ''} encontrado${filteredProducts.length !== 1 ? 's' : ''}`,
        {
          description: `Busca: "${currentSearch}"`,
          duration: 3000,
        }
      );
    }
    prevSearchRef.current = currentSearch;
  }, [filters.search, filteredProducts.length]);

  // Resumo dos filtros ativos para exibição
  const activeFiltersSummary = useMemo(() => {
    const summary: { label: string; value: string; key: keyof FilterState }[] = [];

    // Cores (grupos + variações + nuances + legado)
    const totalCores = (filters.colorGroups?.length || 0) + (filters.colorVariations?.length || 0) + (filters.colorNuances?.length || 0) + filters.colors.length;
    if (totalCores > 0) {
      summary.push({
        label: "Cores",
        value: `${totalCores} selecionada${totalCores > 1 ? 's' : ''}`,
        key: "colors",
      });
    }
    if (filters.categories.length > 0) {
      summary.push({
        label: "Categorias",
        value: `${filters.categories.length} selecionada${filters.categories.length > 1 ? 's' : ''}`,
        key: "categories",
      });
    }
    if (filters.suppliers.length > 0) {
      summary.push({
        label: "Fornecedores",
        value: `${filters.suppliers.length} selecionado${filters.suppliers.length > 1 ? 's' : ''}`,
        key: "suppliers",
      });
    }
    if (filters.publicoAlvo.length > 0) {
      summary.push({
        label: "Público-Alvo",
        value: filters.publicoAlvo.slice(0, 2).join(", ") + (filters.publicoAlvo.length > 2 ? ` +${filters.publicoAlvo.length - 2}` : ""),
        key: "publicoAlvo",
      });
    }
    if (filters.datasComemorativas.length > 0) {
      summary.push({
        label: "Datas",
        value: filters.datasComemorativas[0],
        key: "datasComemorativas",
      });
    }
    if (filters.endomarketing.length > 0) {
      summary.push({
        label: "Endomarketing",
        value: filters.endomarketing.slice(0, 2).join(", "),
        key: "endomarketing",
      });
    }
    const totalMateriais = (filters.materialGroups?.length || 0) + (filters.materialTypes?.length || 0) + filters.materiais.length;
    if (totalMateriais > 0) {
      summary.push({
        label: "Materiais",
        value: `${totalMateriais} selecionado${totalMateriais > 1 ? 's' : ''}`,
        key: "materiais",
      });
    }
    const totalRamos = (filters.ramosAtividade?.length || 0) + (filters.segmentosAtividade?.length || 0);
    if (totalRamos > 0) {
      summary.push({
        label: "Nichos",
        value: `${totalRamos} selecionado${totalRamos > 1 ? 's' : ''}`,
        key: "ramosAtividade",
      });
    }

    return summary;
  }, [filters]);

  const clearSingleFilter = (key: keyof FilterState) => {
    // Grupos hierárquicos: limpar todos os níveis juntos
    if (key === "colors") {
      setFilters({ ...filters, colors: [], colorGroups: [], colorVariations: [], colorNuances: [] });
    } else if (key === "materiais") {
      setFilters({ ...filters, materiais: [], materialGroups: [], materialTypes: [] });
    } else if (key === "ramosAtividade") {
      setFilters({ ...filters, ramosAtividade: [], segmentosAtividade: [] });
    } else if (Array.isArray(filters[key])) {
      setFilters({ ...filters, [key]: [] });
    } else if (typeof filters[key] === "boolean") {
      setFilters({ ...filters, [key]: false });
    }
    setActivePresetId(undefined);
  };

  return (
    <MainLayout>
      <PageSEO title="Filtros de Produtos" description="Filtre e encontre brindes por cor, categoria, preço e fornecedor." path="/produtos" />
      <div className="animate-fade-in">
        {/* Full layout: sidebar + right content */}
        <div className="flex gap-8">
          {/* Sidebar - Desktop with sticky footer (#24) */}
          <aside className="hidden lg:flex lg:flex-col w-80 shrink-0 sticky top-4 max-h-[calc(100vh-2rem)] self-start">
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-2 space-y-4">
                <FilterPanel
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onReset={handleReset}
                  activeFiltersCount={activeFiltersCount}
                  products={realProducts}
                  filteredResultsCount={filteredProducts.length}
                />
              </div>
              {/* Melhoria #11: Footer Sticky Premium */}
              <div className="border-t border-border/40 bg-gradient-to-t from-card via-card to-card/80 px-3 py-2.5 shrink-0 mt-1">
                <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  activeFiltersCount > 0
                    ? "bg-gradient-to-r from-orange to-orange-hover text-orange-foreground shadow-md shadow-orange/20"
                    : "bg-muted/60 text-muted-foreground"
                }`}>
                  <Filter className="h-4 w-4" />
                  <span>
                   {isLoadingProducts && realProducts.length === 0
                      ? 'Carregando catálogo...'
                      : activeFiltersCount > 0
                        ? `Ver ${filteredProducts.length.toLocaleString('pt-BR')} resultado${filteredProducts.length !== 1 ? 's' : ''}`
                        : `${filteredProducts.length.toLocaleString('pt-BR')}${!isFullyLoaded ? '+' : ''} produtos disponíveis`
                    }
                  </span>
                </div>
              </div>
          </aside>

          {/* Right content: headers + products */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Single header line: Title + Search + Sort + Presets + Layout */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-shrink-0">
                <h1 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold whitespace-nowrap">
                  Super Filtro
                  <span className="text-muted-foreground font-normal text-sm sm:text-base ml-2">
                    · {isLoadingProducts && realProducts.length === 0
                      ? 'carregando...'
                      : `${filteredProducts.length.toLocaleString("pt-BR")}${!isFullyLoaded ? '+' : ''} itens`}
                  </span>
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <SmartSearchInput
                  placeholder="Buscar produtos..."
                  onSelect={(result) => {
                    if (result.type === "product") {
                      navigate(`/produto/${result.id}`);
                    } else {
                      handleFilterChange({ ...filters, search: result.label });
                    }
                  }}
                  onSearch={(q) => {
                    handleFilterChange({ ...filters, search: q });
                  }}
                  className="flex-1"
                />

                {(filters.search || searchQuery) && (
                  <Badge variant="secondary" className="shrink-0 whitespace-nowrap">
                    {(isLoadingProducts || isLoadingMaterialFilter || isLoadingCategoryFilter) && realProducts.length === 0
                      ? 'Carregando...'
                      : `${filteredProducts.length.toLocaleString("pt-BR")} encontrado${filteredProducts.length !== 1 ? "s" : ""}`}
                  </Badge>
                )}

                {/* Mobile filter trigger */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="lg:hidden shrink-0">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 flex flex-col p-0">
                    <SheetHeader className="px-6 pt-6 pb-2">
                      <SheetTitle>Filtros</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 pb-4">
                      <FilterPanel
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleReset}
                        activeFiltersCount={activeFiltersCount}
                        products={realProducts}
                        filteredResultsCount={filteredProducts.length}
                      />
                    </div>
                    <div className="sticky bottom-0 border-t bg-background px-6 py-3 flex gap-2">
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { handleReset(); }}
                          className="text-xs"
                        >
                          Limpar ({activeFiltersCount})
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setMobileFiltersOpen(false)}
                      >
                        {(isLoadingProducts || isLoadingMaterialFilter || isLoadingCategoryFilter) && realProducts.length === 0
                          ? 'Carregando catálogo...'
                          : `Ver ${filteredProducts.length} resultado${filteredProducts.length !== 1 ? 's' : ''}`}
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
                  <SelectTrigger className="w-32 sm:w-44 shrink-0">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="price_asc">Menor Preço</SelectItem>
                    <SelectItem value="price_desc">Maior Preço</SelectItem>
                    <SelectItem value="stock">Maior Estoque</SelectItem>
                    <SelectItem value="newest">Novidades</SelectItem>
                  </SelectContent>
                </Select>

                <PresetsBar
                  currentFilters={filters}
                  onApplyPreset={(f, id) => handleApplyPreset(f, id)}
                  activePresetId={activePresetId}
                />

                <div className="hidden sm:block shrink-0">
                  <LayoutPopover
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    gridColumns={gridColumns}
                    setGridColumns={setGridColumns}
                  />
                </div>
              </div>

              {/* Active filters inline */}
              {activeFiltersSummary.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 flex-wrap w-full">
                  {activeFiltersSummary.slice(0, 3).map((filter) => (
                    <Badge
                      key={filter.key}
                      variant="secondary"
                      className="gap-1 cursor-pointer hover:bg-destructive/20 text-xs py-0.5 px-2"
                      onClick={() => clearSingleFilter(filter.key)}
                    >
                      {filter.label}: {filter.value}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                  {activeFiltersSummary.length > 3 && (
                    <Badge variant="outline" className="text-xs py-0.5 px-2">
                      +{activeFiltersSummary.length - 3}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-muted-foreground h-6 px-2 text-xs"
                  >
                    Limpar
                  </Button>
                </div>
              )}
            </div>

            {/* Products grid */}
            <div className="min-h-[calc(100vh-10rem)] relative">
            {/* Loading transition overlay (#5) */}
            {isFiltering && (
              <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[1px] flex items-start justify-center pt-32 transition-opacity duration-200 pointer-events-none rounded-xl">
                <div className="flex items-center gap-2 px-4 py-2 bg-background/90 border rounded-full shadow-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Filtrando...</span>
                </div>
              </div>
            )}
            
            {(isLoadingProducts || isLoadingMaterialFilter || isLoadingCategoryFilter) && realProducts.length === 0 ? (
              viewMode === "grid" ? (
                <div className="rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 p-4 sm:p-6 shadow-inner">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 animate-pulse">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="overflow-hidden rounded-2xl border border-border/50 bg-card">
                        <div className="aspect-[4/5] bg-muted/50" />
                        <div className="space-y-3 p-4">
                          <div className="h-3 w-24 rounded bg-muted" />
                          <div className="h-5 w-full rounded bg-muted" />
                          <div className="h-5 w-2/3 rounded bg-muted" />
                          <div className="flex items-end justify-between pt-1">
                            <div className="space-y-2">
                              <div className="h-3 w-16 rounded bg-muted" />
                              <div className="h-6 w-24 rounded bg-muted" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-5 w-20 rounded-full bg-muted" />
                              <div className="h-3 w-12 rounded bg-muted" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border/40 bg-gradient-to-b from-background/80 to-background/40 p-4 shadow-inner">
                  <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
                        <div className="h-20 w-20 rounded-lg bg-muted shrink-0" />
                        <div className="flex-1 space-y-3">
                          <div className="h-4 w-1/3 rounded bg-muted" />
                          <div className="h-5 w-2/3 rounded bg-muted" />
                          <div className="h-4 w-1/4 rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : filteredProducts.length > 0 ? (
              viewMode === "grid" ? (
                <VirtualizedProductGrid
                  products={filteredProducts}
                  onProductClick={(product) => navigate(`/produto/${product.id}`)}
                  isFavorited={isFavorite}
                  onToggleFavorite={toggleFavorite}
                  isInCompare={isInCompare}
                  onToggleCompare={toggleCompare}
                  canAddToCompare={canAddMore}
                  columns={gridColumns}
                  columnSelector={
                    <ColumnSelector value={gridColumns} onChange={setGridColumns} />
                  }
                  // Props para barra de filtros interna
                  activeFiltersCount={activeFiltersCount}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onOpenFilters={() => setMobileFiltersOpen(true)}
                  onClearFilters={handleReset}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  showFilterBar={false}
                  // Filtro de cor ativo → imagem específica da cor no card
                  activeColorFilter={
                    (filters.colorGroups.length > 0 || filters.colorVariations.length > 0)
                      ? { groups: filters.colorGroups, variations: filters.colorVariations }
                      : null
                  }
                />
              ) : (
                <div className="h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto rounded-xl border border-border/40 
                  bg-gradient-to-b from-background/80 to-background/40 backdrop-blur-sm
                  scrollbar-products shadow-inner p-4">
                  
                  <ProductList
                    products={filteredProducts}
                    onProductClick={(productId) => navigate(`/produto/${productId}`)}
                    isFavorite={isFavorite}
                    onToggleFavorite={toggleFavorite}
                    isInCompare={isInCompare}
                    onToggleCompare={toggleCompare}
                    canAddToCompare={canAddMore}
                    activeColorFilter={
                      (filters.colorGroups.length > 0 || filters.colorVariations.length > 0)
                        ? { groups: filters.colorGroups, variations: filters.colorVariations }
                        : null
                    }
                  />
                </div>
              )
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-border">
                <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">
                  Nenhum produto encontrado
                </h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  Tente ajustar os filtros para ver mais resultados
                </p>
                <Button variant="outline" onClick={handleReset}>
                  Limpar filtros
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Search Overlay */}
      <VoiceSearchOverlay
        isOpen={voiceOverlayOpen}
        isListening={isListening}
        transcript={transcript}
        error={error}
        onClose={() => {
          setVoiceOverlayOpen(false);
          stopListening();
          setAppliedFilters([]);
        }}
        onToggleListening={handleToggleListening}
        commandAction={commandAction}
        appliedFilters={appliedFilters}
      />
    </MainLayout>
  );
}