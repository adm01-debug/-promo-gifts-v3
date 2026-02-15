/**
 * MockupGenerator — Refactored v3
 * 
 * Fixes applied in v3:
 * - hasPositioned logic fixed (tracks user interaction, not position values)
 * - Download works cross-origin via fetch+blob
 * - Logo uploaded to storage bucket instead of base64 in DB
 * - seller_id filter in fetchHistory
 * - Confetti removed (handled by MockupResultCard)
 * - Tab switching via state instead of querySelector
 * - Drag-and-drop logo upload support
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Wand2, History, Sparkles, Cloud, CloudOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
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
import { MockupResultCard } from "@/components/mockup/MockupResultCard";
import { MockupConfigPanel } from "@/components/mockup/MockupConfigPanel";
import { MockupHistoryPanel } from "@/components/mockup/MockupHistoryPanel";
import { useKeyboardShortcuts } from "@/components/mockup/KeyboardShortcuts";
import { GenerateFAB } from "@/components/mockup/GenerateButton";
import { showMockupSuccessToast } from "@/components/mockup/MockupSuccessToast";
import { GeneratingOverlay } from "@/components/mockup/GeneratingOverlay";
import { useFilteredTechniques, type TechniqueWithLimits } from "@/hooks/useMockupTechniques";
import { uploadLogoToStorage, downloadImageFromUrl } from "@/lib/mockup-storage";
import { useProductsContext } from "@/contexts/ProductsContext";
import type { Product } from "@/hooks/useProducts";
import type { MockupProductSelection } from "@/components/mockup/MockupProductSelector";

// ─── Types ───────────────────────────────────────────────────────────

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

// Client type imported from MockupConfigPanel
import type { MockupClient } from "@/components/mockup/MockupConfigPanel";

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

// ─── Technique prompt mapping ────────────────────────────────────────

const TECHNIQUE_PROMPTS: Record<string, string> = {
  bordado: "as professional machine embroidery with visible thread stitching texture",
  silk: "as screen printed with flat solid colors, matte finish",
  dtf: "as DTF printed transfer with vibrant colors, slight glossy finish",
  laser: "as laser engraved, etched into the material surface, monochromatic",
  laser_co2: "as CO2 laser engraved with precise etching on organic materials",
  laser_fibra: "as fiber laser marked on metal with high-contrast permanent mark",
  sublimacao: "as sublimation printed, colors absorbed seamlessly into the material",
  tampografia: "as pad printed with slightly glossy ink, precise small details",
  hot_stamping: "as hot stamped with metallic foil finish, shiny reflective surface",
  adesivo: "as vinyl sticker/decal applied to surface",
  uv: "as UV printed with raised ink texture, vibrant colors",
  transfer: "as heat transfer vinyl, smooth finish with slight sheen",
  default: "as professionally printed/applied logo",
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

// ─── Component ───────────────────────────────────────────────────────

export default function MockupGenerator() {
  const { user } = useAuth();
  const { saveDraft, loadDraft, clearDraft, isSaving: isDraftSaving, lastSaved, error: draftError } = useMockupDraft();
  const { products } = useProductsContext();

  // Data state
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Selection state
  const [productSelection, setProductSelection] = useState<MockupProductSelection | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  const [selectedClient, setSelectedClient] = useState<MockupClient | null>(null);

  // Multi-area
  const [personalizationAreas, setPersonalizationAreas] = useState<PersonalizationArea[]>([createDefaultArea()]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  // Generation
  const [generatedMockup, setGeneratedMockup] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // History
  const [mockupHistory, setMockupHistory] = useState<GeneratedMockup[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mockupToDelete, setMockupToDelete] = useState<string | null>(null);

  // Draft
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [showDraftRestoredNotice, setShowDraftRestoredNotice] = useState(false);
  const isRestoringDraft = useRef(false);

  // Tab state (replaces fragile querySelector)
  const [activeTab, setActiveTab] = useState("generator");

  // Track if user has interacted with positioning (not just default values)
  const [hasUserInteractedPosition, setHasUserInteractedPosition] = useState(false);

  // ─── Derived state ──────────────────────────────────────────────────

  const activeArea = personalizationAreas.find(a => a.id === activeAreaId) || personalizationAreas[0];
  const selectedProduct = productSelection?.product ?? null;
  const filteredTechniques = useFilteredTechniques(techniques, selectedProduct);
  const hasLogo = personalizationAreas.some(a => !!a.logoPreview);

  // ─── Effects ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeAreaId && personalizationAreas.length > 0) {
      setActiveAreaId(personalizationAreas[0].id);
    }
  }, [activeAreaId, personalizationAreas]);

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, []);

  // When product changes, clear technique if not compatible
  useEffect(() => {
    if (selectedTechnique && filteredTechniques.length > 0) {
      const isStillValid = filteredTechniques.some(t => t.id === selectedTechnique.id);
      if (!isStillValid) {
        setSelectedTechnique(null);
      }
    }
  }, [filteredTechniques, selectedTechnique]);

  // Draft restoration
  useEffect(() => {
    const restoreDraft = async () => {
      if (isLoadingData || hasDraftRestored || isRestoringDraft.current) return;
      isRestoringDraft.current = true;

      try {
        const draft = await loadDraft();
        if (draft && (draft.productId || draft.techniqueId || draft.personalizationAreas.some(a => a.logoPreview))) {
          if (draft.productId) {
            const product = products.find(p => p.id === draft.productId);
            if (product) setProductSelection({
              product,
              variant: null,
              imageUrl: product.images?.[0] || '/placeholder.svg',
            });
          }
          if (draft.techniqueId) {
            const technique = techniques.find(t => t.id === draft.techniqueId);
            if (technique) setSelectedTechnique(technique);
          }
          if (draft.clientId && draft.clientName) {
            setSelectedClient({ id: draft.clientId, name: draft.clientName });
          }
          if (draft.personalizationAreas.length > 0) {
            setPersonalizationAreas(draft.personalizationAreas);
            setActiveAreaId(draft.personalizationAreas[0].id);
          }
          setShowDraftRestoredNotice(true);
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
  }, [isLoadingData, products, techniques, loadDraft, hasDraftRestored]);

  // Auto-save
  useEffect(() => {
    if (!hasDraftRestored || isRestoringDraft.current) return;
    const draftData: MockupDraftData = {
      productId: productSelection?.product?.id || null,
      productName: productSelection?.product?.name || null,
      techniqueId: selectedTechnique?.id || null,
      techniqueName: selectedTechnique?.name || null,
      clientId: selectedClient?.id || null,
      clientName: selectedClient?.name || null,
      personalizationAreas,
      updatedAt: new Date().toISOString(),
    };
    saveDraft(draftData);
  }, [productSelection, selectedTechnique, selectedClient, personalizationAreas, saveDraft, hasDraftRestored]);

  // ─── Data fetching ──────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      const techniquesRes = await supabase.functions.invoke("external-db-bridge", {
        body: {
          table: "tabela_preco_gravacao_oficial",
          operation: "select",
          filters: { ativo: true },
          limit: 100,
        },
      });

      const records = techniquesRes.data?.data?.records || techniquesRes.data?.records || [];
      // Map external table fields to Technique interface
      const techniquesData = records.map((r: any) => ({
        id: r.id,
        name: r.nome,
        code: r.codigo_curto || r.codigo_tabela || null,
      }));
      // Sort by name
      techniquesData.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setTechniques(techniquesData);
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
      let query = supabase
        .from("generated_mockups")
        .select(`id, product_id, product_name, product_sku, technique_id, technique_name, mockup_url, logo_url, position_x, position_y, logo_width_cm, logo_height_cm, created_at, client_id, bitrix_clients(name)`)
        .order("created_at", { ascending: false });

      // RLS should handle this, but add explicit filter for defense-in-depth
      if (user?.id) {
        query = query.eq("seller_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMockupHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Refetch history when user changes
  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user?.id]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const updateActiveArea = useCallback((updates: Partial<PersonalizationArea>) => {
    if (!activeAreaId) return;
    setPersonalizationAreas(prev =>
      prev.map(area => area.id === activeAreaId ? { ...area, ...updates } : area)
    );
    // Track that user has interacted with position/size
    if ('positionX' in updates || 'positionY' in updates || 'logoWidth' in updates || 'logoHeight' in updates) {
      setHasUserInteractedPosition(true);
    }
  }, [activeAreaId]);

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
        prev.map(area => area.id === areaId ? { ...area, logoPreview: logoData } : area)
      );
    };
    reader.readAsDataURL(file);
  }, []);

  const getProductImage = (): string | null => {
    // Use variant-specific image if available, fallback to product image
    if (productSelection?.imageUrl) return productSelection.imageUrl;
    if (!selectedProduct?.images?.length) return null;
    return selectedProduct.images[0] || null;
  };

  const getTechniquePrompt = (technique: Technique): string => {
    const code = technique.code?.toLowerCase() || technique.name.toLowerCase();
    for (const [key, prompt] of Object.entries(TECHNIQUE_PROMPTS)) {
      if (code.includes(key) || technique.name.toLowerCase().includes(key)) return prompt;
    }
    return TECHNIQUE_PROMPTS.default;
  };

  const saveMockupToHistory = async (mockupUrl: string, area: PersonalizationArea) => {
    if (!user || !selectedProduct || !selectedTechnique || !area.logoPreview) return;
    try {
      // Upload logo to storage bucket instead of saving base64 in DB
      let logoUrl = area.logoPreview;
      
      // Only upload if it's base64 data (not already a URL)
      if (area.logoPreview.startsWith("data:")) {
        const uploadedUrl = await uploadLogoToStorage(
          user.id,
          area.logoPreview,
          `${selectedProduct.sku || "product"}-${selectedTechnique.code || "tech"}`
        );
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          console.warn("[MockupGenerator] Logo upload to storage failed, skipping logo_url save");
          logoUrl = ""; // Don't save base64 in DB
        }
      }

      const { error } = await supabase.from("generated_mockups").insert({
        seller_id: user.id,
        client_id: selectedClient?.id || null,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_sku: selectedProduct.sku,
        technique_id: selectedTechnique.id,
        technique_name: selectedTechnique.name,
        logo_url: logoUrl,
        mockup_url: mockupUrl,
        position_x: area.positionX,
        position_y: area.positionY,
        logo_width_cm: area.logoWidth,
        logo_height_cm: area.logoHeight,
      });
      if (error) throw error;
      fetchHistory();
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  const generateMockup = async () => {
    const areasWithLogos = personalizationAreas.filter(a => a.logoPreview);
    if (!selectedClient || !productSelection || !selectedTechnique || areasWithLogos.length === 0) {
      toast.error("Selecione empresa, produto, técnica e faça upload de pelo menos um logo");
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
      const primaryArea = areasWithLogos[0];

      // If logoPreview is a URL (from history), pass it as logoUrl; if base64, pass as logoBase64
      const isLogoUrl = primaryArea.logoPreview?.startsWith("http");

      const response = await supabase.functions.invoke("generate-mockup", {
        body: {
          productImageUrl: productImage,
          logoBase64: isLogoUrl ? undefined : primaryArea.logoPreview,
          logoUrl: isLogoUrl ? primaryArea.logoPreview : undefined,
          techniqueName: selectedTechnique.name,
          techniquePrompt,
          positionX: primaryArea.positionX,
          positionY: primaryArea.positionY,
          logoWidthCm: primaryArea.logoWidth,
          logoHeightCm: primaryArea.logoHeight,
          productName: selectedProduct.name,
          areas: areasWithLogos.map(a => ({
            name: a.name,
            positionX: a.positionX,
            positionY: a.positionY,
            logoWidth: a.logoWidth,
            logoHeight: a.logoHeight,
          })),
        },
      });

      if (response.error) throw response.error;

      if (response.data?.mockupUrl) {
        setGeneratedMockup(response.data.mockupUrl);
        await saveMockupToHistory(response.data.mockupUrl, primaryArea);
        // Confetti is handled by MockupResultCard - no duplicate here
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
      const errorMessage = error.message || "Erro ao gerar mockup";
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Cross-origin safe download using fetch+blob
  const downloadMockup = async (url?: string) => {
    const mockupUrl = url || generatedMockup;
    if (!mockupUrl) return;
    
    const fileName = `mockup-${selectedProduct?.sku || "produto"}-${selectedTechnique?.name || "tecnica"}.png`;
    await downloadImageFromUrl(mockupUrl, fileName);
  };

  const deleteMockup = async () => {
    if (!mockupToDelete) return;
    try {
      const { error } = await supabase.from("generated_mockups").delete().eq("id", mockupToDelete);
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
    setProductSelection(null);
    setSelectedTechnique(null);
    setSelectedClient(null);
    setPersonalizationAreas([createDefaultArea()]);
    setActiveAreaId(null);
    setGeneratedMockup(null);
    setGenerationError(null);
    setHasUserInteractedPosition(false);
    clearDraft();
  };

  const handleShareMockup = (mockup: GeneratedMockup) => {
    const text = `Confira o mockup: ${mockup.product_name} com ${mockup.technique_name}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n" + mockup.mockup_url)}`;
    window.open(whatsappUrl, "_blank");
  };

  const loadFromHistory = (mockup: GeneratedMockup) => {
    const product = mockup.product_id ? products.find(p => p.id === mockup.product_id) : null;
    const technique = mockup.technique_id ? techniques.find(t => t.id === mockup.technique_id) : null;

    if (product) {
      setProductSelection({
        product,
        variant: null,
        imageUrl: product.images?.[0] || '/placeholder.svg',
      });
    } else {
      setProductSelection(null);
    }
    setSelectedTechnique(technique || null);
    // Restore client from history metadata (no local lookup needed)
    setSelectedClient(mockup.client_id ? { id: mockup.client_id, name: (mockup as any).bitrix_clients?.name || "Cliente" } : null);

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
    // Position was already set from history — mark as interacted
    setHasUserInteractedPosition(true);

    // Switch to generator tab via state (no fragile querySelector)
    setActiveTab("generator");
    toast.success("Configurações carregadas!");
  };

  // Wizard step
  const wizardStep = useMockupWizardStep({
    hasProduct: !!selectedProduct,
    hasTechnique: !!selectedTechnique,
    hasLogo,
    hasPositioned: hasUserInteractedPosition,
    hasGenerated: !!generatedMockup,
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: generateMockup,
    onReset: resetForm,
    onDownload: () => downloadMockup(),
    canGenerate: !!(selectedProduct && selectedTechnique && hasLogo),
    canDownload: !!generatedMockup,
    isLoading,
  });

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <GeneratingOverlay
        isVisible={isLoading}
        productName={selectedProduct?.name}
        techniqueName={selectedTechnique?.name}
      />

      <div className="space-y-6">
        {/* Header */}
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
                    <span className="inline-flex">
                      <Badge variant="outline" className="flex items-center gap-1.5 cursor-default">
                        <Cloud className="h-3 w-3 text-green-500" />
                        Salvo
                      </Badge>
                    </span>
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
          hasLogo={hasLogo}
          hasPositioned={hasUserInteractedPosition}
          hasGenerated={!!generatedMockup}
        />

        {/* Notices */}
        {showDraftRestoredNotice && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">Rascunho restaurado</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              Seu progresso anterior foi restaurado automaticamente.
            </AlertDescription>
          </Alert>
        )}

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

        {/* Tabs — controlled via state */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> Gerar Mockup
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico ({mockupHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Config Panel */}
              <MockupConfigPanel
                techniques={techniques}
                productSelection={productSelection}
                selectedTechnique={selectedTechnique}
                selectedClient={selectedClient}
                isLoadingData={isLoadingData}
                isLoading={isLoading}
                personalizationAreas={personalizationAreas}
                filteredTechniques={filteredTechniques}
                onProductSelect={(sel) => {
                  setProductSelection(sel);
                  setGeneratedMockup(null);
                }}
                onTechniqueSelect={(t) => {
                  setSelectedTechnique(t);
                  setGeneratedMockup(null);
                }}
                onClientSelect={setSelectedClient}
                onGenerate={generateMockup}
                onReset={resetForm}
              />

              {/* Right panel: Areas + Position Editor + Result */}
              <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                <MultiAreaManager
                  areas={personalizationAreas}
                  activeAreaId={activeAreaId}
                  onAreasChange={setPersonalizationAreas}
                  onActiveAreaChange={setActiveAreaId}
                  onLogoUpload={handleAreaLogoUpload}
                />

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
                    onPositionChange={(x, y) => updateActiveArea({ positionX: x, positionY: y })}
                    onSizeChange={(w, h) => updateActiveArea({ logoWidth: w, logoHeight: h })}
                  />
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex items-center justify-center py-16">
                      <div className="text-center text-muted-foreground max-w-xs">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="font-medium text-foreground mb-1">Nenhum produto selecionado</p>
                        <p className="text-sm">Selecione um produto para posicionar o logo</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Generated Result */}
                <MockupResultCard
                  generatedMockup={generatedMockup}
                  isLoading={isLoading}
                  onDownload={() => downloadMockup()}
                  productName={selectedProduct?.name}
                  techniqueName={selectedTechnique?.name}
                  onReset={resetForm}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <MockupHistoryPanel
              mockupHistory={mockupHistory}
              isLoading={isLoadingHistory}
              clients={[]}
              techniques={techniques}
              onLoadFromHistory={loadFromHistory}
              onDownload={downloadMockup}
              onDelete={(id) => {
                setMockupToDelete(id);
                setDeleteDialogOpen(true);
              }}
              onShare={handleShareMockup}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mockup?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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

      {/* Mobile FAB */}
      <GenerateFAB
        onClick={generateMockup}
        isLoading={isLoading}
        isReady={!!(selectedProduct && selectedTechnique && hasLogo)}
        disabled={!selectedProduct || !selectedTechnique || !hasLogo || isLoading}
      />

      {/* AI Assistant */}
      <AIMockupAssistant
        productName={selectedProduct?.name}
        techniqueName={selectedTechnique?.name}
      />
    </MainLayout>
  );
}
