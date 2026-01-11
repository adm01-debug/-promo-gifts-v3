// src/hooks/useSimulation.ts
// Hook centralizado para lógica do simulador

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { 
  Product, 
  Client, 
  Technique, 
  TechniqueSettings, 
  SimulationOption, 
  SavedSimulation,
  SimulatorStep 
} from "@/types/simulation";

export function useSimulation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<SimulatorStep>('product');
  
  // Core simulation state
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [customProductPrice, setCustomProductPrice] = useState<string>("");
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [techniqueSettings, setTechniqueSettings] = useState<Record<string, TechniqueSettings>>({});
  const [simulationOptions, setSimulationOptions] = useState<SimulationOption[]>([]);

  // UI state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [simulationNotes, setSimulationNotes] = useState("");
  const [viewSimulation, setViewSimulation] = useState<SavedSimulation | null>(null);
  
  // Margin calculator
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [targetMargin, setTargetMargin] = useState<string>("30");

  // Filters
  const [filterClientId, setFilterClientId] = useState<string | null>(null);
  const [filterProductSearch, setFilterProductSearch] = useState("");

  // Fetch products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["simulator-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, price")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ["simulator-clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bitrix_clients")
        .select("id, name, ramo, nicho")
        .order("name");
      if (error) throw error;
      return data as Client[];
    },
  });

  // Fetch techniques
  const { data: techniques, isLoading: techniquesLoading } = useQuery({
    queryKey: ["simulator-techniques"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personalization_techniques")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Technique[];
    },
  });

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

  // Helpers
  const needsColorInput = useCallback((code: string) => {
    const c = code?.toUpperCase() || "";
    return c.includes("SILK") || c.includes("SERIGRAFIA") || c.includes("BORD") || c.includes("EMBROID");
  }, []);

  const needsSizeInput = useCallback((code: string) => {
    const c = code?.toUpperCase() || "";
    return c.includes("DTF") || c.includes("SUB") || c.includes("TRANSFER") || 
           c.includes("BORD") || c.includes("EMBROID") || c.includes("LASER");
  }, []);

  // Actions
  const handleTechniqueToggle = useCallback((techniqueId: string) => {
    setSelectedTechniques(prev => {
      if (prev.includes(techniqueId)) {
        return prev.filter(id => id !== techniqueId);
      }
      if (!techniqueSettings[techniqueId]) {
        setTechniqueSettings(s => ({
          ...s,
          [techniqueId]: { colors: 1, width: 10, height: 10, positions: 1 }
        }));
      }
      return [...prev, techniqueId];
    });
  }, [techniqueSettings]);

  const updateTechniqueSetting = useCallback((
    techniqueId: string, 
    field: keyof TechniqueSettings, 
    value: number
  ) => {
    setTechniqueSettings(prev => ({
      ...prev,
      [techniqueId]: {
        ...prev[techniqueId],
        [field]: value
      }
    }));
  }, []);

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
    setSelectedTechniques([]);
    setTechniqueSettings({});
    setCurrentStep('product');
  }, []);

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
    setSelectedProductId(simulation.product_id);
    setQuantity(simulation.quantity);
    setCustomProductPrice(simulation.product_unit_price.toString());
    setSimulationOptions(simulation.simulation_data);
    
    const techIds = simulation.simulation_data.map(s => s.techniqueId);
    setSelectedTechniques(techIds);
    
    const settings: Record<string, TechniqueSettings> = {};
    simulation.simulation_data.forEach(opt => {
      settings[opt.techniqueId] = {
        colors: opt.colors,
        width: opt.width,
        height: opt.height,
        positions: opt.positions,
      };
    });
    setTechniqueSettings(settings);
    setCurrentStep('results');
    
    setViewSimulation(null);
    toast.success("Simulação carregada!");
  }, []);

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

    // Filters
    filterClientId,
    setFilterClientId,
    filterProductSearch,
    setFilterProductSearch,

    // Helpers
    needsColorInput,
    needsSizeInput,

    // Actions
    handleTechniqueToggle,
    updateTechniqueSetting,
    calculateSimulation,
    clearSimulation,
    copyToClipboard,
    copyAllOptions,
    loadSavedSimulation,

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
