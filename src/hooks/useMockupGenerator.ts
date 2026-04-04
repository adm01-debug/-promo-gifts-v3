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
import { invokeWithRetry, extractFunctionErrorMessage } from "@/lib/external-db/invoke";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { needsConversion, ensureSupportedFormat } from "@/lib/image-converter";
import { useAuth } from "@/contexts/AuthContext";
import { useMockupDraft, MockupDraftData } from "@/hooks/useMockupDraft";
import { useFilteredTechniques, useProductCustomizationOptionsForMockup, type TechniqueWithLimits } from "@/hooks/useMockupTechniques";
import { usePositionHistory } from "@/hooks/usePositionHistory";
import { uploadLogoToStorage, downloadImageAsPdfFromUrl } from "@/lib/mockup-storage";
import { useProductsContext } from "@/contexts/ProductsContext";
import { getMockupWizardStep } from "@/components/mockup/mockupWizardStep";
import { useLogoColorAnalysis } from "@/hooks/useLogoColorAnalysis";
import { showMockupSuccessToast } from "@/components/mockup/MockupSuccessToast";
import { classifyTechnique, techniqueNeedsColorConfig, type TechniqueColorConfig } from "@/components/mockup/techniqueColorUtils";
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
  layout_url?: string | null;
  logo_url: string;
  position_x: number | null;
  position_y: number | null;
  logo_width_cm: number | null;
  logo_height_cm: number | null;
  location_name?: string | null;
  colors_count?: number | null;
  annotations?: Array<Record<string, unknown>> | null;
  client_name?: string | null;
  created_at: string;
  client_id: string | null;
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
  logoRotation: 0,
  logoScale: 100,
  logoPreview: null,
});

// ─── Hook ────────────────────────────────────────────────────────────

