import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Image as ImageIcon, Download, RefreshCw, Wand2, History, Trash2, Clock, ChevronLeft, ChevronRight, RotateCcw, Save, Cloud, CloudOff, AlertCircle, CheckCircle2, Paintbrush, Sparkles, Search, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LogoPositionEditor } from "@/components/mockup/LogoPositionEditor";
import { AIMockupAssistant } from "@/components/ai";
import { MultiAreaManager, PersonalizationArea } from "@/components/mockup/MultiAreaManager";

import { useMockupDraft, MockupDraftData } from "@/hooks/useMockupDraft";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MockupWizard, useMockupWizardStep } from "@/components/mockup/MockupWizard";
import { ProductSearchCombobox } from "@/components/mockup/ProductSearchCombobox";
import { MockupResultCard } from "@/components/mockup/MockupResultCard";
import { MockupSkeleton, MockupHistorySkeleton } from "@/components/mockup/MockupSkeleton";
import { TechniqueTooltip } from "@/components/mockup/TechniqueTooltip";
import { GenerateButton, GenerateFAB } from "@/components/mockup/GenerateButton";
import { showMockupSuccessToast } from "@/components/mockup/MockupSuccessToast";
import { useKeyboardShortcuts, KeyboardShortcutsHint } from "@/components/mockup/KeyboardShortcuts";
import { GeneratingOverlay } from "@/components/mockup/GeneratingOverlay";
import confetti from "canvas-confetti";

interface Product {
  id: string;
  name: string;
  sku: string;
  images: unknown;
}

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface GeneratedMockup {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  technique_id: string | null;
  technique_name: string;
  mockup_url: string;
  logo_url: string;
  position_x: number | null;
  position_y: number | null;
  logo_width_cm: number | null;
  logo_height_cm: number | null;
  created_at: string;
  client_id: string | null;
  bitrix_clients?: { name: string } | null;
}

const TECHNIQUE_PROMPTS: Record<string, string> = {
  "bordado": "as professional machine embroidery with visible thread stitching texture, showing the thread weave pattern typical of embroidered logos",
  "silk": "as screen printed with flat solid colors, matte finish, ink sitting on top of the fabric surface",
  "dtf": "as DTF (Direct to Film) printed transfer with vibrant colors, slight glossy finish, smooth edges",
  "laser": "as laser engraved, etched into the material surface with a burned/oxidized appearance, monochromatic grey-brown tones",
  "laser_co2": "as CO2 laser engraved with precise etching, showing material removal and light burn marks on organic materials",
  "laser_fibra": "as fiber laser marked on metal, creating a high-contrast permanent mark with polished appearance",
  "sublimacao": "as sublimation printed, colors absorbed into the material, seamless integration with no texture difference",
  "tampografia": "as pad printed with slightly glossy ink, precise small details, subtle ink buildup",
  "hot_stamping": "as hot stamped with metallic foil finish, shiny reflective surface, typically gold or silver",
  "adesivo": "as vinyl sticker/decal applied to surface, slight edge visibility, glossy or matte vinyl finish",
  "uv": "as UV printed with raised ink texture, vibrant colors, slightly embossed feel",
  "transfer": "as heat transfer vinyl, smooth finish with slight sheen, cut around the design edges",
  "default": "as professionally printed/applied logo maintaining the technique's characteristic appearance"
};

const createDefaultArea = (): PersonalizationArea => ({
  id: crypto.randomUUID(),
  name: "Frente",
  positionX: 50,
  positionY: 50,
  logoWidth: 5,
  logoHeight: 3,
  logoPreview: null,
});

