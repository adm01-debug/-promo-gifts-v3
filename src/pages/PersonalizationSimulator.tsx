import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Calculator, 
  Package, 
  Palette, 
  Ruler, 
  Clock, 
  DollarSign,
  Loader2,
  Info,
  Trash2,
  Copy,
  Check,
  Save,
  History,
  User,
  Building2,
  CalendarDays,
  Eye,
  X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface Client {
  id: string;
  name: string;
  ramo: string | null;
  nicho: string | null;
}

interface Technique {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit_cost: number;
  setup_cost: number;
  estimated_days: number;
  min_quantity: number;
}

interface SimulationOption {
  id: string;
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  colors: number;
  width: number;
  height: number;
  positions: number;
  unitCost: number;
  setupCost: number;
  totalPersonalizationCost: number;
  costPerUnit: number;
  estimatedDays: number;
  productUnitPrice: number;
  totalProductCost: number;
  grandTotal: number;
  grandTotalPerUnit: number;
}

interface SavedSimulation {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  product_unit_price: number;
  simulation_data: SimulationOption[];
  notes: string | null;
  created_at: string;
  client_id: string | null;
  bitrix_clients?: {
    id: string;
    name: string;
    ramo: string | null;
  } | null;
}

export default function PersonalizationSimulator() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(100);
  const [customProductPrice, setCustomProductPrice] = useState<string>("");
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [simulationOptions, setSimulationOptions] = useState<SimulationOption[]>([]);
  const [techniqueSettings, setTechniqueSettings] = useState<Record<string, {
    colors: number;
    width: number;
    height: number;
    positions: number;
  }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Profit margin calculation
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [targetMargin, setTargetMargin] = useState<string>("30");
  
  // Save simulation modal states
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [simulationNotes, setSimulationNotes] = useState("");
  
  // View saved simulation modal
  const [viewSimulation, setViewSimulation] = useState<SavedSimulation | null>(null);
  
  // Filters for saved simulations
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
      // Parse simulation_data from JSON
      return (data || []).map(item => ({
        ...item,
        simulation_data: item.simulation_data as unknown as SimulationOption[],
      })) as SavedSimulation[];
    },
  });

  // Save simulation mutation
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

  // Delete simulation mutation
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

  const selectedProduct = useMemo(() => {
    return products?.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  const effectiveProductPrice = useMemo(() => {
    if (customProductPrice && parseFloat(customProductPrice) > 0) {
      return parseFloat(customProductPrice);
    }
    return selectedProduct?.price || 0;
  }, [customProductPrice, selectedProduct]);

  const handleTechniqueToggle = (techniqueId: string) => {
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
  };

  const updateTechniqueSetting = (
    techniqueId: string, 
    field: 'colors' | 'width' | 'height' | 'positions', 
    value: number
  ) => {
    setTechniqueSettings(prev => ({
      ...prev,
      [techniqueId]: {
        ...prev[techniqueId],
        [field]: value
      }
    }));
  };

  const calculateSimulation = () => {
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
    toast.success(`Simulação calculada para ${options.length} técnica(s)`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const clearSimulation = () => {
    setSimulationOptions([]);
    setSelectedTechniques([]);
    setTechniqueSettings({});
  };

  const copyToClipboard = async (option: SimulationOption) => {
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
  };

  const copyAllOptions = async () => {
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
  };

  const needsColorInput = (code: string) => {
    const c = code?.toUpperCase() || "";
    return c.includes("SILK") || c.includes("SERIGRAFIA") || c.includes("BORD") || c.includes("EMBROID");
  };

  const needsSizeInput = (code: string) => {
    const c = code?.toUpperCase() || "";
    return c.includes("DTF") || c.includes("SUB") || c.includes("TRANSFER") || 
           c.includes("BORD") || c.includes("EMBROID") || c.includes("LASER");
  };

  const loadSavedSimulation = (simulation: SavedSimulation) => {
    // Set product
    setSelectedProductId(simulation.product_id);
    setQuantity(simulation.quantity);
    setCustomProductPrice(simulation.product_unit_price.toString());
    setSimulationOptions(simulation.simulation_data);
    
    // Set techniques that were used
    const techIds = simulation.simulation_data.map(s => s.techniqueId);
    setSelectedTechniques(techIds);
    
    // Reconstruct technique settings
    const settings: Record<string, { colors: number; width: number; height: number; positions: number }> = {};
    simulation.simulation_data.forEach(opt => {
      settings[opt.techniqueId] = {
        colors: opt.colors,
        width: opt.width,
        height: opt.height,
        positions: opt.positions,
      };
    });
    setTechniqueSettings(settings);
    
    setViewSimulation(null);
    toast.success("Simulação carregada!");
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Calculator className="h-7 w-7 text-primary" />
              </div>
              Simulador de Personalização
            </h1>
            <p className="text-muted-foreground mt-1">
              Compare custos de diferentes técnicas em tempo real
            </p>
          </div>
        </div>

        <Tabs defaultValue="simulator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="simulator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Simulador
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <History className="h-4 w-4" />
              Salvos
              {savedSimulations && savedSimulations.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {savedSimulations.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Configuration Panel */}
              <div className="lg:col-span-1 space-y-6">
                {/* Product Selection */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      Produto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Selecione o produto</Label>
                      <Select value={selectedProductId || ""} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolher produto..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {productsLoading ? (
                            <div className="p-4 flex justify-center">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            products?.map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                <span>{product.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">({product.sku})</span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        placeholder="100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Preço unitário produto
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs">
                                Deixe em branco para usar o preço base do produto ou informe um valor negociado
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={customProductPrice}
                          onChange={(e) => setCustomProductPrice(e.target.value)}
                          placeholder={selectedProduct?.price?.toFixed(2) || "0.00"}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {selectedProduct && (
                      <div className="p-3 rounded-lg bg-secondary/50 text-sm space-y-1">
                        <p className="font-medium">{selectedProduct.name}</p>
                        <p className="text-muted-foreground">
                          Preço base: {formatCurrency(selectedProduct.price)}/un
                        </p>
                        {effectiveProductPrice !== selectedProduct.price && (
                          <p className="text-primary font-medium">
                            Preço usado: {formatCurrency(effectiveProductPrice)}/un
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Techniques Selection - Compact */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      Técnicas
                    </CardTitle>
                    <CardDescription>
                      Adicione técnicas para comparar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add Technique Dropdown */}
                    {techniquesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        value=""
                        onValueChange={(value) => {
                          if (value && !selectedTechniques.includes(value)) {
                            handleTechniqueToggle(value);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="+ Adicionar técnica..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {techniques?.filter(t => !selectedTechniques.includes(t.id)).map(technique => {
                            const slaColor = technique.estimated_days <= 3 
                              ? "text-emerald-600" 
                              : technique.estimated_days <= 7 
                                ? "text-amber-600" 
                                : "text-destructive";
                            
                            return (
                              <SelectItem key={technique.id} value={technique.id}>
                                <div className="flex items-center gap-3 py-1">
                                  <div className="flex-1">
                                    <span className="font-medium">{technique.name}</span>
                                    <span className="text-xs text-muted-foreground ml-2">({technique.code})</span>
                                  </div>
                                  <span className={cn("text-xs font-medium", slaColor)}>
                                    {technique.estimated_days}d
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(technique.unit_cost)}/un
                                  </span>
                                </div>
                              </SelectItem>
                            );
                          })}
                          {techniques?.filter(t => !selectedTechniques.includes(t.id)).length === 0 && (
                            <div className="p-3 text-center text-sm text-muted-foreground">
                              Todas as técnicas já foram adicionadas
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Selected Techniques as Chips */}
                    {selectedTechniques.length > 0 ? (
                      <div className="space-y-2">
                        {selectedTechniques.map(techId => {
                          const technique = techniques?.find(t => t.id === techId);
                          if (!technique) return null;
                          
                          const slaColor = technique.estimated_days <= 3 
                            ? "bg-emerald-500" 
                            : technique.estimated_days <= 7 
                              ? "bg-amber-500" 
                              : "bg-destructive";
                          
                          return (
                            <div 
                              key={techId}
                              className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-mono">
                                  {technique.code}
                                </Badge>
                                <span className="font-medium text-sm">{technique.name}</span>
                                <Badge 
                                  variant="secondary" 
                                  className={cn("gap-1 text-white text-[10px]", slaColor)}
                                >
                                  <Clock className="h-3 w-3" />
                                  {technique.estimated_days}d
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleTechniqueToggle(techId)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        <Palette className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma técnica selecionada</p>
                        <p className="text-xs">Use o dropdown acima para adicionar</p>
                      </div>
                    )}

                    {/* Quick info */}
                    {selectedTechniques.length > 0 && (
                      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                        {selectedTechniques.length} técnica{selectedTechniques.length > 1 ? 's' : ''} selecionada{selectedTechniques.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Settings & Results Panel */}
              <div className="lg:col-span-2 space-y-6">
                {/* Technique Settings */}
                {selectedTechniques.length > 0 && (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Ruler className="h-5 w-5 text-primary" />
                        Configurações por Técnica
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {selectedTechniques.map(techId => {
                          const technique = techniques?.find(t => t.id === techId);
                          if (!technique) return null;

                          const settings = techniqueSettings[techId] || { colors: 1, width: 10, height: 10, positions: 1 };
                          const showColors = needsColorInput(technique.code || "");
                          const showSize = needsSizeInput(technique.code || "");

                          return (
                            <div 
                              key={techId}
                              className="p-4 rounded-xl border border-border bg-card"
                            >
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Badge>{technique.code}</Badge>
                                  <span className="font-medium">{technique.name}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleTechniqueToggle(techId)}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {showColors && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">Cores</Label>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={12}
                                      value={settings.colors}
                                      onChange={(e) => updateTechniqueSetting(techId, 'colors', parseInt(e.target.value) || 1)}
                                      className="h-9"
                                    />
                                  </div>
                                )}

                                {showSize && (
                                  <>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Largura (cm)</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={settings.width}
                                        onChange={(e) => updateTechniqueSetting(techId, 'width', parseInt(e.target.value) || 1)}
                                        className="h-9"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs">Altura (cm)</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={settings.height}
                                        onChange={(e) => updateTechniqueSetting(techId, 'height', parseInt(e.target.value) || 1)}
                                        className="h-9"
                                      />
                                    </div>
                                  </>
                                )}

                                <div className="space-y-2">
                                  <Label className="text-xs flex items-center gap-1">
                                    Posições
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <Info className="h-3 w-3 text-muted-foreground" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">Número de locais de gravação</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </Label>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={settings.positions}
                                    onChange={(e) => updateTechniqueSetting(techId, 'positions', parseInt(e.target.value) || 1)}
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              {showSize && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Área: {settings.width * settings.height} cm²
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex gap-3 mt-6">
                        <Button onClick={calculateSimulation} className="flex-1 gap-2">
                          <Calculator className="h-4 w-4" />
                          Calcular Simulação
                        </Button>
                        <Button variant="outline" onClick={clearSimulation}>
                          Limpar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Results */}
                {simulationOptions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-success" />
                          Resultado da Simulação
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSaveDialogOpen(true)} 
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Salvar
                          </Button>
                          <Button variant="outline" size="sm" onClick={copyAllOptions} className="gap-2">
                            <Copy className="h-4 w-4" />
                            Copiar Tudo
                          </Button>
                        </div>
                      </div>
                      <CardDescription>
                        {quantity} unidades de {selectedProduct?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Técnica</TableHead>
                              <TableHead className="text-center">Detalhes</TableHead>
                              <TableHead className="text-right">Produto/Un</TableHead>
                              <TableHead className="text-right">Pers./Un</TableHead>
                              <TableHead className="text-right">Setup</TableHead>
                              <TableHead className="text-right">Total Geral</TableHead>
                              <TableHead className="text-right">Final/Un</TableHead>
                              <TableHead className="text-center">Prazo</TableHead>
                              <TableHead className="w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {simulationOptions
                              .sort((a, b) => a.grandTotal - b.grandTotal)
                              .map((option, idx) => (
                                <TableRow 
                                  key={option.id}
                                  className={cn(
                                    idx === 0 && "bg-success/5"
                                  )}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {idx === 0 && (
                                        <Badge className="bg-success text-success-foreground text-[10px]">
                                          Menor custo
                                        </Badge>
                                      )}
                                      <div>
                                        <p className="font-medium">{option.techniqueName}</p>
                                        <p className="text-xs text-muted-foreground">{option.techniqueCode}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                      {option.colors > 0 && <p>{option.colors} cor(es)</p>}
                                      <p>{option.width}×{option.height}cm</p>
                                      <p>{option.positions} pos.</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    {formatCurrency(option.productUnitPrice)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    {formatCurrency(option.costPerUnit)}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                    {formatCurrency(option.setupCost)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div>
                                      <span className="font-bold text-lg">
                                        {formatCurrency(option.grandTotal)}
                                      </span>
                                      <p className="text-[10px] text-muted-foreground">
                                        Prod: {formatCurrency(option.totalProductCost)} + Pers: {formatCurrency(option.totalPersonalizationCost)}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span className="font-semibold text-primary">
                                      {formatCurrency(option.grandTotalPerUnit)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                                      <Clock className="h-3.5 w-3.5" />
                                      {option.estimatedDays}d
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => copyToClipboard(option)}
                                    >
                                      {copiedId === option.id ? (
                                        <Check className="h-4 w-4 text-success" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                        <div className="p-4 rounded-xl bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
                          <p className="text-2xl font-bold">{quantity}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Preço/Un</p>
                          <p className="text-xl font-bold">{formatCurrency(effectiveProductPrice)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-secondary/50 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Total Produtos</p>
                          <p className="text-xl font-bold">{formatCurrency(effectiveProductPrice * quantity)}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-success/10 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Menor Total</p>
                          <p className="text-xl font-bold text-success">
                            {formatCurrency(Math.min(...simulationOptions.map(o => o.grandTotal)))}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-warning/10 text-center">
                          <p className="text-xs text-muted-foreground mb-1">Maior Total</p>
                          <p className="text-xl font-bold text-warning">
                            {formatCurrency(Math.max(...simulationOptions.map(o => o.grandTotal)))}
                          </p>
                        </div>
                      </div>

                      {/* Profit Margin Calculator */}
                      <Card className="mt-6 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            Calculadora de Margem de Lucro
                          </CardTitle>
                          <CardDescription>
                            Calcule sua margem de lucro ou determine o preço de venda ideal
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Option 1: Calculate margin from selling price */}
                            <div className="space-y-4 p-4 rounded-lg bg-card border">
                              <h4 className="font-medium flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">1</span>
                                Calcular margem a partir do preço de venda
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="selling-price">Preço de venda por unidade</Label>
                                  <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                                    <Input
                                      id="selling-price"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0,00"
                                      value={sellingPrice}
                                      onChange={(e) => setSellingPrice(e.target.value)}
                                      className="pl-9"
                                    />
                                  </div>
                                </div>
                                
                                {sellingPrice && parseFloat(sellingPrice) > 0 && simulationOptions.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {simulationOptions
                                      .sort((a, b) => a.grandTotalPerUnit - b.grandTotalPerUnit)
                                      .map((option) => {
                                        const cost = option.grandTotalPerUnit;
                                        const price = parseFloat(sellingPrice);
                                        const profit = price - cost;
                                        const marginPercent = ((profit / price) * 100);
                                        const markupPercent = ((profit / cost) * 100);
                                        const totalProfit = profit * quantity;
                                        
                                        return (
                                          <div 
                                            key={option.id} 
                                            className={cn(
                                              "p-3 rounded-lg border",
                                              marginPercent >= 30 ? "bg-success/10 border-success/30" :
                                              marginPercent >= 15 ? "bg-warning/10 border-warning/30" :
                                              "bg-destructive/10 border-destructive/30"
                                            )}
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-medium text-sm">{option.techniqueName}</span>
                                              <Badge 
                                                variant="outline"
                                                className={cn(
                                                  marginPercent >= 30 ? "border-success text-success" :
                                                  marginPercent >= 15 ? "border-warning text-warning" :
                                                  "border-destructive text-destructive"
                                                )}
                                              >
                                                {marginPercent >= 30 ? "Ótima" : marginPercent >= 15 ? "Regular" : "Baixa"}
                                              </Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                              <div>
                                                <span className="text-muted-foreground">Custo/un:</span>
                                                <span className="ml-1 font-medium">{formatCurrency(cost)}</span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Lucro/un:</span>
                                                <span className={cn("ml-1 font-medium", profit >= 0 ? "text-success" : "text-destructive")}>
                                                  {formatCurrency(profit)}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Margem:</span>
                                                <span className={cn("ml-1 font-bold", marginPercent >= 30 ? "text-success" : marginPercent >= 15 ? "text-warning" : "text-destructive")}>
                                                  {marginPercent.toFixed(1)}%
                                                </span>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Markup:</span>
                                                <span className="ml-1 font-medium">{markupPercent.toFixed(1)}%</span>
                                              </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-border/50">
                                              <span className="text-muted-foreground text-sm">Lucro total ({quantity} un):</span>
                                              <span className={cn("ml-2 font-bold", totalProfit >= 0 ? "text-success" : "text-destructive")}>
                                                {formatCurrency(totalProfit)}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Option 2: Calculate selling price from target margin */}
                            <div className="space-y-4 p-4 rounded-lg bg-card border">
                              <h4 className="font-medium flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">2</span>
                                Calcular preço a partir da margem desejada
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <Label htmlFor="target-margin">Margem de lucro desejada (%)</Label>
                                  <div className="relative mt-1">
                                    <Input
                                      id="target-margin"
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="1"
                                      placeholder="30"
                                      value={targetMargin}
                                      onChange={(e) => setTargetMargin(e.target.value)}
                                      className="pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                                  </div>
                                </div>
                                
                                {targetMargin && parseFloat(targetMargin) > 0 && simulationOptions.length > 0 && (
                                  <div className="space-y-3 pt-2">
                                    {simulationOptions
                                      .sort((a, b) => a.grandTotalPerUnit - b.grandTotalPerUnit)
                                      .map((option) => {
                                        const cost = option.grandTotalPerUnit;
                                        const margin = parseFloat(targetMargin) / 100;
                                        const suggestedPrice = cost / (1 - margin);
                                        const profit = suggestedPrice - cost;
                                        const totalProfit = profit * quantity;
                                        const totalRevenue = suggestedPrice * quantity;
                                        
                                        return (
                                          <div 
                                            key={option.id} 
                                            className="p-3 rounded-lg border bg-muted/30"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-medium text-sm">{option.techniqueName}</span>
                                              <span className="text-xs text-muted-foreground">Custo: {formatCurrency(cost)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                              <div>
                                                <span className="text-muted-foreground">Preço sugerido/un:</span>
                                                <p className="font-bold text-lg text-primary">{formatCurrency(suggestedPrice)}</p>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Lucro/un:</span>
                                                <p className="font-bold text-success">{formatCurrency(profit)}</p>
                                              </div>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-sm">
                                              <div>
                                                <span className="text-muted-foreground">Faturamento total:</span>
                                                <p className="font-medium">{formatCurrency(totalRevenue)}</p>
                                              </div>
                                              <div>
                                                <span className="text-muted-foreground">Lucro total:</span>
                                                <p className="font-bold text-success">{formatCurrency(totalProfit)}</p>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {selectedTechniques.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <Calculator className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-display text-lg font-semibold mb-2">
                        Selecione técnicas para simular
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-sm">
                        Escolha um produto e as técnicas de personalização que deseja comparar para ver os custos em tempo real.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Simulações Salvas
                </CardTitle>
                <CardDescription>
                  Consulte suas simulações anteriores ou vincule a um cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar por produto..."
                      value={filterProductSearch}
                      onChange={(e) => setFilterProductSearch(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <Select 
                    value={filterClientId || "_all"} 
                    onValueChange={(val) => setFilterClientId(val === "_all" ? null : val)}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] h-9">
                      <SelectValue placeholder="Todos os clientes" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      <SelectItem value="_all">Todos os clientes</SelectItem>
                      {clients?.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(filterProductSearch || filterClientId) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 px-3"
                      onClick={() => {
                        setFilterProductSearch("");
                        setFilterClientId(null);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>

                {savedSimulationsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : savedSimulations && savedSimulations.length > 0 ? (
                  (() => {
                    const filteredSimulations = savedSimulations.filter(sim => {
                      const matchesProduct = !filterProductSearch || 
                        sim.product_name.toLowerCase().includes(filterProductSearch.toLowerCase()) ||
                        (sim.product_sku && sim.product_sku.toLowerCase().includes(filterProductSearch.toLowerCase()));
                      const matchesClient = !filterClientId || sim.client_id === filterClientId;
                      return matchesProduct && matchesClient;
                    });

                    if (filteredSimulations.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <p className="text-muted-foreground text-sm">
                            Nenhuma simulação encontrada com os filtros aplicados.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {filteredSimulations.map(sim => (
                      <div
                        key={sim.id}
                        className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{sim.product_name}</p>
                              {sim.product_sku && (
                                <Badge variant="outline" className="text-xs">
                                  {sim.product_sku}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Package className="h-3.5 w-3.5" />
                                {sim.quantity} un
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                {formatCurrency(sim.product_unit_price)}/un
                              </span>
                              <span className="flex items-center gap-1">
                                <Palette className="h-3.5 w-3.5" />
                                {sim.simulation_data.length} técnica(s)
                              </span>
                            </div>
                            {sim.bitrix_clients && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {sim.bitrix_clients.name}
                                </Badge>
                                {sim.bitrix_clients.ramo && (
                                  <span className="text-xs text-muted-foreground">
                                    {sim.bitrix_clients.ramo}
                                  </span>
                                )}
                              </div>
                            )}
                            {sim.notes && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {sim.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {format(new Date(sim.created_at), "dd/MM/yy", { locale: ptBR })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewSimulation(sim)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deleteSimulationMutation.mutate(sim.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">
                      Nenhuma simulação salva
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Crie uma simulação e clique em "Salvar" para consultá-la depois.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Simulation Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Simulação</DialogTitle>
            <DialogDescription>
              Salve esta simulação para consultar depois ou vincule a um cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Vincular a cliente (opcional)
              </Label>
              <Select 
                value={selectedClientId || "_none"} 
                onValueChange={(val) => setSelectedClientId(val === "_none" ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="_none">Nenhum cliente</SelectItem>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <span>{client.name}</span>
                        {client.ramo && (
                          <span className="text-xs text-muted-foreground">• {client.ramo}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={simulationNotes}
                onChange={(e) => setSimulationNotes(e.target.value)}
                placeholder="Ex: Cliente precisa de entrega rápida..."
                rows={3}
              />
            </div>

            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <p className="font-medium">{selectedProduct?.name}</p>
              <p className="text-muted-foreground">
                {quantity} un • {simulationOptions.length} técnica(s) comparadas
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => saveSimulationMutation.mutate()}
              disabled={saveSimulationMutation.isPending}
              className="gap-2"
            >
              {saveSimulationMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Saved Simulation Dialog */}
      <Dialog open={!!viewSimulation} onOpenChange={() => setViewSimulation(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes da Simulação
            </DialogTitle>
          </DialogHeader>

          {viewSimulation && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-lg">{viewSimulation.product_name}</p>
                    {viewSimulation.product_sku && (
                      <p className="text-sm text-muted-foreground">SKU: {viewSimulation.product_sku}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(viewSimulation.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-sm">
                  <span><strong>Quantidade:</strong> {viewSimulation.quantity}</span>
                  <span><strong>Preço/un:</strong> {formatCurrency(viewSimulation.product_unit_price)}</span>
                </div>
                {viewSimulation.bitrix_clients && (
                  <div className="mt-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{viewSimulation.bitrix_clients.name}</span>
                    {viewSimulation.bitrix_clients.ramo && (
                      <Badge variant="outline" className="text-xs">{viewSimulation.bitrix_clients.ramo}</Badge>
                    )}
                  </div>
                )}
                {viewSimulation.notes && (
                  <p className="mt-3 text-sm italic text-muted-foreground">"{viewSimulation.notes}"</p>
                )}
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Técnica</TableHead>
                      <TableHead className="text-center">Detalhes</TableHead>
                      <TableHead className="text-right">Total Geral</TableHead>
                      <TableHead className="text-right">Final/Un</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewSimulation.simulation_data
                      .sort((a, b) => a.grandTotal - b.grandTotal)
                      .map((opt, idx) => (
                        <TableRow key={idx} className={cn(idx === 0 && "bg-success/5")}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {idx === 0 && (
                                <Badge className="bg-success text-success-foreground text-[10px]">
                                  Menor
                                </Badge>
                              )}
                              <div>
                                <p className="font-medium">{opt.techniqueName}</p>
                                <p className="text-xs text-muted-foreground">{opt.techniqueCode}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {opt.colors} cor(es) • {opt.width}×{opt.height}cm • {opt.positions} pos.
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(opt.grandTotal)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(opt.grandTotalPerUnit)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSimulation(null)}>
              Fechar
            </Button>
            <Button onClick={() => viewSimulation && loadSavedSimulation(viewSimulation)} className="gap-2">
              <Calculator className="h-4 w-4" />
              Carregar no Simulador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
