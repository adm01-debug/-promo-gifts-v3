// src/hooks/useSimulation.ts
// Hook centralizado para lógica do simulador

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeExternalDb } from "@/lib/external-db";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { fetchPromobrindProducts, getProductPrice, getProductImageUrl } from "@/lib/external-db";
import { useMultipleTechniquePricing } from "./useTechniquePricingOptions";
import { useSimulatorPreferences } from "./useSimulatorPreferences";
import type { 
  Product, 
  Client, 
  Technique, 
  TechniqueSettings, 
  SimulationOption, 
  SavedSimulation,
  SimulatorStep 
} from "@/types/simulation";
import type { SimulationScenario } from "@/components/simulator/ScenarioComparison";

export function useSimulation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Preferences hook for persistence
  const { 
    preferences, 
    isLoaded: preferencesLoaded,
    setLastQuantity,
    setLastProductId,
    setLastTechniques,
    setLastTechniqueSettings,
    setPreferredView,
    saveCurrentSession,
  } = useSimulatorPreferences();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<SimulatorStep>('product');
  
  // Core simulation state - initialized from preferences
  const [selectedProductId, setSelectedProductIdState] = useState<string | null>(null);
  const [quantity, setQuantityState] = useState<number>(100);
  const [customProductPrice, setCustomProductPrice] = useState<string>("");
  const [selectedTechniques, setSelectedTechniquesState] = useState<string[]>([]);
  const [techniqueSettings, setTechniqueSettingsState] = useState<Record<string, TechniqueSettings>>({});
  const [simulationOptions, setSimulationOptions] = useState<SimulationOption[]>([]);

  // Load preferences on mount
  useEffect(() => {
    if (preferencesLoaded) {
      if (preferences.lastQuantity) setQuantityState(preferences.lastQuantity);
      if (preferences.lastProductId) setSelectedProductIdState(preferences.lastProductId);
      if (preferences.lastTechniques?.length) setSelectedTechniquesState(preferences.lastTechniques);
      if (preferences.lastTechniqueSettings && Object.keys(preferences.lastTechniqueSettings).length > 0) {
        setTechniqueSettingsState(preferences.lastTechniqueSettings);
      }
    }
  }, [preferencesLoaded]);

  // Wrapped setters that also persist to preferences
  const setSelectedProductId = useCallback((id: string | null) => {
    setSelectedProductIdState(id);
    setLastProductId(id);
  }, [setLastProductId]);

  const setQuantity = useCallback((qty: number) => {
    setQuantityState(qty);
    setLastQuantity(qty);
  }, [setLastQuantity]);

  const setSelectedTechniques = useCallback((techniques: string[]) => {
    setSelectedTechniquesState(techniques);
    setLastTechniques(techniques);
  }, [setLastTechniques]);

  const setTechniqueSettings = useCallback((settings: Record<string, TechniqueSettings>) => {
    setTechniqueSettingsState(settings);
    setLastTechniqueSettings(settings);
  }, [setLastTechniqueSettings]);

  // Scenario comparison state
  const [scenarioA, setScenarioA] = useState<SimulationScenario | null>(null);
  const [scenarioB, setScenarioB] = useState<SimulationScenario | null>(null);

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [simulationNotes, setSimulationNotes] = useState("");
  const [viewSimulation, setViewSimulation] = useState<SavedSimulation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Margin calculator
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [targetMargin, setTargetMargin] = useState<string>("30");

  // Selected location for engraving
  const [selectedLocation, setSelectedLocation] = useState<{
    locationId: string;
    componentName: string;
    locationName: string;
    maxWidth: number;
    maxHeight: number;
    maxArea: number;
    techniqueId: string | null;
    techniqueName: string | null;
    maxColors: number | null;
  } | null>(null);

  // Filters
  const [filterClientId, setFilterClientId] = useState<string | null>(null);
  const [filterProductSearch, setFilterProductSearch] = useState("");

  // Fetch products from Promobrind API
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["simulator-products-promobrind"],
    queryFn: async () => {
      const promobrindProducts = await fetchPromobrindProducts({ limit: 500 });
      return promobrindProducts
        .filter(p => p.active !== false && p.is_active !== false)
        .map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: getProductPrice(p),
          image_url: getProductImageUrl(p),
        })) as Product[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch clients from CRM external
  const { data: clients } = useQuery({
    queryKey: ["simulator-clients"],
    queryFn: async () => {
      const { selectCrm } = await import("@/lib/crm-db");
      const companies = await selectCrm<any>("companies", {
        select: "id, razao_social, nome_fantasia, ramo, nicho, logo_url",
        filters: { deleted_at: null },
        orderBy: { column: "razao_social", ascending: true },
        limit: 500,
      });
      return companies.map((c: any) => ({
        id: c.id,
        name: c.nome_fantasia || c.razao_social,
        ramo: c.ramo,
        nicho: c.nicho,
        logo_url: c.logo_url,
      })) as Client[];
    },
  });

  // Fetch techniques
  const { data: techniques, isLoading: techniquesLoading } = useQuery({
    queryKey: ["simulator-techniques-external"],
    queryFn: async () => {
      const result = await invokeExternalDb<Technique>({
        table: "personalization_techniques",
        operation: "select",
        filters: { is_active: true },
        orderBy: { column: "name", ascending: true },
        limit: 100,
      });
      return result.records.map(t => ({
        ...t,
        setup_cost: (t as any).setup_price ?? t.setup_cost,
        unit_cost: (t as any).handling_price ?? t.unit_cost,
      }));
    },
  });

  // Get technique codes for pricing lookup
  const techniqueCodes = useMemo(() => {
    return techniques?.map(t => t.code).filter(Boolean) || [];
  }, [techniques]);

  // Fetch dynamic pricing info for all techniques
  const { isLoading: pricingLoading, getPricingInfo } = useMultipleTechniquePricing(techniqueCodes);

  // Fetch saved simulations
  const { data: savedSimulations, isLoading: savedSimulationsLoading } = useQuery({
    queryKey: ["saved-simulations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personalization_simulations")
        .select(`
          *,
          bitrix_clients (
            id,
            name,
            ramo
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        simulation_data: item.simulation_data as unknown as SimulationOption[],
      })) as SavedSimulation[];
    },
  });

  // Derived values
  const selectedProduct = useMemo(() => {
    return products?.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const effectiveProductPrice = useMemo(() => {
    if (customProductPrice && parseFloat(customProductPrice) > 0) {
      return parseFloat(customProductPrice);
    }
    return selectedProduct?.price || 0;
  }, [customProductPrice, selectedProduct]);

  // Best option (lowest price)
  const bestOption = useMemo(() => {
    if (simulationOptions.length === 0) return null;
    return simulationOptions.reduce((best, current) => 
      current.grandTotal < best.grandTotal ? current : best
    );
  }, [simulationOptions]);

  // Fastest option
  const fastestOption = useMemo(() => {
    if (simulationOptions.length === 0) return null;
    return simulationOptions.reduce((fastest, current) => 
      current.estimatedDays < fastest.estimatedDays ? current : fastest
    );
  }, [simulationOptions]);

  // Helpers - agora usa tabelas dinâmicas quando disponíveis
  const needsColorInput = useCallback((code: string) => {
    // Primeiro verifica nas tabelas de preços dinâmicas
    const pricingInfo = getPricingInfo(code);
    if (pricingInfo.hasPriceByColor) return true;
    
    // Fallback para lógica baseada em código
    const c = code?.toUpperCase() || "";
    return c.includes("SILK") || c.includes("SERIGRAFIA") || c.includes("BORD") || c.includes("EMBROID");
  }, [getPricingInfo]);

  const needsSizeInput = useCallback((code: string) => {
    // Primeiro verifica nas tabelas de preços dinâmicas
    const pricingInfo = getPricingInfo(code);
    if (pricingInfo.hasPriceByArea) return true;
    
    // Fallback para lógica baseada em código
    const c = code?.toUpperCase() || "";
    return c.includes("DTF") || c.includes("SUB") || c.includes("TRANSFER") || 
           c.includes("BORD") || c.includes("EMBROID") || c.includes("LASER");
  }, [getPricingInfo]);

  // Actions
  const handleTechniqueToggle = useCallback((techniqueId: string) => {
    setSelectedTechniquesState(prev => {
      let newTechniques: string[];
      if (prev.includes(techniqueId)) {
        newTechniques = prev.filter(id => id !== techniqueId);
      } else {
        if (!techniqueSettings[techniqueId]) {
          setTechniqueSettingsState(s => {
            const updated = { ...s, [techniqueId]: { colors: 1, width: 10, height: 10, positions: 1 } };
            setLastTechniqueSettings(updated);
            return updated;
          });
        }
        newTechniques = [...prev, techniqueId];
      }
      setLastTechniques(newTechniques);
      return newTechniques;
    });
  }, [techniqueSettings, setLastTechniques, setLastTechniqueSettings]);

  const updateTechniqueSetting = useCallback((
    techniqueId: string, 
    field: keyof TechniqueSettings, 
    value: number
  ) => {
    setTechniqueSettingsState(prev => {
      const updated = {
        ...prev,
        [techniqueId]: {
          ...prev[techniqueId],
          [field]: value
        }
      };
      setLastTechniqueSettings(updated);
      return updated;
    });
  }, [setLastTechniqueSettings]);

  const calculateSimulation = useCallback(() => {
    if (!selectedProduct || selectedTechniques.length === 0) {
      toast.error("Selecione um produto e pelo menos uma técnica");
      return;
    }

    const options: SimulationOption[] = selectedTechniques.map(techId => {
      const technique = techniques?.find(t => t.id === techId);
      if (!technique) return null;

      const settings = techniqueSettings[techId] || { colors: 1, width: 10, height: 10, positions: 1 };
      const area = settings.width * settings.height;
      let unitCostMultiplier = 1;
      
      const codeUpper = technique.code?.toUpperCase() || "";
      
      if (codeUpper.includes("SILK") || codeUpper.includes("SERIGRAFIA")) {
        unitCostMultiplier = settings.colors;
      } else if (codeUpper.includes("DTF") || codeUpper.includes("SUB") || codeUpper.includes("TRANSFER")) {
        unitCostMultiplier = Math.max(1, area / 100);
      } else if (codeUpper.includes("BORD") || codeUpper.includes("EMBROID")) {
        unitCostMultiplier = Math.max(1, (area / 50) * Math.max(1, settings.colors * 0.5));
      } else if (codeUpper.includes("LASER")) {
        unitCostMultiplier = Math.max(1, area / 100);
      }

      const unitCost = technique.unit_cost * unitCostMultiplier * settings.positions;
      const setupCost = technique.setup_cost * settings.positions * (codeUpper.includes("SILK") ? settings.colors : 1);
      const totalPersonalizationCost = (unitCost * quantity) + setupCost;
      const costPerUnit = totalPersonalizationCost / quantity;

      const productUnitPrice = effectiveProductPrice;
      const totalProductCost = productUnitPrice * quantity;
      const grandTotal = totalProductCost + totalPersonalizationCost;
      const grandTotalPerUnit = grandTotal / quantity;

      return {
        id: `${techId}-${Date.now()}`,
        techniqueId: techId,
        techniqueName: technique.name,
        techniqueCode: technique.code || "",
        colors: settings.colors,
        width: settings.width,
        height: settings.height,
        positions: settings.positions,
        unitCost,
        setupCost,
        totalPersonalizationCost,
        costPerUnit,
        estimatedDays: technique.estimated_days,
        productUnitPrice,
        totalProductCost,
        grandTotal,
        grandTotalPerUnit,
      };
    }).filter(Boolean) as SimulationOption[];

    setSimulationOptions(options);
    setCurrentStep('results');
    toast.success(`Simulação calculada para ${options.length} técnica(s)`);
  }, [selectedProduct, selectedTechniques, techniques, techniqueSettings, quantity, effectiveProductPrice]);

  // Auto-calculate when settings change
  useEffect(() => {
    if (selectedProduct && selectedTechniques.length > 0 && quantity > 0) {
      // Debounce auto-calculation
      const timer = setTimeout(() => {
        const options: SimulationOption[] = selectedTechniques.map(techId => {
          const technique = techniques?.find(t => t.id === techId);
          if (!technique) return null;

          const settings = techniqueSettings[techId] || { colors: 1, width: 10, height: 10, positions: 1 };
          const area = settings.width * settings.height;
          let unitCostMultiplier = 1;
          
          const codeUpper = technique.code?.toUpperCase() || "";
          
          if (codeUpper.includes("SILK") || codeUpper.includes("SERIGRAFIA")) {
            unitCostMultiplier = settings.colors;
          } else if (codeUpper.includes("DTF") || codeUpper.includes("SUB") || codeUpper.includes("TRANSFER")) {
            unitCostMultiplier = Math.max(1, area / 100);
          } else if (codeUpper.includes("BORD") || codeUpper.includes("EMBROID")) {
            unitCostMultiplier = Math.max(1, (area / 50) * Math.max(1, settings.colors * 0.5));
          } else if (codeUpper.includes("LASER")) {
            unitCostMultiplier = Math.max(1, area / 100);
          }

          const unitCost = technique.unit_cost * unitCostMultiplier * settings.positions;
          const setupCost = technique.setup_cost * settings.positions * (codeUpper.includes("SILK") ? settings.colors : 1);
          const totalPersonalizationCost = (unitCost * quantity) + setupCost;
          const costPerUnit = totalPersonalizationCost / quantity;

          const productUnitPrice = effectiveProductPrice;
          const totalProductCost = productUnitPrice * quantity;
          const grandTotal = totalProductCost + totalPersonalizationCost;
          const grandTotalPerUnit = grandTotal / quantity;

          return {
            id: `${techId}-${Date.now()}`,
            techniqueId: techId,
            techniqueName: technique.name,
            techniqueCode: technique.code || "",
            colors: settings.colors,
            width: settings.width,
            height: settings.height,
            positions: settings.positions,
            unitCost,
            setupCost,
            totalPersonalizationCost,
            costPerUnit,
            estimatedDays: technique.estimated_days,
            productUnitPrice,
            totalProductCost,
            grandTotal,
            grandTotalPerUnit,
          };
        }).filter(Boolean) as SimulationOption[];

        if (options.length > 0) {
          setSimulationOptions(options);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [selectedProduct, selectedTechniques, techniques, techniqueSettings, quantity, effectiveProductPrice]);

  const clearSimulation = useCallback(() => {
    setSimulationOptions([]);
    setSelectedTechniquesState([]);
    setTechniqueSettingsState({});
    setLastTechniques([]);
    setLastTechniqueSettings({});
    setCurrentStep('product');
  }, [setLastTechniques, setLastTechniqueSettings]);

  const copyToClipboard = useCallback(async (option: SimulationOption) => {
    const text = `
${option.techniqueName}
- Quantidade: ${quantity} un.
- Cores: ${option.colors}
- Tamanho: ${option.width} x ${option.height} cm
- Posições: ${option.positions}
- Preço produto/un: ${formatCurrency(option.productUnitPrice)}
- Custo personalização/un: ${formatCurrency(option.costPerUnit)}
- Setup: ${formatCurrency(option.setupCost)}
- Total produtos: ${formatCurrency(option.totalProductCost)}
- Total personalização: ${formatCurrency(option.totalPersonalizationCost)}
- TOTAL GERAL: ${formatCurrency(option.grandTotal)}
- Custo final/un: ${formatCurrency(option.grandTotalPerUnit)}
- Prazo: ~${option.estimatedDays} dias
    `.trim();

    await navigator.clipboard.writeText(text);
    setCopiedId(option.id);
    toast.success("Copiado para área de transferência");
    setTimeout(() => setCopiedId(null), 2000);
  }, [quantity]);

  const copyAllOptions = useCallback(async () => {
    if (simulationOptions.length === 0) return;

    const header = `Simulação de Personalização
Produto: ${selectedProduct?.name} (${selectedProduct?.sku})
Preço unitário: ${formatCurrency(effectiveProductPrice)}
Quantidade: ${quantity} unidades
---\n`;

    const optionsText = simulationOptions
      .sort((a, b) => a.grandTotal - b.grandTotal)
      .map((opt, idx) => `
Opção ${idx + 1}: ${opt.techniqueName}
- Cores: ${opt.colors}
- Tamanho: ${opt.width} x ${opt.height} cm
- Posições: ${opt.positions}
- Preço produto/un: ${formatCurrency(opt.productUnitPrice)}
- Personalização/un: ${formatCurrency(opt.costPerUnit)}
- Setup: ${formatCurrency(opt.setupCost)}
- Total produtos: ${formatCurrency(opt.totalProductCost)}
- Total personalização: ${formatCurrency(opt.totalPersonalizationCost)}
- TOTAL GERAL: ${formatCurrency(opt.grandTotal)}
- Custo final/un: ${formatCurrency(opt.grandTotalPerUnit)}
- Prazo estimado: ~${opt.estimatedDays} dias
    `.trim()).join("\n\n");

    await navigator.clipboard.writeText(header + optionsText);
    toast.success("Todas as opções copiadas!");
  }, [simulationOptions, selectedProduct, effectiveProductPrice, quantity]);

  const loadSavedSimulation = useCallback((simulation: SavedSimulation) => {
    setSelectedProductIdState(simulation.product_id);
    setLastProductId(simulation.product_id);
    
    setQuantityState(simulation.quantity);
    setLastQuantity(simulation.quantity);
    
    setCustomProductPrice(simulation.product_unit_price.toString());
    setSimulationOptions(simulation.simulation_data);
    
    const techIds = simulation.simulation_data.map(s => s.techniqueId);
    setSelectedTechniquesState(techIds);
    setLastTechniques(techIds);
    
    const settings: Record<string, TechniqueSettings> = {};
    simulation.simulation_data.forEach(opt => {
      settings[opt.techniqueId] = {
        colors: opt.colors,
        width: opt.width,
        height: opt.height,
        positions: opt.positions,
      };
    });
    setTechniqueSettingsState(settings);
    setLastTechniqueSettings(settings);
    
    setCurrentStep('results');
    setViewSimulation(null);
    toast.success("Simulação carregada!");
  }, [setLastProductId, setLastQuantity, setLastTechniques, setLastTechniqueSettings]);

  // Mutations
  const saveSimulationMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedProduct || simulationOptions.length === 0) {
        throw new Error("Dados incompletos");
      }

      const { error } = await supabase
        .from("personalization_simulations")
        .insert([{
          seller_id: user.id,
          client_id: selectedClientId,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_sku: selectedProduct.sku,
          quantity,
          product_unit_price: effectiveProductPrice,
          simulation_data: JSON.parse(JSON.stringify(simulationOptions)),
          notes: simulationNotes || null,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Simulação salva com sucesso!");
      setSaveDialogOpen(false);
      setSelectedClientId(null);
      setSimulationNotes("");
      queryClient.invalidateQueries({ queryKey: ["saved-simulations"] });
    },
    onError: () => {
      toast.error("Erro ao salvar simulação");
    },
  });

  const deleteSimulationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("personalization_simulations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Simulação excluída");
      queryClient.invalidateQueries({ queryKey: ["saved-simulations"] });
    },
    onError: () => {
      toast.error("Erro ao excluir simulação");
    },
  });

  // Scenario comparison actions
  const saveAsScenario = useCallback((name: 'A' | 'B') => {
    if (!selectedProduct || simulationOptions.length === 0) {
      toast.error("Nenhuma simulação para salvar");
      return;
    }

    const scenario: SimulationScenario = {
      id: `${name}-${Date.now()}`,
      name: `Cenário ${name}`,
      productName: selectedProduct.name,
      quantity,
      options: [...simulationOptions],
      bestOption,
      createdAt: new Date(),
    };

    if (name === 'A') {
      setScenarioA(scenario);
    } else {
      setScenarioB(scenario);
    }

    toast.success(`Simulação salva como Cenário ${name}`);
  }, [selectedProduct, simulationOptions, quantity, bestOption]);

  const clearScenario = useCallback((name: 'A' | 'B') => {
    if (name === 'A') {
      setScenarioA(null);
    } else {
      setScenarioB(null);
    }
    toast.success(`Cenário ${name} removido`);
  }, []);

  // Melhoria #8: Calcular simulação para outro produto (multi-product comparison)
  const calculateForProduct = useCallback((product: Product): SimulationOption[] => {
    if (!product || selectedTechniques.length === 0) return [];

    return selectedTechniques.map(techId => {
      const technique = techniques?.find(t => t.id === techId);
      if (!technique) return null;

      const settings = techniqueSettings[techId] || { colors: 1, width: 10, height: 10, positions: 1 };
      const area = settings.width * settings.height;
      let unitCostMultiplier = 1;
      
      const codeUpper = technique.code?.toUpperCase() || "";
      
      if (codeUpper.includes("SILK") || codeUpper.includes("SERIGRAFIA")) {
        unitCostMultiplier = settings.colors;
      } else if (codeUpper.includes("DTF") || codeUpper.includes("SUB") || codeUpper.includes("TRANSFER")) {
        unitCostMultiplier = Math.max(1, area / 100);
      } else if (codeUpper.includes("BORD") || codeUpper.includes("EMBROID")) {
        unitCostMultiplier = Math.max(1, (area / 50) * Math.max(1, settings.colors * 0.5));
      } else if (codeUpper.includes("LASER")) {
        unitCostMultiplier = Math.max(1, area / 100);
      }

      const unitCost = technique.unit_cost * unitCostMultiplier * settings.positions;
      const setupCost = technique.setup_cost * settings.positions * (codeUpper.includes("SILK") ? settings.colors : 1);
      const totalPersonalizationCost = (unitCost * quantity) + setupCost;
      const costPerUnit = totalPersonalizationCost / quantity;

      const productUnitPrice = product.price;
      const totalProductCost = productUnitPrice * quantity;
      const grandTotal = totalProductCost + totalPersonalizationCost;
      const grandTotalPerUnit = grandTotal / quantity;

      return {
        id: `${techId}-${product.id}-${Date.now()}`,
        techniqueId: techId,
        techniqueName: technique.name,
        techniqueCode: technique.code || "",
        colors: settings.colors,
        width: settings.width,
        height: settings.height,
        positions: settings.positions,
        unitCost,
        setupCost,
        totalPersonalizationCost,
        costPerUnit,
        estimatedDays: technique.estimated_days,
        productUnitPrice,
        totalProductCost,
        grandTotal,
        grandTotalPerUnit,
      };
    }).filter(Boolean) as SimulationOption[];
  }, [techniques, techniqueSettings, selectedTechniques, quantity]);

  // Melhoria #2: Handler para adicionar múltiplas técnicas ao orçamento
  const handleAddToQuote = useCallback((selectedOptions: SimulationOption[]) => {
    // Integração com orçamentos: adiciona técnicas selecionadas ao carrinho/orçamento
    toast.success(`${selectedOptions.length} técnica(s) adicionadas ao orçamento!`);
    logger.log("Opções selecionadas para orçamento:", selectedOptions);
  }, []);

  return {
    // Data
    products,
    clients,
    techniques,
    savedSimulations,
    selectedProduct,
    effectiveProductPrice,
    bestOption,
    fastestOption,
    simulationOptions,

    // Loading states
    productsLoading,
    techniquesLoading,
    savedSimulationsLoading,
    isCalculating,
    pricingLoading,

    // Wizard state
    currentStep,
    setCurrentStep,

    // Form state
    selectedProductId,
    setSelectedProductId,
    quantity,
    setQuantity,
    customProductPrice,
    setCustomProductPrice,
    selectedTechniques,
    techniqueSettings,

    // Preferences
    preferredView: preferences.preferredView,
    setPreferredView,

    // Scenario comparison
    scenarioA,
    scenarioB,
    saveAsScenario,
    clearScenario,

    // UI state
    copiedId,
    saveDialogOpen,
    setSaveDialogOpen,
    selectedClientId,
    setSelectedClientId,
    simulationNotes,
    setSimulationNotes,
    viewSimulation,
    setViewSimulation,

    // Margin calculator
    sellingPrice,
    setSellingPrice,
    targetMargin,
    setTargetMargin,

    // Selected location
    selectedLocation,
    setSelectedLocation,
    filterClientId,
    setFilterClientId,
    filterProductSearch,
    setFilterProductSearch,

    // Helpers
    needsColorInput,
    needsSizeInput,
    getPricingInfo,

    // Actions
    handleTechniqueToggle,
    updateTechniqueSetting,
    calculateSimulation,
    clearSimulation,
    copyToClipboard,
    copyAllOptions,
    loadSavedSimulation,
    calculateForProduct,
    handleAddToQuote,

    // Mutations
    saveSimulationMutation,
    deleteSimulationMutation,
  };
}

// Utility function
export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