export default function MockupGenerator() {
  const { user } = useAuth();
  const { saveDraft, loadDraft, clearDraft, isSaving: isDraftSaving, isLoading: isDraftLoading, lastSaved, error: draftError } = useMockupDraft();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Multi-area support
  const [personalizationAreas, setPersonalizationAreas] = useState<PersonalizationArea[]>([createDefaultArea()]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  
  const [generatedMockup, setGeneratedMockup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [mockupHistory, setMockupHistory] = useState<GeneratedMockup[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mockupToDelete, setMockupToDelete] = useState<string | null>(null);
  
  // Error state for generation
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Draft restoration state
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [showDraftRestoredNotice, setShowDraftRestoredNotice] = useState(false);
  
  // History filters
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [filterTechnique, setFilterTechnique] = useState<string>("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  // Ref para evitar loops infinitos no auto-save
  const isRestoringDraft = useRef(false);

  // Get active area
  const activeArea = personalizationAreas.find(a => a.id === activeAreaId) || personalizationAreas[0];

  // Set initial active area
  useEffect(() => {
    if (!activeAreaId && personalizationAreas.length > 0) {
      setActiveAreaId(personalizationAreas[0].id);
    }
  }, [activeAreaId, personalizationAreas]);

  // Update active area properties
  const updateActiveArea = useCallback((updates: Partial<PersonalizationArea>) => {
    if (!activeAreaId) return;
    setPersonalizationAreas(prev => 
      prev.map(area => 
        area.id === activeAreaId ? { ...area, ...updates } : area
      )
    );
  }, [activeAreaId]);

  // Handle logo upload for a specific area
  const handleAreaLogoUpload = useCallback((areaId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const logoData = e.target?.result as string;
      setPersonalizationAreas(prev =>
        prev.map(area =>
          area.id === areaId ? { ...area, logoPreview: logoData } : area
        )
      );
    };
    reader.readAsDataURL(file);
  }, []);

  // Carregar dados e rascunho ao inicializar
  useEffect(() => {
    fetchData();
    fetchHistory();
  }, []);

  // Restaurar rascunho após carregar dados (products, techniques, clients)
  useEffect(() => {
    const restoreDraft = async () => {
      if (isLoadingData || hasDraftRestored || isRestoringDraft.current) return;
      isRestoringDraft.current = true;
      
      try {
        const draft = await loadDraft();
        if (draft && (draft.productId || draft.techniqueId || draft.personalizationAreas.some(a => a.logoPreview))) {
          // Restaurar produto
          if (draft.productId) {
            const product = products.find(p => p.id === draft.productId);
            if (product) setSelectedProduct(product);
          }
          
          // Restaurar técnica
          if (draft.techniqueId) {
            const technique = techniques.find(t => t.id === draft.techniqueId);
            if (technique) setSelectedTechnique(technique);
          }
          
          // Restaurar cliente
          if (draft.clientId) {
            const client = clients.find(c => c.id === draft.clientId);
            if (client) setSelectedClient(client);
          }
          
          // Restaurar áreas de personalização
          if (draft.personalizationAreas.length > 0) {
            setPersonalizationAreas(draft.personalizationAreas);
            setActiveAreaId(draft.personalizationAreas[0].id);
          }
          
          setShowDraftRestoredNotice(true);
          // Auto-hide notice after 5 seconds
          setTimeout(() => setShowDraftRestoredNotice(false), 5000);
        }
      } catch (err) {
        console.error("Erro ao restaurar rascunho:", err);
      } finally {
        setHasDraftRestored(true);
        isRestoringDraft.current = false;
      }
    };
    
    restoreDraft();
  }, [isLoadingData, products, techniques, clients, loadDraft, hasDraftRestored]);

  // Auto-save quando dados mudarem
  useEffect(() => {
    if (!hasDraftRestored || isRestoringDraft.current) return;
    
    const draftData: MockupDraftData = {
      productId: selectedProduct?.id || null,
      productName: selectedProduct?.name || null,
      techniqueId: selectedTechnique?.id || null,
      techniqueName: selectedTechnique?.name || null,
      clientId: selectedClient?.id || null,
      clientName: selectedClient?.name || null,
      personalizationAreas,
      updatedAt: new Date().toISOString(),
    };
    
    saveDraft(draftData);
  }, [selectedProduct, selectedTechnique, selectedClient, personalizationAreas, saveDraft, hasDraftRestored]);

  const fetchData = async () => {
    try {
      const [productsRes, techniquesRes, clientsRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, sku, images")
          .eq("is_active", true)
          .order("name")
          .limit(500),
        supabase
          .from("personalization_techniques")
          .select("id, name, code")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("bitrix_clients")
          .select("id, name")
          .order("name")
      ]);

      if (productsRes.error) throw productsRes.error;
      if (techniquesRes.error) throw techniquesRes.error;

      setProducts(productsRes.data || []);
      setTechniques(techniquesRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("generated_mockups")
        .select(`
          id,
          product_id,
          product_name,
          product_sku,
          technique_id,
          technique_name,
          mockup_url,
          logo_url,
          position_x,
          position_y,
          logo_width_cm,
          logo_height_cm,
          created_at,
          client_id,
          bitrix_clients(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMockupHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeAreaId) return;

    handleAreaLogoUpload(activeAreaId, file);
  };

  const getProductImage = (): string | null => {
    if (!selectedProduct?.images) return null;
    const images = Array.isArray(selectedProduct.images) ? selectedProduct.images : [];
    return images.length > 0 ? String(images[0]) : null;
  };

  const getTechniquePrompt = (technique: Technique): string => {
    const code = technique.code?.toLowerCase() || technique.name.toLowerCase();
    
    for (const [key, prompt] of Object.entries(TECHNIQUE_PROMPTS)) {
      if (code.includes(key) || technique.name.toLowerCase().includes(key)) {
        return prompt;
      }
    }
    
    return TECHNIQUE_PROMPTS.default;
  };

  const saveMockupToHistory = async (mockupUrl: string, area: PersonalizationArea) => {
    if (!user || !selectedProduct || !selectedTechnique || !area.logoPreview) return;

    try {
      const { error } = await supabase
        .from("generated_mockups")
        .insert({
          seller_id: user.id,
          client_id: selectedClient?.id || null,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_sku: selectedProduct.sku,
          technique_id: selectedTechnique.id,
          technique_name: selectedTechnique.name,
          logo_url: area.logoPreview,
          mockup_url: mockupUrl,
          position_x: area.positionX,
          position_y: area.positionY,
          logo_width_cm: area.logoWidth,
          logo_height_cm: area.logoHeight,
        });

      if (error) throw error;
      fetchHistory();
    } catch (error) {
      console.error("Error saving mockup to history:", error);
    }
  };

  const generateMockup = async () => {
    // Check if at least one area has a logo
    const areasWithLogos = personalizationAreas.filter(a => a.logoPreview);
    
    if (!selectedProduct || !selectedTechnique || areasWithLogos.length === 0) {
      toast.error("Selecione produto, técnica e faça upload de pelo menos um logo");
      return;
    }

    const productImage = getProductImage();
    if (!productImage) {
      toast.error("O produto selecionado não possui imagem");
      return;
    }

    setIsLoading(true);
    setGeneratedMockup(null);
    setGenerationError(null);

    try {
      const techniquePrompt = getTechniquePrompt(selectedTechnique);
      
      // Use the first area with a logo for now (can be extended to generate multiple mockups)
      const primaryArea = areasWithLogos[0];
      
      const response = await supabase.functions.invoke("generate-mockup", {
        body: {
          productImageUrl: productImage,
          logoBase64: primaryArea.logoPreview,
          techniqueName: selectedTechnique.name,
          techniquePrompt,
          positionX: primaryArea.positionX,
          positionY: primaryArea.positionY,
          logoWidthCm: primaryArea.logoWidth,
          logoHeightCm: primaryArea.logoHeight,
          productName: selectedProduct.name,
          // Include all areas info for potential multi-area generation
          areas: areasWithLogos.map(a => ({
            name: a.name,
            positionX: a.positionX,
            positionY: a.positionY,
            logoWidth: a.logoWidth,
            logoHeight: a.logoHeight,
          }))
        }
      });

      if (response.error) throw response.error;

      if (response.data?.mockupUrl) {
        setGeneratedMockup(response.data.mockupUrl);
        await saveMockupToHistory(response.data.mockupUrl, primaryArea);
        // Add XP for generating mockup
        addXp(25);
        // 🎉 Confetti celebration!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        // Show rich success toast with preview
        showMockupSuccessToast({
          mockupUrl: response.data.mockupUrl,
          productName: selectedProduct.name,
          techniqueName: selectedTechnique.name,
          onDownload: () => downloadMockup(response.data.mockupUrl),
        });
      } else {
        throw new Error("Nenhuma imagem retornada");
      }
    } catch (error: any) {
      console.error("Error generating mockup:", error);
      const errorMessage = error.message || "Erro ao gerar mockup. Tente novamente.";
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMockup = (url?: string) => {
    const mockupUrl = url || generatedMockup;
    if (!mockupUrl) return;
    
    const link = document.createElement("a");
    link.href = mockupUrl;
    link.download = `mockup-${selectedProduct?.sku || "produto"}-${selectedTechnique?.name || "tecnica"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteMockup = async () => {
    if (!mockupToDelete) return;

    try {
      const { error } = await supabase
        .from("generated_mockups")
        .delete()
        .eq("id", mockupToDelete);

      if (error) throw error;
      
      setMockupHistory(prev => prev.filter(m => m.id !== mockupToDelete));
      toast.success("Mockup excluído");
    } catch (error) {
      console.error("Error deleting mockup:", error);
      toast.error("Erro ao excluir mockup");
    } finally {
      setDeleteDialogOpen(false);
      setMockupToDelete(null);
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSelectedTechnique(null);
    setSelectedClient(null);
    setPersonalizationAreas([createDefaultArea()]);
    setActiveAreaId(null);
    setGeneratedMockup(null);
    setGenerationError(null);
    clearDraft();
  };

  const loadFromHistory = (mockup: GeneratedMockup) => {
    // Find product and technique by ID
    const product = mockup.product_id ? products.find(p => p.id === mockup.product_id) : null;
    const technique = mockup.technique_id ? techniques.find(t => t.id === mockup.technique_id) : null;
    const client = mockup.client_id ? clients.find(c => c.id === mockup.client_id) : null;

    // Set form values
    setSelectedProduct(product || null);
    setSelectedTechnique(technique || null);
    setSelectedClient(client || null);
    
    // Create area from history
    const restoredArea: PersonalizationArea = {
      id: crypto.randomUUID(),
      name: "Frente",
      positionX: mockup.position_x ?? 50,
      positionY: mockup.position_y ?? 50,
      logoWidth: mockup.logo_width_cm ?? 5,
      logoHeight: mockup.logo_height_cm ?? 3,
      logoPreview: mockup.logo_url,
    };
    setPersonalizationAreas([restoredArea]);
    setActiveAreaId(restoredArea.id);
    setGeneratedMockup(null);

    // Switch to generator tab
    const generatorTab = document.querySelector('[data-state="inactive"][value="generator"]') as HTMLButtonElement | null;
    if (generatorTab) {
      generatorTab.click();
    }

    toast.success("Configurações carregadas! Ajuste se necessário e gere um novo mockup.");
  };

  // Calculate wizard step
  const wizardStep = useMockupWizardStep({
    hasProduct: !!selectedProduct,
    hasTechnique: !!selectedTechnique,
    hasLogo: personalizationAreas.some(a => !!a.logoPreview),
    hasPositioned: true, // Consider positioned once they have a logo
    hasGenerated: !!generatedMockup,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: generateMockup,
    onReset: resetForm,
    onDownload: () => downloadMockup(),
    canGenerate: !!(selectedProduct && selectedTechnique && personalizationAreas.some(a => a.logoPreview)),
    canDownload: !!generatedMockup,
    isLoading,
  });

  return (
    <MainLayout>
      {/* Generating Overlay */}
      <GeneratingOverlay
        isVisible={isLoading}
        productName={selectedProduct?.name}
        techniqueName={selectedTechnique?.name}
      />

      <div className="space-y-6">
        {/* Enhanced Gradient Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                <Sparkles className="h-7 w-7 text-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Gerador de Mockups
                </h1>
                <p className="text-muted-foreground mt-1">
                  Crie visualizações de produtos personalizados com IA
                </p>
              </div>
            </div>
          
            {/* Auto-save indicator */}
            <div className="flex items-center gap-2">
              {isDraftSaving ? (
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando...
                </Badge>
              ) : lastSaved ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex"><Badge variant="outline" className="flex items-center gap-1.5 cursor-default">
                      <Cloud className="h-3 w-3 text-green-500" />
                      Salvo automaticamente
                    </Badge></span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Último salvamento: {format(lastSaved, "HH:mm:ss", { locale: ptBR })}
                  </TooltipContent>
                </Tooltip>
              ) : draftError ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Badge variant="destructive" className="flex items-center gap-1.5 cursor-default">
                        <CloudOff className="h-3 w-3" />
                        Erro ao salvar
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{draftError}</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </div>
        {/* Wizard Progress */}
        <MockupWizard
          currentStep={wizardStep}
          hasProduct={!!selectedProduct}
          hasTechnique={!!selectedTechnique}
          hasLogo={personalizationAreas.some(a => !!a.logoPreview)}
          hasPositioned={true}
          hasGenerated={!!generatedMockup}
        />

        {/* Draft restored notice */}
        {showDraftRestoredNotice && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">Rascunho restaurado</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Seu progresso anterior foi restaurado automaticamente.
            </AlertDescription>
          </Alert>
        )}

        {/* Generation error notice */}
        {generationError && !isLoading && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro na geração</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{generationError}</span>
              <Button variant="outline" size="sm" onClick={() => setGenerationError(null)}>
                Dispensar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="generator" className="space-y-4">
          <TabsList>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Gerar Mockup
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico ({mockupHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5 text-primary" />
                    Configuração
                  </CardTitle>
                  <CardDescription>
                    Selecione o produto, técnica e faça upload do logo do cliente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Loading state for data */}
                  {isLoadingData && (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Carregando dados...</p>
                      </div>
                    </div>
                  )}
                  
                  {!isLoadingData && (
                    <>
                  {/* Client Selection (Optional) */}
                  <div className="space-y-2">
                    <Label>Cliente (opcional)</Label>
                    <Select
                      value={selectedClient?.id || "none"}
                      onValueChange={(value) => {
                        if (value === "none") {
                          setSelectedClient(null);
                        } else {
                          const client = clients.find((c) => c.id === value);
                          setSelectedClient(client || null);
                        }
                      }}
                      disabled={isLoadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Associar a um cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum cliente</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Selection - Enhanced Combobox */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">1</span>
                      Produto
                    </Label>
                    <ProductSearchCombobox
                      products={products}
                      selectedProduct={selectedProduct}
                      onSelect={(product) => {
                        setSelectedProduct(product);
                        setGeneratedMockup(null);
                      }}
                      disabled={isLoadingData}
                    />
                  </div>

                  {/* Technique Selection with Tooltip */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold">2</span>
                      Técnica de Personalização
                      {selectedTechnique && (
                        <TechniqueTooltip technique={selectedTechnique}>
                          <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                        </TechniqueTooltip>
                      )}
                    </Label>
                    <Select
                      value={selectedTechnique?.id || ""}
                      onValueChange={(value) => {
                        const technique = techniques.find((t) => t.id === value);
                        setSelectedTechnique(technique || null);
                        setGeneratedMockup(null);
                      }}
                      disabled={isLoadingData}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma técnica..." />
                      </SelectTrigger>
                      <SelectContent>
                        {techniques.map((technique) => (
                          <TechniqueTooltip key={technique.id} technique={technique}>
                            <SelectItem value={technique.id} className="cursor-pointer">
                              <div className="flex items-center gap-2">
                                <Paintbrush className="h-3.5 w-3.5 text-primary" />
                                {technique.name}
                              </div>
                            </SelectItem>
                          </TechniqueTooltip>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action Buttons with Gradient CTA */}
                  <div className="flex gap-2 pt-4">
                    <GenerateButton
                      onClick={generateMockup}
                      isLoading={isLoading}
                      isReady={!!(selectedProduct && selectedTechnique && personalizationAreas.some(a => a.logoPreview))}
                      stepsRemaining={
                        [!selectedProduct, !selectedTechnique, personalizationAreas.every(a => !a.logoPreview)]
                          .filter(Boolean).length
                      }
                      disabled={!selectedProduct || !selectedTechnique || personalizationAreas.every(a => !a.logoPreview) || isLoading}
                      className="flex-1"
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" onClick={resetForm} aria-label="Limpar formulário">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Limpar formulário</TooltipContent>
                    </Tooltip>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Multi-Area Manager + Position Editor - Sticky on desktop */}
              <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                {/* Multi-Area Manager */}
                <MultiAreaManager
                  areas={personalizationAreas}
                  activeAreaId={activeAreaId}
                  onAreasChange={setPersonalizationAreas}
                  onActiveAreaChange={setActiveAreaId}
                  onLogoUpload={handleAreaLogoUpload}
                />

                {/* Position Editor - Interactive Canvas */}
                {selectedProduct && getProductImage() && activeArea ? (
                  <LogoPositionEditor
                    productImageUrl={getProductImage()!}
                    logoPreview={activeArea.logoPreview}
                    positionX={activeArea.positionX}
                    positionY={activeArea.positionY}
                    logoWidth={activeArea.logoWidth}
                    logoHeight={activeArea.logoHeight}
                    techniqueCode={selectedTechnique?.code}
                    techniqueName={selectedTechnique?.name}
                    onPositionChange={(x, y) => {
                      updateActiveArea({ positionX: x, positionY: y });
                    }}
                    onSizeChange={(w, h) => {
                      updateActiveArea({ logoWidth: w, logoHeight: h });
                    }}
                  />
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex items-center justify-center py-16">
                      <div className="text-center text-muted-foreground max-w-xs animate-fade-in">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="font-medium text-foreground mb-1">Nenhum produto selecionado</p>
                        <p className="text-sm">Selecione um produto acima para começar a posicionar o logo</p>
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">1</span>
                          <span className="text-xs">Primeiro, escolha o produto</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generated Mockup Result */}
                {generatedMockup && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          Mockup Gerado
                        </CardTitle>
                        <Button size="sm" variant="outline" onClick={() => downloadMockup()}>
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-square rounded-lg border bg-muted/30 overflow-hidden ring-2 ring-primary/20">
                        <img
                          src={generatedMockup}
                          alt="Generated mockup"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Loading State */}
                {isLoading && (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center">
                        <Loader2 className="h-12 w-12 mx-auto mb-2 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Gerando mockup com IA...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Isso pode levar alguns segundos
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Histórico de Mockups
                </CardTitle>
                <CardDescription>
                  Mockups gerados anteriormente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Cliente</Label>
                    <Select value={filterClient} onValueChange={(v) => { setFilterClient(v); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todos os clientes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os clientes</SelectItem>
                        <SelectItem value="none">Sem cliente</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Produto</Label>
                    <Input
                      placeholder="Buscar por nome do produto..."
                      value={filterProduct}
                      onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Técnica</Label>
                    <Select value={filterTechnique} onValueChange={(v) => { setFilterTechnique(v); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Todas as técnicas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as técnicas</SelectItem>
                        {techniques.map((technique) => (
                          <SelectItem key={technique.id} value={technique.id}>
                            {technique.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Clear filters button */}
                {(filterClient !== "all" || filterProduct || filterTechnique !== "all") && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterClient("all");
                        setFilterProduct("");
                        setFilterTechnique("all");
                        setCurrentPage(1);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Limpar filtros
                    </Button>
                  </div>
                )}

                {isLoadingHistory ? (
                  <MockupHistorySkeleton count={8} />
                ) : (() => {
                  // Apply filters
                  const filteredMockups = mockupHistory.filter((mockup) => {
                    // Client filter
                    if (filterClient === "none" && mockup.client_id !== null) return false;
                    if (filterClient !== "all" && filterClient !== "none" && mockup.client_id !== filterClient) return false;
                    
                    // Product filter (text search)
                    if (filterProduct && !mockup.product_name.toLowerCase().includes(filterProduct.toLowerCase())) return false;
                    
                    // Technique filter
                    const selectedTechniqueForFilter = techniques.find(t => t.id === filterTechnique);
                    if (filterTechnique !== "all" && selectedTechniqueForFilter && mockup.technique_name !== selectedTechniqueForFilter.name) return false;
                    
                    return true;
                  });

                  // Pagination
                  const totalPages = Math.ceil(filteredMockups.length / ITEMS_PER_PAGE);
                  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                  const paginatedMockups = filteredMockups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

                  // Reset to page 1 if current page is out of bounds
                  if (currentPage > totalPages && totalPages > 0) {
                    setCurrentPage(1);
                  }

                  if (mockupHistory.length === 0) {
                    return (
                      <div className="text-center py-16 animate-fade-in">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Wand2 className="h-10 w-10 text-primary/60" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum mockup gerado ainda</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                          Comece criando seu primeiro mockup! Selecione um produto, escolha a técnica de personalização e faça upload do logo.
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const generatorTab = document.querySelector('[value="generator"]') as HTMLButtonElement;
                            generatorTab?.click();
                          }}
                        >
                          <Wand2 className="h-4 w-4 mr-2" />
                          Criar primeiro mockup
                        </Button>
                      </div>
                    );
                  }

                  if (filteredMockups.length === 0) {
                    return (
                      <div className="text-center py-16 animate-fade-in">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Search className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum resultado encontrado</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-4">
                          Não encontramos mockups com os filtros selecionados. Tente ajustar os critérios de busca.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFilterClient("all");
                            setFilterProduct("");
                            setFilterTechnique("all");
                            setCurrentPage(1);
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Limpar todos os filtros
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Results count */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>
                          Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredMockups.length)} de {filteredMockups.length} mockups
                        </span>
                        <span>Página {currentPage} de {totalPages}</span>
                      </div>

                      {/* Grid with staggered animations */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {paginatedMockups.map((mockup, index) => (
                          <div
                            key={mockup.id}
                            className="stagger-item group relative border rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 bg-card"
                          >
                            {/* Image with hover zoom */}
                            <div className="aspect-square bg-muted/30 overflow-hidden">
                              <img
                                src={mockup.mockup_url}
                                alt={`Mockup de ${mockup.product_name}`}
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            </div>
                            
                            {/* Info section with improved styling */}
                            <div className="p-3 space-y-1.5 border-t bg-gradient-to-t from-muted/50 to-transparent">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium text-sm truncate cursor-default block">{mockup.product_name}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>{mockup.product_name}</p>
                                  {mockup.product_sku && <p className="text-xs text-muted-foreground">SKU: {mockup.product_sku}</p>}
                                </TooltipContent>
                              </Tooltip>
                              
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {mockup.technique_name}
                                </Badge>
                              </div>
                              
                              {mockup.bitrix_clients?.name && (
                                <p className="text-xs text-primary truncate font-medium">
                                  👤 {mockup.bitrix_clients.name}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(mockup.created_at), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </div>
                            </div>
                            
                            {/* Overlay actions with improved styling */}
                            <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-8 w-8 shadow-md"
                                    onClick={() => loadFromHistory(mockup)}
                                    aria-label="Regenerar com estas configurações"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Regenerar mockup</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="secondary"
                                    className="h-8 w-8 shadow-md"
                                    onClick={() => downloadMockup(mockup.mockup_url)}
                                    aria-label="Baixar mockup"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Baixar mockup</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-8 w-8 shadow-md"
                                    onClick={() => {
                                      setMockupToDelete(mockup.id);
                                      setDeleteDialogOpen(true);
                                    }}
                                    aria-label="Excluir mockup"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir mockup</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                          >
                            Primeira
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          
                          {/* Page numbers */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                          >
                            Última
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mockup?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O mockup será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteMockup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile FAB - Enhanced Generate Button */}
      <GenerateFAB
        onClick={generateMockup}
        isLoading={isLoading}
        isReady={!!(selectedProduct && selectedTechnique && personalizationAreas.some(a => a.logoPreview))}
        disabled={!selectedProduct || !selectedTechnique || personalizationAreas.every(a => !a.logoPreview) || isLoading}
      />

      {/* AI Mockup Assistant */}
      <AIMockupAssistant
        productName={products.find(p => p.id === selectedProduct)?.name}
        techniqueName={techniques.find(t => t.id === selectedTechnique)?.name}
      />
    </MainLayout>
  );
}
