import { FilterState } from "./FilterPanel";

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterState;
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  icon?: string;
  color?: string;
}

// Presets padrão do sistema removidos - apenas presets do usuário são suportados

// Hook para gerenciar presets (usando localStorage)
export function useFilterPresets() {
  const STORAGE_KEY = 'filter-presets';

  const getStoredPresets = (): FilterPreset[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error reading presets from localStorage:', e);
    }
    return [];
  };

  const getAllPresets = (): FilterPreset[] => {
    const customPresets = getStoredPresets();
    return [...DEFAULT_PRESETS, ...customPresets];
  };

  const savePreset = (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>): FilterPreset => {
    const newPreset: FilterPreset = {
      ...preset,
      id: `preset-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
    };

    const customPresets = getStoredPresets();
    customPresets.push(newPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));

    return newPreset;
  };

  const updatePreset = (id: string, updates: Partial<FilterPreset>): FilterPreset | null => {
    const customPresets = getStoredPresets();
    const index = customPresets.findIndex((p) => p.id === id);

    if (index === -1) return null;

    customPresets[index] = {
      ...customPresets[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    return customPresets[index];
  };

  const deletePreset = (id: string): boolean => {
    const customPresets = getStoredPresets();
    const filtered = customPresets.filter((p) => p.id !== id);

    if (filtered.length === customPresets.length) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  };

  return {
    getAllPresets,
    getStoredPresets,
    savePreset,
    updatePreset,
    deletePreset,
  };
}