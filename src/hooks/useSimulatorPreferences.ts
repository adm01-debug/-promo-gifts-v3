/**
 * useSimulatorPreferences - Hook para persistir preferências do usuário
 * Salva última configuração usada no localStorage + Supabase
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TechniqueSettings } from "@/types/simulation";

interface SimulatorPreferences {
  lastQuantity: number;
  lastProductId: string | null;
  lastTechniques: string[];
  lastTechniqueSettings: Record<string, TechniqueSettings>;
  defaultColors: number;
  defaultAreaCm2: number;
  preferredView: 'cards' | 'table' | 'matrix';
  autoExpandResults: boolean;
  showUpsellSuggestions: boolean;
}

const DEFAULT_PREFERENCES: SimulatorPreferences = {
  lastQuantity: 100,
  lastProductId: null,
  lastTechniques: [],
  lastTechniqueSettings: {},
  defaultColors: 1,
  defaultAreaCm2: 100,
  preferredView: 'cards',
  autoExpandResults: true,
  showUpsellSuggestions: true,
};

const STORAGE_KEY = "simulator_preferences";

export function useSimulatorPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferencesState] = useState<SimulatorPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar preferências do localStorage ao montar
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed });
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
      setIsLoaded(true);
    };

    loadPreferences();
  }, []);

  // Salvar preferências no localStorage
  const savePreferences = useCallback((newPrefs: Partial<SimulatorPreferences>) => {
    setPreferencesState(prev => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving preferences:", error);
      }
      return updated;
    });
  }, []);

  // Atualizar quantidade usada
  const setLastQuantity = useCallback((quantity: number) => {
    savePreferences({ lastQuantity: quantity });
  }, [savePreferences]);

  // Atualizar produto usado
  const setLastProductId = useCallback((productId: string | null) => {
    savePreferences({ lastProductId: productId });
  }, [savePreferences]);

  // Atualizar técnicas usadas
  const setLastTechniques = useCallback((techniques: string[]) => {
    savePreferences({ lastTechniques: techniques });
  }, [savePreferences]);

  // Atualizar configurações de técnicas
  const setLastTechniqueSettings = useCallback((settings: Record<string, TechniqueSettings>) => {
    savePreferences({ lastTechniqueSettings: settings });
  }, [savePreferences]);

  // Atualizar view preferida
  const setPreferredView = useCallback((view: 'cards' | 'table' | 'matrix') => {
    savePreferences({ preferredView: view });
  }, [savePreferences]);

  // Atualizar defaults
  const setDefaultColors = useCallback((colors: number) => {
    savePreferences({ defaultColors: colors });
  }, [savePreferences]);

  const setDefaultAreaCm2 = useCallback((area: number) => {
    savePreferences({ defaultAreaCm2: area });
  }, [savePreferences]);

  // Toggle opções
  const toggleAutoExpandResults = useCallback(() => {
    savePreferences({ autoExpandResults: !preferences.autoExpandResults });
  }, [preferences.autoExpandResults, savePreferences]);

  const toggleShowUpsellSuggestions = useCallback(() => {
    savePreferences({ showUpsellSuggestions: !preferences.showUpsellSuggestions });
  }, [preferences.showUpsellSuggestions, savePreferences]);

  // Salvar toda a sessão atual
  const saveCurrentSession = useCallback((session: {
    quantity: number;
    productId: string | null;
    techniques: string[];
    settings: Record<string, TechniqueSettings>;
  }) => {
    savePreferences({
      lastQuantity: session.quantity,
      lastProductId: session.productId,
      lastTechniques: session.techniques,
      lastTechniqueSettings: session.settings,
    });
  }, [savePreferences]);

  // Resetar para defaults
  const resetToDefaults = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    preferences,
    isLoaded,
    setLastQuantity,
    setLastProductId,
    setLastTechniques,
    setLastTechniqueSettings,
    setPreferredView,
    setDefaultColors,
    setDefaultAreaCm2,
    toggleAutoExpandResults,
    toggleShowUpsellSuggestions,
    saveCurrentSession,
    resetToDefaults,
    savePreferences,
  };
}
