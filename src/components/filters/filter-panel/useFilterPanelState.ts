import { useState, useCallback, useMemo } from 'react';
import { FilterState } from './types';

export function useFilterPanelState(filters: FilterState, onFilterChange: (f: FilterState) => void, products: any[] = []) {
  const [openSections, setOpenSections] = useState<string[]>(['cores', 'categorias']);
  const [filterSearch, setFilterSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [publicoSearch, setPublicoSearch] = useState('');
  const [endoSearch, setEndoSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [ramoSearch, setRamoSearch] = useState('');
  const [techniqueSearch, setTechniqueSearch] = useState('');
  const [tagSearch, setTagSearch] = useState('');

  const toggleSection = useCallback((id: string) => {
    setOpenSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }, []);

  const collapseAllSections = useCallback(() => setOpenSections([]), []);

  const toggleArrayFilter = useCallback((key: keyof FilterState, value: string) => {
    const current = (filters[key] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: updated });
  }, [filters, onFilterChange]);

  const toggleBooleanFilter = useCallback((key: keyof FilterState) => {
    onFilterChange({ ...filters, [key]: !filters[key] });
  }, [filters, onFilterChange]);

  const sectionMatchesSearch = useCallback((id: string, title: string) => {
    if (!filterSearch) return true;
    return title.toLowerCase().includes(filterSearch.toLowerCase());
  }, [filterSearch]);

  // Mock data for options to avoid breaking UI
  const supplierOptions = useMemo(() => [], []);
  const publicoAlvoOptions = useMemo(() => [], []);
  const endomarketingOptions = useMemo(() => [], []);
  const materialGroups = useMemo(() => [], []);
  const allMaterials = useMemo(() => [], []);
  const ramoGroups = useMemo(() => [], []);
  const allSegmentos = useMemo(() => [], []);
  const techniqueOptions = useMemo(() => [], []);
  const tagOptions = useMemo(() => [], []);

  return {
    openSections,
    toggleSection,
    collapseAllSections,
    filterSearch,
    setFilterSearch,
    sectionMatchesSearch,
    toggleArrayFilter,
    toggleBooleanFilter,
    supplierSearch,
    setSupplierSearch,
    supplierOptions,
    suppliersLoading: false,
    publicoSearch,
    setPublicoSearch,
    publicoAlvoOptions,
    endoSearch,
    setEndoSearch,
    endomarketingOptions,
    materialSearch,
    setMaterialSearch,
    materialGroups,
    allMaterials,
    materialsLoading: false,
    materialFilterState: { groups: [], types: [] },
    toggleMaterialGroup: () => {},
    toggleMaterialType: () => {},
    isMaterialGroupSelected: () => false,
    getTypesForGroup: () => [],
    ramoSearch,
    setRamoSearch,
    ramoGroups,
    allSegmentos,
    ramosLoading: false,
    totalRamoGroups: 0,
    totalRamoSegmentos: 0,
    getSegmentosForRamo: () => [],
    productCountsByRamo: {},
    techniqueSearch,
    setTechniqueSearch,
    techniqueOptions,
    tagSearch,
    setTagSearch,
    tagOptions,
    sectionCounts: {} as Record<string, number>,
    sectionSummaries: {} as Record<string, string>,
  };
}
