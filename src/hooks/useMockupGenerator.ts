/**
 * useMockupGenerator — Core business logic hook for MockupGenerator page
 * 
 * Extracted from MockupGenerator.tsx to follow the 3-layer pattern:
 * Page → Hook → Service
 * 
 * Manages: selections, areas, generation, history, drafts, undo/redo.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMockupDraft, MockupDraftData } from "@/hooks/useMockupDraft";
import { useFilteredTechniques, useProductCustomizationOptionsForMockup } from "@/hooks/useMockupTechniques";
import { usePositionHistory } from "@/hooks/usePositionHistory";
import { uploadLogoToStorage, downloadImageFromUrl } from "@/lib/mockup-storage";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useMockupWizardStep } from "@/components/mockup/MockupWizard";
import { showMockupSuccessToast } from "@/components/mockup/MockupSuccessToast";
import type { PersonalizationArea } from "@/components/mockup/MultiAreaManager";
import type { MockupProductSelection } from "@/components/mockup/MockupProductSelector";
import type { MockupClient } from "@/components/mockup/MockupConfigPanel";

// ─── Types ───────────────────────────────────────────────────────────

export interface Technique {
  id: string;
  name: string;
  code: string | null;
}

export interface GeneratedMockup {
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

// ─── Hook ────────────────────────────────────────────────────────────

export function useMockupGenerator() {
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

  // Tab & positioning
  const [activeTab, setActiveTab] = useState("generator");
  const [hasUserInteractedPosition, setHasUserInteractedPosition] = useState(false);

  // ─── Undo/Redo ───────────────────────────────────────────────────────
  const positionHistory = usePositionHistory({ enabled: true });

  // Apply undo/redo state to the active area
  useEffect(() => {
    positionHistory.setOnApply((state) => {
      if (!activeAreaId) return;
      setPersonalizationAreas(prev =>
        prev.map(area => area.id === activeAreaId ? { ...area, ...state } : area)
      );
      toast.info(
        positionHistory.canRedo ? "↩️ Desfazer" : "↪️ Refazer",
        { duration: 1000 }
      );
    });
  }, [activeAreaId, positionHistory]);

  // ─── Derived state ──────────────────────────────────────────────────

  const activeArea = personalizationAreas.find(a => a.id === activeAreaId) || personalizationAreas[0];
  const selectedProduct = productSelection?.product ?? null;
  const filteredTechniques = useFilteredTechniques(techniques, selectedProduct);
  const { data: customizationOptions } = useProductCustomizationOptionsForMockup(selectedProduct?.id);
  const hasLogo = personalizationAreas.some(a => !!a.logoPreview);

  // Derive unique clients from history for filter
  const historyClients = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    mockupHistory.forEach(m => {
      if (m.client_id && m.bitrix_clients?.name) {
        map.set(m.client_id, { id: m.client_id, name: m.bitrix_clients.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [mockupHistory]);

  // Product locations from DB for MultiAreaManager
  const productLocations = useMemo(() => {
    if (!customizationOptions?.locations?.length) return null;
    return customizationOptions.locations.map(loc => ({
      code: loc.location_code,
      name: loc.location_name,
      order: loc.location_order,
    }));
  }, [customizationOptions]);

  // When product changes and we have real locations, auto-populate areas
  useEffect(() => {
    if (!productLocations || isRestoringDraft.current) return;
    const newAreas: PersonalizationArea[] = productLocations
      .sort((a, b) => a.order - b.order)
      .map(loc => ({
        id: crypto.randomUUID(),
        name: loc.name,
        positionX: 50,
        positionY: 50,
        logoWidth: 5,
        logoHeight: 3,
        logoPreview: null,
      }));
    if (newAreas.length > 0) {
      setPersonalizationAreas(newAreas);
      setActiveAreaId(newAreas[0].id);
    }
  }, [productLocations]);

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
      if (!isStillValid) setSelectedTechnique(null);
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

  // Refetch history when user changes
  useEffect(() => {
    if (user?.id) fetchHistory();
  }, [user?.id]);

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
      const techniquesData = records.map((r: any) => ({
        id: r.id,
        name: r.nome,
        code: r.codigo_curto || r.codigo_tabela || null,
      }));
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
      if (user?.id) query = query.eq("seller_id", user.id);
      const { data, error } = await query;
      if (error) throw error;
      setMockupHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ─── Handlers ───────────────────────────────────────────────────────

  const updateActiveArea = useCallback((updates: Partial<PersonalizationArea>) => {
    if (!activeAreaId) return;
    setPersonalizationAreas(prev =>
      prev.map(area => area.id === activeAreaId ? { ...area, ...updates } : area)
    );
    if ('positionX' in updates || 'positionY' in updates || 'logoWidth' in updates || 'logoHeight' in updates) {
      setHasUserInteractedPosition(true);
      // Push to undo/redo history
      const current = personalizationAreas.find(a => a.id === activeAreaId);
      if (current) {
        positionHistory.pushState({
          positionX: updates.positionX ?? current.positionX,
          positionY: updates.positionY ?? current.positionY,
          logoWidth: updates.logoWidth ?? current.logoWidth,
          logoHeight: updates.logoHeight ?? current.logoHeight,
        });
      }
    }
  }, [activeAreaId, personalizationAreas, positionHistory]);

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
      let logoUrl = area.logoPreview;
      if (area.logoPreview.startsWith("data:")) {
        const uploadedUrl = await uploadLogoToStorage(
          user.id,
          area.logoPreview,
          `${selectedProduct.sku || "product"}-${selectedTechnique.code || "tech"}`
        );
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          logoUrl = "";
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
    positionHistory.clear();
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
    setHasUserInteractedPosition(true);
    positionHistory.clear();
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

  return {
    // Auth
    user,

    // Data
    techniques,
    isLoadingData,

    // Selections
    productSelection,
    setProductSelection,
    selectedProduct,
    selectedTechnique,
    setSelectedTechnique,
    selectedClient,
    setSelectedClient,

    // Areas
    personalizationAreas,
    setPersonalizationAreas,
    activeAreaId,
    setActiveAreaId,
    activeArea,
    updateActiveArea,
    handleAreaLogoUpload,
    productLocations,

    // Generation
    generatedMockup,
    setGeneratedMockup,
    isLoading,
    generationError,
    setGenerationError,
    generateMockup,
    downloadMockup,

    // History
    mockupHistory,
    isLoadingHistory,
    deleteDialogOpen,
    setDeleteDialogOpen,
    mockupToDelete,
    setMockupToDelete,
    deleteMockup,
    loadFromHistory,
    handleShareMockup,
    historyClients,

    // Draft
    isDraftSaving,
    lastSaved,
    draftError,
    showDraftRestoredNotice,

    // Navigation
    activeTab,
    setActiveTab,
    wizardStep,
    hasLogo,
    hasUserInteractedPosition,

    // Undo/Redo
    positionHistory,

    // Misc
    filteredTechniques,
    getProductImage,
    resetForm,
  };
}