export function useMockupGenerator() {
  const { user } = useAuth();
  const { saveDraft, loadDraft, clearDraft, isSaving: isDraftSaving, lastSaved, error: draftError } = useMockupDraft();
  const { getProductById } = useProductsContext();

  // Data state
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Selection state
  const [productSelection, setProductSelection] = useState<MockupProductSelection | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | TechniqueWithLimits | null>(null);
  const [selectedClient, setSelectedClient] = useState<MockupClient | null>(null);

  // Multi-area
  const [personalizationAreas, setPersonalizationAreas] = useState<PersonalizationArea[]>([createDefaultArea()]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  // Generation
  const [generatedMockup, setGeneratedMockup] = useState<string | null>(null);
  const [generatedBatchMockups, setGeneratedBatchMockups] = useState<{areaName: string; url: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mockupAnnotations, setMockupAnnotations] = useState<{id: string; x: number; y: number; text: string}[]>([]);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);

  // Technique color configuration
  const [techniqueColorConfig, setTechniqueColorConfig] = useState<TechniqueColorConfig | null>(null);

  // History
  const [mockupHistory, setMockupHistory] = useState<GeneratedMockup[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mockupToDelete, setMockupToDelete] = useState<string | null>(null);
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);
  const [lastSavedMockupUrl, setLastSavedMockupUrl] = useState<string | null>(null);
  const [lastSavedLayoutMode, setLastSavedLayoutMode] = useState<'ai' | 'static'>('ai');

  // Draft
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [showDraftRestoredNotice, setShowDraftRestoredNotice] = useState(false);
  const isRestoringDraft = useRef(false);

  // Tab & positioning
  const [activeTab, setActiveTab] = useState("generator");
  const [hasUserInteractedPosition, setHasUserInteractedPosition] = useState(false);

  // Logo color analysis
  const logoColorAnalysis = useLogoColorAnalysis();

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

  // Derive unique clients from history for filter (denormalized client_name)
  const historyClients = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    mockupHistory.forEach(m => {
      const clientName = m.client_name;
      const clientKey = m.client_id || clientName;
      if (clientKey && clientName) {
        map.set(clientKey, { id: m.client_id || clientName, name: clientName });
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
        logoScale: 100,
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

  // When technique changes, clamp logo dimensions to the new maxWidth/maxHeight.
  useEffect(() => {
    if (!selectedTechnique) return;
    const mw = 'maxWidth' in selectedTechnique ? (selectedTechnique as TechniqueWithLimits).maxWidth : null;
    const mh = 'maxHeight' in selectedTechnique ? (selectedTechnique as TechniqueWithLimits).maxHeight : null;
    logger.log('[MockupGenerator] Technique changed:', selectedTechnique.name, '| maxWidth:', mw, '| maxHeight:', mh);

    if (!mw || !mh || mw <= 0 || mh <= 0) return;

    setPersonalizationAreas(prev =>
      prev.map(area => {
        const clampedW = Math.min(area.logoWidth, mw);
        const clampedH = Math.min(area.logoHeight, mh);
        if (clampedW !== area.logoWidth || clampedH !== area.logoHeight) {
          return { ...area, logoWidth: clampedW, logoHeight: clampedH };
        }
        return area;
      })
    );
  }, [selectedTechnique]);

  // Draft restoration
  useEffect(() => {
    const restoreDraft = async () => {
      if (isLoadingData || hasDraftRestored || isRestoringDraft.current) return;
      isRestoringDraft.current = true;
      try {
        const draft = await loadDraft();
        if (draft && (draft.productId || draft.techniqueId || draft.personalizationAreas.some(a => a.logoPreview))) {
          if (draft.productId) {
            const product = getProductById(draft.productId);
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
  }, [isLoadingData, techniques, loadDraft, hasDraftRestored, getProductById]);

  // ─── URL param pre-selection (from Kit Builder) ─────────────────────
  const urlParamsApplied = useRef(false);
  useEffect(() => {
    if (urlParamsApplied.current || isLoadingData || !hasDraftRestored) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product_id');
    const techniqueName = params.get('technique');
    if (!productId) return;
    urlParamsApplied.current = true;
    
    const product = getProductById(productId);
    if (product) {
      setProductSelection({
        product,
        variant: null,
        imageUrl: product.images?.[0] || '/placeholder.svg',
      });
    }
    if (techniqueName && techniques.length > 0) {
      const technique = techniques.find(t => 
        t.name.toLowerCase() === techniqueName.toLowerCase()
      );
      if (technique) setSelectedTechnique(technique);
    }
    // Clean URL params without reload
    window.history.replaceState({}, '', window.location.pathname);
  }, [isLoadingData, hasDraftRestored, techniques, getProductById]);

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
      const { data: techniquesRes, error: techniquesErr } = await invokeWithRetry({
        table: "tabela_preco_gravacao_oficial",
        operation: "select",
        filters: { ativo: true },
        limit: 100,
        countMode: "none",
      });

      if (techniquesErr) {
        const msg = await extractFunctionErrorMessage(techniquesErr);
        console.error("Error fetching techniques:", msg);
        toast.error("Erro ao carregar técnicas. Tente recarregar a página.");
        return;
      }

      const records = techniquesRes?.data?.records || techniquesRes?.records || [];
      const techniquesData = records.map((r: Record<string, unknown>) => ({
        id: r.id,
        name: r.nome,
        code: r.codigo_curto || r.codigo_tabela || null,
      }));
      techniquesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setTechniques(techniquesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados. Tente novamente.");
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      let query = supabase
        .from("generated_mockups")
        .select(`id, product_id, product_name, product_sku, technique_id, technique_name, mockup_url, layout_url, logo_url, position_x, position_y, logo_width_cm, logo_height_cm, location_name, colors_count, created_at, client_id, client_name, annotations`)
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
  }, [user?.id]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const updateActiveArea = useCallback((updates: Partial<PersonalizationArea>) => {
    if (!activeAreaId) return;
    setPersonalizationAreas(prev =>
      prev.map(area => area.id === activeAreaId ? { ...area, ...updates } : area)
    );
    if ('positionX' in updates || 'positionY' in updates || 'logoWidth' in updates || 'logoHeight' in updates || 'logoRotation' in updates || 'logoScale' in updates) {
      setHasUserInteractedPosition(true);
      // Push to undo/redo history
      const current = personalizationAreas.find(a => a.id === activeAreaId);
      if (current) {
        positionHistory.pushState({
          positionX: updates.positionX ?? current.positionX,
          positionY: updates.positionY ?? current.positionY,
          logoWidth: updates.logoWidth ?? current.logoWidth,
          logoHeight: updates.logoHeight ?? current.logoHeight,
          logoRotation: updates.logoRotation ?? current.logoRotation ?? 0,
          logoScale: updates.logoScale ?? current.logoScale ?? 100,
        });
      }
    }
  }, [activeAreaId, personalizationAreas, positionHistory]);

  const handleAreaLogoUpload = useCallback(async (areaId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    // Auto-convert SVG, WebP, BMP etc. to PNG
    let processedFile = file;
    if (needsConversion(file)) {
      try {
        toast.info(`Convertendo ${file.name} para PNG...`);
        processedFile = await ensureSupportedFormat(file);
        toast.success("Imagem convertida para PNG com sucesso!");
      } catch (err) {
        console.error("Conversion error:", err);
        toast.error("Erro ao converter imagem. Tente usar PNG ou JPG.");
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const logoData = e.target?.result as string;
      setPersonalizationAreas(prev =>
        prev.map(area => area.id === areaId ? { ...area, logoPreview: logoData } : area)
      );
      // Auto-analyze colors when logo is uploaded
      logoColorAnalysis.analyzeImage(logoData);
    };
    reader.readAsDataURL(processedFile);
  }, [logoColorAnalysis]);

  const getProductImage = (): string | null => {
    if (productSelection?.imageUrl) {
      // Remove /thumbnail suffix for preview (full-size image renders better)
      // The thumbnail variant can fail on some CDN entries
      const url = productSelection.imageUrl;
      return url.endsWith('/thumbnail') ? url.replace('/thumbnail', '') : url;
    }
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

  const saveMockupToHistory = async (mockupUrl: string, area: PersonalizationArea, extra?: { layoutUrl?: string; locationName?: string; colorsCount?: number }): Promise<string | null> => {
    if (!user || !selectedProduct || !selectedTechnique || !area.logoPreview) return null;

    try {
      let logoUrl = area.logoPreview;
      if (area.logoPreview.startsWith("data:")) {
        const uploadedUrl = await uploadLogoToStorage(
          user.id,
          area.logoPreview,
          `${selectedProduct.sku || "product"}-${selectedTechnique.code || "tech"}`
        );
        logoUrl = uploadedUrl || "";
      }

      // Validate FK targets (external data may not exist in local tables)
      let safeProductId: string | null = null;
      if (selectedProduct.id) {
        const { data: productRow } = await supabase
          .from("products")
          .select("id")
          .eq("id", selectedProduct.id)
          .maybeSingle();
        if (productRow) safeProductId = selectedProduct.id;
      }

      let safeTechniqueId: string | null = null;
      if (selectedTechnique.id) {
        const { data: techRow } = await supabase
          .from("personalization_techniques")
          .select("id")
          .eq("id", selectedTechnique.id)
          .maybeSingle();
        if (techRow) safeTechniqueId = selectedTechnique.id;
      }

      // Client: skip FK validation — save client_id as-is (may be external CRM ID)
      // and always denormalize client_name for filtering/display
      const clientId = selectedClient?.id || null;
      const clientName = selectedClient?.nome_fantasia || selectedClient?.razao_social || selectedClient?.name || null;

      const { data: insertedRow, error } = await supabase.from("generated_mockups").insert({
        seller_id: user.id,
        client_id: clientId,
        client_name: clientName,
        product_id: safeProductId,
        product_name: selectedProduct.name,
        product_sku: selectedProduct.sku,
        technique_id: safeTechniqueId,
        technique_name: selectedTechnique.name,
        logo_url: logoUrl,
        mockup_url: mockupUrl,
        layout_url: extra?.layoutUrl || null,
        position_x: area.positionX,
        position_y: area.positionY,
        logo_width_cm: area.logoWidth,
        logo_height_cm: area.logoHeight,
        location_name: extra?.locationName || area.name || null,
        colors_count: extra?.colorsCount || null,
        annotations: mockupAnnotations.length > 0 ? mockupAnnotations : null,
      } as Record<string, unknown>).select("id").single();

      if (error) throw error;
      fetchHistory();
      return insertedRow?.id || null;
    } catch (error) {
      console.error("Error saving to history:", error);
      return null;
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
    setGeneratedBatchMockups([]);
    setGenerationError(null);
    setMockupAnnotations([]);

    // Capture the before image (product image URL) for comparison
    setBeforeImage(productImage);

    try {
      const techniquePrompt = getTechniquePrompt(selectedTechnique);

      // If only 1 area with logo, single generation (backward compatible)
      if (areasWithLogos.length === 1) {
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
            logoRotation: primaryArea.logoRotation || 0,
            logoScale: primaryArea.logoScale ?? 100,
            productName: selectedProduct!.name,
            areas: areasWithLogos.map(a => ({
              name: a.name, positionX: a.positionX, positionY: a.positionY, logoWidth: a.logoWidth, logoHeight: a.logoHeight, logoRotation: a.logoRotation || 0, logoScale: a.logoScale ?? 100,
            })),
          },
        });

        if (response.error) {
          // Check for structured error from edge function
          const errData = response.data || response.error;
          if (errData?.errorCode === "SVG_NOT_SUPPORTED") {
            throw new Error(errData.error || "Logos SVG não são suportados. Use PNG ou JPG.");
          }
          throw response.error;
        }
        if (response.data?.mockupUrl) {
          setGeneratedMockup(response.data.mockupUrl);
          const recordId = await saveMockupToHistory(response.data.mockupUrl, primaryArea);
          if (recordId) {
            setLastSavedMockupUrl(response.data.mockupUrl);
            setLastSavedLayoutMode('ai');
            setLastSavedRecordId(recordId);
          }
          showMockupSuccessToast({
            mockupUrl: response.data.mockupUrl,
            productName: selectedProduct!.name,
            techniqueName: selectedTechnique.name,
            onDownload: () => downloadMockup(response.data.mockupUrl),
          });
        } else {
          throw new Error("Nenhuma imagem retornada");
        }
      } else {
        // BATCH: generate for each area sequentially
        const results: {areaName: string; url: string}[] = [];
        for (const area of areasWithLogos) {
          const isLogoUrl = area.logoPreview?.startsWith("http");
          toast.info(`Gerando ${area.name}...`, { duration: 2000 });

          const response = await supabase.functions.invoke("generate-mockup", {
            body: {
              productImageUrl: productImage,
              logoBase64: isLogoUrl ? undefined : area.logoPreview,
              logoUrl: isLogoUrl ? area.logoPreview : undefined,
              techniqueName: selectedTechnique.name,
              techniquePrompt,
              positionX: area.positionX,
              positionY: area.positionY,
              logoWidthCm: area.logoWidth,
              logoHeightCm: area.logoHeight,
              logoRotation: area.logoRotation || 0,
              logoScale: area.logoScale ?? 100,
              productName: selectedProduct!.name,
              areas: [{ name: area.name, positionX: area.positionX, positionY: area.positionY, logoWidth: area.logoWidth, logoHeight: area.logoHeight, logoRotation: area.logoRotation || 0, logoScale: area.logoScale ?? 100 }],
            },
          });

          if (response.error) {
            console.error(`Error generating ${area.name}:`, response.error);
            continue;
          }
          if (response.data?.mockupUrl) {
            results.push({ areaName: area.name, url: response.data.mockupUrl });
            const recordId = await saveMockupToHistory(response.data.mockupUrl, area);
            // Only trigger layout capture for the last batch item
            if (recordId && area === areasWithLogos[areasWithLogos.length - 1]) {
              setLastSavedMockupUrl(response.data.mockupUrl);
              setLastSavedLayoutMode('ai');
              setLastSavedRecordId(recordId);
            }
          }
        }

        if (results.length > 0) {
          setGeneratedMockup(results[0].url);
          setGeneratedBatchMockups(results);
          toast.success(`${results.length} mockups gerados com sucesso!`);
        } else {
          throw new Error("Nenhum mockup gerado no batch");
        }
      }
    } catch (error: unknown) {
      console.error("Error generating mockup:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar mockup";
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadMockup = async (url?: string) => {
    const mockupUrl = url || generatedMockup;
    if (!mockupUrl) return;
    const safeSku = (selectedProduct?.sku || "produto").replace(/[^a-zA-Z0-9-_]/g, "-");
    const safeTechnique = (selectedTechnique?.name || "tecnica").replace(/[^a-zA-Z0-9-_]/g, "-");
    const fileName = `mockup-${safeSku}-${safeTechnique}.pdf`;
    await downloadImageAsPdfFromUrl(mockupUrl, fileName);
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
    setGeneratedBatchMockups([]);
    setGenerationError(null);
    setMockupAnnotations([]);
    setBeforeImage(null);
    setHasUserInteractedPosition(false);
    setTechniqueColorConfig(null);
    setLastSavedRecordId(null);
    setLastSavedMockupUrl(null);
    setLastSavedLayoutMode('ai');
    positionHistory.clear();
    clearDraft();
    logoColorAnalysis.clearAnalysis();
  };

  const handleShareMockup = (mockup: GeneratedMockup) => {
    const text = `Confira o mockup: ${mockup.product_name} com ${mockup.technique_name}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + "\n" + mockup.mockup_url)}`;
    window.open(whatsappUrl, "_blank");
  };

  const loadFromHistory = (mockup: GeneratedMockup) => {
    const product = mockup.product_id ? getProductById(mockup.product_id) : null;
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
    setSelectedClient(mockup.client_id ? { id: mockup.client_id, name: mockup.client_name || "Cliente" } : null);

    const restoredArea: PersonalizationArea = {
      id: crypto.randomUUID(),
      name: "Frente",
      positionX: mockup.position_x ?? 50,
      positionY: mockup.position_y ?? 50,
      logoWidth: mockup.logo_width_cm ?? 5,
      logoHeight: mockup.logo_height_cm ?? 3,
      logoRotation: 0,
      logoScale: 100,
      logoPreview: mockup.logo_url,
    };
    setPersonalizationAreas([restoredArea]);
    setActiveAreaId(restoredArea.id);
    setGeneratedMockup(null);
    setHasUserInteractedPosition(true);
    positionHistory.clear();
    setActiveTab("generator");
    // Trigger color analysis if logo is available
    if (mockup.logo_url) {
      logoColorAnalysis.analyzeImage(mockup.logo_url);
    }
    toast.success("Configurações carregadas!");
  };

  // Wizard step
  const wizardStep = getMockupWizardStep({
    hasClient: !!selectedClient,
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
    generatedBatchMockups,
    isLoading,
    generationError,
    setGenerationError,
    generateMockup,
    downloadMockup,
    mockupAnnotations,
    setMockupAnnotations,
    beforeImage,

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
    lastSavedRecordId,
    setLastSavedRecordId,
    lastSavedMockupUrl,
    setLastSavedMockupUrl,
    lastSavedLayoutMode,
    setLastSavedLayoutMode,

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

    // Logo color analysis
    logoColorAnalysis,

    // Technique color config
    techniqueColorConfig,
    setTechniqueColorConfig,

    // Misc
    filteredTechniques,
    getProductImage,
    resetForm,
    saveMockupToHistory,
    fetchHistory,
  };
}
