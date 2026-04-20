/**
 * useMagicUpState — Extracted logic from MagicUp page.
 * Manages product loading, client search, generation, and history.
 * Generation logic delegated to useMagicUpGeneration.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useAriaLive } from "@/components/a11y";
import { useProductCustomizationOptionsForMockup } from "@/hooks/useMockupTechniques";
import { searchCrm, selectCrmById } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import type { PrintAreaWithTechniques } from "@/types/gravacao";
import type { ScenePrompt } from "@/components/magic-up/PromptBank";
import type { GenerationHistoryItem } from "@/components/magic-up/AdImageResult";
import { useMagicUpGeneration } from "./useMagicUpGeneration";
import { DEFAULT_BRIEF, DEFAULT_CAMPAIGN, DEFAULT_CREATIVE_CONTROLS, buildCopyPack, buildMagicScore, campaignFromBrief, type MagicUpBrief, type MagicUpCampaign, type MagicUpCampaignStatus, type MagicUpCreativeControls } from "@/pages/magic-up/magicUpStrategy";

// ─── Types ───────────────────────────────────────────────────────────

export interface MagicUpProduct {
  id: string;
  name: string;
  sku: string;
  images: Array<{ url_cdn?: string; url_original?: string; is_primary?: boolean; is_og_image?: boolean; image_type?: string; supplier_code?: string }> | null;
  primary_image_url?: string | null;
  og_image_url?: string | null;
}

export interface Technique {
  id: string;
  name: string;
  code: string;
}

export interface ProductColor {
  hex: string;
  name: string;
  code: string;
  stock?: number;
}

export interface ProductImage {
  url: string;
  supplierCode: string | null;
  isPrimary: boolean;
  isOgImage: boolean;
}

export interface SelectedClient {
  id: string;
  name: string;
  logo_url?: string | null;
  ramo_atividade?: string | null;
  cor_primaria_hex?: string | null;
  cor_primaria_nome?: string | null;
}

export interface VariationItem {
  id: string | null;
  imageUrl: string;
  isFavorite: boolean;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useMagicUpState() {
  const { user } = useAuth();
  const { announceStatus, announceAlert } = useAriaLive();

  // Product
  const [products, setProducts] = useState<MagicUpProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<MagicUpProduct | null>(null);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [loadingColors, setLoadingColors] = useState(false);

  // Technique & Location
  const { data: customizationData, isLoading: loadingCustomization } = useProductCustomizationOptionsForMockup(selectedProduct?.id);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Scene
  const [selectedScene, setSelectedScene] = useState<ScenePrompt | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [sceneTab, setSceneTab] = useState<"ai" | "bank">("ai");
  const [brief, setBrief] = useState<MagicUpBrief>(DEFAULT_BRIEF);
  const [activeCampaign, setActiveCampaign] = useState<MagicUpCampaign | null>(null);
  const [creativeControls, setCreativeControls] = useState<MagicUpCreativeControls>(DEFAULT_CREATIVE_CONTROLS);
  const [brandNotes, setBrandNotes] = useState("");

  // Client (CRM externo)
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  // ─── Client search debounce ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedClientSearch(clientSearch), 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const { data: clientResults = [], isLoading: loadingClients } = useQuery({
    queryKey: ["magic-up-clients", debouncedClientSearch],
    queryFn: async () => {
      if (debouncedClientSearch.length < 3) return [];
      const [byRazao, byNomeFantasia] = await Promise.all([
        searchCrm<CrmCompany>("companies", "razao_social", debouncedClientSearch, { select: "id, razao_social, nome_fantasia, ramo_atividade, logo_url", limit: 20 }),
        searchCrm<CrmCompany>("companies", "nome_fantasia", debouncedClientSearch, { select: "id, razao_social, nome_fantasia, ramo_atividade, logo_url", limit: 20 }),
      ]);
      const map = new Map<string, CrmCompany>();
      [...byRazao, ...byNomeFantasia].forEach(c => map.set(c.id, c));
      return Array.from(map.values()).slice(0, 20);
    },
    enabled: debouncedClientSearch.length >= 3,
  });

  // ─── Load History ──────────────────────────────────────────────
  const { data: history = [] } = useQuery<GenerationHistoryItem[]>({
    queryKey: ["magic-up-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("magic_up_generations").select("id, generated_image_url, product_name, scene_title, scene_category, is_favorite, created_at, client_name").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      return (data || []) as GenerationHistoryItem[];
    },
    enabled: !!user?.id,
  });

  // ─── Load Products ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try {
        const { fetchPromobrindProducts } = await import("@/lib/external-db");
        const data = await fetchPromobrindProducts();
        setProducts(data.map(p => ({ id: p.id, name: p.name, sku: p.sku, images: p.images || [], primary_image_url: p.primary_image_url || p.image_url || null, og_image_url: p.og_image_url || null })));
      } catch { toast.error("Erro ao carregar produtos"); }
      finally { setLoadingProducts(false); }
    })();
  }, []);

  // ─── Load Colors & Images on Product Change ──────────────────────
  useEffect(() => {
    if (!selectedProduct) { setColors([]); setProductImages([]); setSelectedColor(null); setSelectedLocationId(null); setSelectedTechnique(null); return; }
    (async () => {
      setLoadingColors(true);
      try {
        const { invokeExternalDb } = await import("@/lib/external-db");
        const [variantsResult, imagesResult] = await Promise.all([
          invokeExternalDb<Record<string, unknown>>({ table: "product_variants", operation: "select", filters: { product_id: selectedProduct.id }, orderBy: { column: "color_name", ascending: true }, limit: 100 }),
          invokeExternalDb<Record<string, unknown>>({ table: "product_images", operation: "select", filters: { product_id: selectedProduct.id }, orderBy: { column: "display_order", ascending: true }, limit: 100 }),
        ]);
        const images: ProductImage[] = (imagesResult.records || []).filter((img: Record<string, unknown>) => img.image_type !== "box").map((img: Record<string, unknown>) => ({ url: img.url_cdn || img.url_original || "", supplierCode: img.supplier_code || null, isPrimary: img.is_primary, isOgImage: img.is_og_image || false })).filter((img: ProductImage) => img.url);
        setProductImages(images);
        const uniqueColors = new Map<string, ProductColor>();
        (variantsResult.records || []).forEach((v: Record<string, unknown>) => { if (!v.color_name || uniqueColors.has(v.color_name)) return; uniqueColors.set(v.color_name, { hex: v.color_hex || "#CCCCCC", name: v.color_name, code: v.color_code || "", stock: v.stock_quantity ?? 0 }); });
        setColors(Array.from(uniqueColors.values()));
      } catch { setColors([]); setProductImages([]); }
      finally { setLoadingColors(false); }
    })();
  }, [selectedProduct?.id]);

  // ─── Print Areas from customization data ───────────────────────
  const printAreas = useMemo((): PrintAreaWithTechniques[] => {
    if (!customizationData?.locations) return [];
    return customizationData.locations.map((loc, idx) => ({
      area_id: loc.location_code, area_code: loc.location_code, area_name: loc.location_name,
      component_name: null, location_name: loc.location_name,
      max_width: Math.max(...loc.options.map(o => o.efetiva_largura_max || 0), 0),
      max_height: Math.max(...loc.options.map(o => o.efetiva_altura_max || 0), 0),
      unit: "cm", shape: loc.options[0]?.shape || "rectangle",
      is_curved: loc.options.some(o => o.is_curved), is_primary: idx === 0, display_order: loc.location_order,
      techniques: loc.options.map(o => ({ id: o.technique_id, nome: o.tecnica_nome, codigo: o.codigo_tabela })),
    }));
  }, [customizationData]);

  const loadingPrintAreas = loadingCustomization;

  // ─── Derived: Techniques from print areas ───────────────────────
  const availableTechniques = useMemo((): Technique[] => {
    if (!printAreas?.length) return [];
    const techMap = new Map<string, Technique>();
    const source = selectedLocationId ? printAreas.filter(a => a.area_id === selectedLocationId) : printAreas;
    for (const area of source) { for (const t of area.techniques || []) { if (!techMap.has(t.id)) techMap.set(t.id, { id: t.id, name: t.nome, code: t.codigo }); } }
    return [...techMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [printAreas, selectedLocationId]);

  useEffect(() => {
    if (selectedTechnique && availableTechniques.length > 0 && !availableTechniques.some(t => t.id === selectedTechnique.id)) setSelectedTechnique(null);
  }, [availableTechniques, selectedTechnique]);

  // ─── Current preview image ─────────────────────────────────────
  const currentImage = useMemo(() => {
    if (productImages.length === 0) return selectedProduct?.primary_image_url || null;
    if (selectedColor?.code) { const match = productImages.find(img => img.supplierCode === selectedColor.code); if (match) return match.url; }
    return productImages.find(i => i.isOgImage)?.url || productImages.find(i => i.isPrimary)?.url || productImages[0]?.url || null;
  }, [productImages, selectedColor, selectedProduct]);

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId || !printAreas) return null;
    const area = printAreas.find(a => a.area_id === selectedLocationId);
    return area ? [area.component_name, area.location_name].filter(Boolean).join(" — ") : null;
  }, [selectedLocationId, printAreas]);

  // ─── Effective prompt ─────────────────────────────────────────
  const effectivePrompt = useMemo(() => {
    const base = selectedScene?.prompt || "";
    const extra = additionalDetails.trim();
    if (base && extra) return `${base}\n\nADDITIONAL DETAILS: ${extra}`;
    return extra || base;
  }, [selectedScene, additionalDetails]);

  const fullPromptPreview = useMemo(() => {
    if (!selectedProduct || !effectivePrompt) return "";
    return `BRIEFING: objetivo=${brief.objective}; canal=${brief.channel}; público=${brief.audience}; tom=${brief.tone}; CTA=${brief.cta}; ocasião=${brief.occasion}
CONTROLE CRIATIVO: modo=${creativeControls.creativeMode}; composição=${creativeControls.composition}; formato=${creativeControls.aspectRatio}; qualidade=${creativeControls.qualityMode}; evitar=${creativeControls.negativePrompt.join(", ")}
${brandNotes ? `DIRETRIZES DA MARCA: ${brandNotes}` : ""}
PRODUTO: ${selectedProduct.name}${selectedColor ? ` (${selectedColor.name})` : ""}
TÉCNICA: ${selectedTechnique?.name || "Não especificada"} @ ${selectedLocationName || "Não especificado"}
${selectedClient ? `CLIENTE: ${selectedClient.name}${selectedClient.ramo_atividade ? ` (${selectedClient.ramo_atividade})` : ""}` : ""}
${selectedClient?.cor_primaria_hex ? `COR DA MARCA: ${selectedClient.cor_primaria_nome || selectedClient.cor_primaria_hex}` : ""}
CENÁRIO: ${effectivePrompt}`;
  }, [brief, creativeControls, brandNotes, selectedProduct, selectedColor, selectedTechnique, selectedLocationName, effectivePrompt, selectedClient]);

  const qualityScore = useMemo(() => buildMagicScore({
    hasProduct: !!selectedProduct,
    hasLogo: !!logoPreview,
    hasClient: !!selectedClient,
    hasTechnique: !!selectedTechnique,
    hasBrief: !!brief.objective && !!brief.channel,
    channel: brief.channel,
  }), [selectedProduct, logoPreview, selectedClient, selectedTechnique, brief]);

  const copyPack = useMemo(() => buildCopyPack({
    productName: selectedProduct?.name,
    clientName: selectedClient?.name,
    cta: brief.cta,
    tone: brief.tone,
    channel: brief.channel,
  }), [selectedProduct?.name, selectedClient?.name, brief]);

  // ─── Generation (delegated) ────────────────────────────────────
  const generation = useMagicUpGeneration({
    selectedProduct, currentImage, logoPreview, effectivePrompt,
    selectedColor, selectedTechnique, selectedLocationName, selectedScene, selectedClient, userId: user?.id,
    brief, creativeControls, qualityScore, copyPack, fullPromptPreview,
  });

  // ─── Handlers ──────────────────────────────────────────────────
  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 10MB)"); return; }
    setLogoUploading(true);
    try { const reader = new FileReader(); reader.onload = (ev) => { setLogoPreview(ev.target?.result as string); setLogoUploading(false); }; reader.readAsDataURL(file); }
    catch { setLogoUploading(false); toast.error("Erro ao carregar logo"); }
  }, []);

  const handleSelectClient = useCallback((company: CrmCompany) => {
    const client: SelectedClient = { id: company.id, name: getCompanyDisplayName(company), logo_url: company.logo_url || null, ramo_atividade: company.ramo_atividade || null, cor_primaria_hex: null, cor_primaria_nome: null };
    setSelectedClient(client); setClientSearch(""); setShowClientResults(false);
    if (company.logo_url && !logoPreview) setLogoPreview(company.logo_url);
  }, [logoPreview]);

  const handleSelectProduct = useCallback((p: MagicUpProduct | null) => {
    setSelectedProduct(p); setSelectedColor(null); generation.setVariations([]); generation.setActiveVariation(0);
  }, [generation]);

  const handleClearClient = useCallback(() => { setSelectedClient(null); setLogoPreview(null); }, []);

  const step = !selectedProduct ? 1 : !logoPreview ? 2 : !effectivePrompt ? 3 : 4;

  return {
    products, loadingProducts, selectedProduct, colors, productImages,
    selectedColor, setSelectedColor, loadingColors, handleSelectProduct,
    printAreas, loadingPrintAreas, availableTechniques,
    selectedLocationId, setSelectedLocationId, selectedTechnique, setSelectedTechnique,
    logoPreview, logoUploading, handleLogoUpload,
    selectedScene, setSelectedScene, additionalDetails, setAdditionalDetails,
    showPromptPreview, setShowPromptPreview, sceneTab, setSceneTab,
    brief, setBrief, creativeControls, setCreativeControls, brandNotes, setBrandNotes,
    qualityScore, copyPack,
    effectivePrompt, fullPromptPreview,
    selectedClient, clientSearch, setClientSearch, showClientResults,
    setShowClientResults, clientResults, loadingClients,
    handleSelectClient, handleClearClient,
    ...generation,
    currentImage, selectedLocationName, history, step,
  };
}
