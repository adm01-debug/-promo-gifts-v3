/**
 * MagicUp — Gerador de Imagens Publicitárias com IA
 * 
 * v3: CRM externo, cores da marca, cenários por segmento,
 * prompt complementar, carrossel de variações
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Upload, Loader2, MapPin, Paintbrush,
  ChevronRight, Wand2, Eye, EyeOff, Building2, Clock,
  Search, X, ChevronLeft,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProductSearchCombobox } from "@/components/mockup/ProductSearchCombobox";
import { usePrintAreas } from "@/hooks/usePrintAreas";
import { useProductCustomizationOptionsForMockup } from "@/hooks/useMockupTechniques";
import { PromptBank, type ScenePrompt } from "@/components/magic-up/PromptBank";
import { PromptGenerator } from "@/components/magic-up/PromptGenerator";
import { AdImageResult, type GenerationHistoryItem } from "@/components/magic-up/AdImageResult";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { searchCrm, selectCrmById } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import type { PrintAreaWithTechniques } from "@/types/gravacao";

// ─── Types ───────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  sku: string;
  images: any;
  primary_image_url?: string | null;
  og_image_url?: string | null;
}

interface Technique {
  id: string;
  name: string;
  code: string;
}

interface ProductColor {
  hex: string;
  name: string;
  code: string;
  stock?: number;
}

interface ProductImage {
  url: string;
  supplierCode: string | null;
  isPrimary: boolean;
  isOgImage: boolean;
}

interface SelectedClient {
  id: string;
  name: string;
  logo_url?: string | null;
  ramo_atividade?: string | null;
  cor_primaria_hex?: string | null;
  cor_primaria_nome?: string | null;
}

interface VariationItem {
  id: string | null;
  imageUrl: string;
  isFavorite: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

export default function MagicUp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Product
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [loadingColors, setLoadingColors] = useState(false);

  // Technique & Location — use the SAME RPC as mockup generator (fn_get_product_customization_options)
  const { data: customizationData, isLoading: loadingCustomization } = useProductCustomizationOptionsForMockup(selectedProduct?.id);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);

  // Transform RPC data into PrintAreaWithTechniques-like format for PromptGenerator
  const printAreas = useMemo((): PrintAreaWithTechniques[] => {
    if (!customizationData?.locations) return [];
    return customizationData.locations.map((loc, idx) => ({
      area_id: loc.location_code,
      area_code: loc.location_code,
      area_name: loc.location_name,
      component_name: null,
      location_name: loc.location_name,
      max_width: Math.max(...loc.options.map(o => o.efetiva_largura_max || 0), 0),
      max_height: Math.max(...loc.options.map(o => o.efetiva_altura_max || 0), 0),
      unit: "cm",
      shape: loc.options[0]?.shape || "rectangle",
      is_curved: loc.options.some(o => o.is_curved),
      is_primary: idx === 0,
      display_order: loc.location_order,
      techniques: loc.options.map(o => ({
        id: o.technique_id,
        nome: o.tecnica_nome,
        codigo: o.codigo_tabela,
      })),
    }));
  }, [customizationData]);

  const loadingPrintAreas = loadingCustomization;

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Scene
  const [selectedScene, setSelectedScene] = useState<ScenePrompt | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [sceneTab, setSceneTab] = useState<"ai" | "bank">("ai");

  // Client (CRM externo)
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  // Generation — carrossel de variações
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<VariationItem[]>([]);
  const [activeVariation, setActiveVariation] = useState(0);

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
        searchCrm<CrmCompany>("companies", "razao_social", debouncedClientSearch, {
          select: "id, razao_social, nome_fantasia, ramo_atividade, logo_url",
          limit: 20,
        }),
        searchCrm<CrmCompany>("companies", "nome_fantasia", debouncedClientSearch, {
          select: "id, razao_social, nome_fantasia, ramo_atividade, logo_url",
          limit: 20,
        }),
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
      const { data } = await supabase
        .from("magic_up_generations")
        .select("id, generated_image_url, product_name, scene_title, scene_category, is_favorite, created_at, client_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as GenerationHistoryItem[];
    },
    enabled: !!user?.id,
  });

  // ─── Load Products ──────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const { fetchPromobrindProducts } = await import("@/lib/external-db");
        const data = await fetchPromobrindProducts();
        setProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          images: p.images || [],
          primary_image_url: p.primary_image_url || p.image_url || null,
          og_image_url: p.og_image_url || null,
        })));
      } catch {
        toast.error("Erro ao carregar produtos");
      }
    })();
  }, []);

  // ─── Load Colors & Images on Product Change ──────────────────────

  useEffect(() => {
    if (!selectedProduct) {
      setColors([]);
      setProductImages([]);
      setSelectedColor(null);
      setSelectedLocationId(null);
      setSelectedTechnique(null);
      return;
    }

    (async () => {
      setLoadingColors(true);
      try {
        const { invokeExternalDb } = await import("@/lib/external-db");
        const [variantsResult, imagesResult] = await Promise.all([
          invokeExternalDb<any>({
            table: "product_variants",
            operation: "select",
            filters: { product_id: selectedProduct.id },
            orderBy: { column: "color_name", ascending: true },
            limit: 100,
          }),
          invokeExternalDb<any>({
            table: "product_images",
            operation: "select",
            filters: { product_id: selectedProduct.id },
            orderBy: { column: "display_order", ascending: true },
            limit: 100,
          }),
        ]);

        const images: ProductImage[] = (imagesResult.records || [])
          .filter((img: any) => img.image_type !== "box")
          .map((img: any) => ({
            url: img.url_cdn || img.url_original || "",
            supplierCode: img.supplier_code || null,
            isPrimary: img.is_primary,
            isOgImage: img.is_og_image || false,
          }))
          .filter((img: ProductImage) => img.url);
        setProductImages(images);

        const uniqueColors = new Map<string, ProductColor>();
        (variantsResult.records || []).forEach((v: any) => {
          if (!v.color_name || uniqueColors.has(v.color_name)) return;
          uniqueColors.set(v.color_name, {
            hex: v.color_hex || "#CCCCCC",
            name: v.color_name,
            code: v.color_code || "",
            stock: v.stock_quantity ?? 0,
          });
        });
        setColors(Array.from(uniqueColors.values()));
      } catch {
        setColors([]);
        setProductImages([]);
      } finally {
        setLoadingColors(false);
      }
    })();
  }, [selectedProduct?.id]);

  // ─── Derived: Techniques from print areas ───────────────────────

  const availableTechniques = useMemo((): Technique[] => {
    if (!printAreas?.length) return [];
    const techMap = new Map<string, Technique>();
    const source = selectedLocationId
      ? printAreas.filter(a => a.area_id === selectedLocationId)
      : printAreas;
    for (const area of source) {
      for (const t of area.techniques || []) {
        if (!techMap.has(t.id)) {
          techMap.set(t.id, { id: t.id, name: t.nome, code: t.codigo });
        }
      }
    }
    return [...techMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [printAreas, selectedLocationId]);

  useEffect(() => {
    if (selectedTechnique && availableTechniques.length > 0) {
      if (!availableTechniques.some(t => t.id === selectedTechnique.id)) {
        setSelectedTechnique(null);
      }
    }
  }, [availableTechniques, selectedTechnique]);

  // ─── Current preview image based on selected color ─────────────

  const currentImage = useMemo(() => {
    if (productImages.length === 0) return selectedProduct?.primary_image_url || null;
    if (selectedColor?.code) {
      const match = productImages.find(img => img.supplierCode === selectedColor.code);
      if (match) return match.url;
    }
    return productImages.find(i => i.isOgImage)?.url
      || productImages.find(i => i.isPrimary)?.url
      || productImages[0]?.url || null;
  }, [productImages, selectedColor, selectedProduct]);

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId || !printAreas) return null;
    const area = printAreas.find(a => a.area_id === selectedLocationId);
    return area ? [area.component_name, area.location_name].filter(Boolean).join(" — ") : null;
  }, [selectedLocationId, printAreas]);

  // ─── Effective prompt: ALWAYS scene + additional details combined ──

  const effectivePrompt = useMemo(() => {
    const base = selectedScene?.prompt || "";
    const extra = additionalDetails.trim();
    if (base && extra) return `${base}\n\nADDITIONAL DETAILS: ${extra}`;
    return extra || base;
  }, [selectedScene, additionalDetails]);

  const canGenerate = !!(selectedProduct && currentImage && logoPreview && effectivePrompt);

  // ─── Full prompt preview ──────────────────────────────────────

  const fullPromptPreview = useMemo(() => {
    if (!selectedProduct || !effectivePrompt) return "";
    return `PRODUTO: ${selectedProduct.name}${selectedColor ? ` (${selectedColor.name})` : ""}
TÉCNICA: ${selectedTechnique?.name || "Não especificada"} @ ${selectedLocationName || "Não especificado"}
${selectedClient ? `CLIENTE: ${selectedClient.name}${selectedClient.ramo_atividade ? ` (${selectedClient.ramo_atividade})` : ""}` : ""}
${selectedClient?.cor_primaria_hex ? `COR DA MARCA: ${selectedClient.cor_primaria_nome || selectedClient.cor_primaria_hex}` : ""}
CENÁRIO: ${effectivePrompt}`;
  }, [selectedProduct, selectedColor, selectedTechnique, selectedLocationName, effectivePrompt, selectedClient]);

  // ─── Handlers ──────────────────────────────────────────────────

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 10MB)");
      return;
    }
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogoPreview(ev.target?.result as string);
        setLogoUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setLogoUploading(false);
      toast.error("Erro ao carregar logo");
    }
  }, []);

  const handleSelectClient = (company: CrmCompany) => {
    const client: SelectedClient = {
      id: company.id,
      name: getCompanyDisplayName(company),
      logo_url: company.logo_url || null,
      ramo_atividade: company.ramo_atividade || null,
      cor_primaria_hex: null, // CRM externo pode ter isso em campos custom
      cor_primaria_nome: null,
    };
    setSelectedClient(client);
    setClientSearch("");
    setShowClientResults(false);

    // Auto-load logo do cliente
    if (company.logo_url && !logoPreview) {
      setLogoPreview(company.logo_url);
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setGenerating(true);

    try {
      const isLogoUrl = logoPreview!.startsWith("http");

      const { data, error } = await supabase.functions.invoke("generate-ad-image", {
        body: {
          productImageUrl: currentImage,
          logoBase64: isLogoUrl ? undefined : logoPreview,
          logoUrl: isLogoUrl ? logoPreview : undefined,
          productName: selectedProduct!.name,
          productColor: selectedColor?.name || null,
          techniqueName: selectedTechnique?.name || null,
          locationName: selectedLocationName || null,
          scenePrompt: effectivePrompt,
          sceneCategory: selectedScene?.category || "custom",
          brandColorHex: selectedClient?.cor_primaria_hex || null,
          brandColorName: selectedClient?.cor_primaria_nome || null,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Add to variations carrossel
        let genId: string | null = null;

        // Persist to history
        if (user?.id) {
          const { data: inserted } = await supabase
            .from("magic_up_generations")
            .insert({
              user_id: user.id,
              product_name: selectedProduct!.name,
              product_sku: selectedProduct!.sku,
              product_color: selectedColor?.name || null,
              technique_name: selectedTechnique?.name || null,
              location_name: selectedLocationName || null,
              scene_title: selectedScene?.title || null,
              scene_category: selectedScene?.category || "custom",
              scene_prompt: effectivePrompt,
              custom_prompt: additionalDetails.trim() || null,
              product_image_url: currentImage,
              logo_url: isLogoUrl ? logoPreview : null,
              generated_image_url: data.imageUrl,
              client_id: selectedClient?.id || null,
              client_name: selectedClient?.name || null,
            })
            .select("id")
            .single();
          if (inserted) genId = inserted.id;
          queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
        }

        const newVariation: VariationItem = {
          id: genId,
          imageUrl: data.imageUrl,
          isFavorite: false,
        };
        setVariations(prev => {
          setActiveVariation(prev.length); // point to the new item
          return [...prev, newVariation];
        });
        toast.success("🎉 Imagem publicitária gerada com sucesso!");
      } else {
        throw new Error(data?.error || "Nenhuma imagem retornada");
      }
    } catch (err: any) {
      console.error("Magic Up error:", err);
      toast.error(err.message || "Erro ao gerar imagem");
    } finally {
      setGenerating(false);
    }
  };

  const currentVariation = variations[activeVariation] || null;

  const handleDownload = async (format: "png" | "jpg" = "png") => {
    if (!currentVariation?.imageUrl) return;
    try {
      const resp = await fetch(currentVariation.imageUrl);
      const blob = await resp.blob();

      let finalBlob = blob;
      if (format === "jpg" && blob.type !== "image/jpeg") {
        const canvas = document.createElement("canvas");
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => {
              if (b) finalBlob = b;
              resolve();
            }, "image/jpeg", 0.85);
          };
          img.src = URL.createObjectURL(blob);
        });
      }

      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `magic-up-${selectedProduct?.sku || "ad"}-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar imagem");
    }
  };

  const handleShare = () => {
    if (!currentVariation?.imageUrl) return;
    const clientGreeting = selectedClient ? `Olá ${selectedClient.name}! ` : "";
    const text = `${clientGreeting}✨ Confira a imagem publicitária: ${selectedProduct?.name}${selectedColor ? ` (${selectedColor.name})` : ""} com ${selectedTechnique?.name || "personalização"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + currentVariation.imageUrl)}`, "_blank");
  };

  const handleToggleFavorite = async () => {
    if (!currentVariation?.id) return;
    const newVal = !currentVariation.isFavorite;
    setVariations(prev => prev.map((v, i) => i === activeVariation ? { ...v, isFavorite: newVal } : v));
    await supabase.from("magic_up_generations").update({ is_favorite: newVal }).eq("id", currentVariation.id);
    queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
  };

  const handleToggleHistoryFavorite = async (id: string, current: boolean) => {
    await supabase.from("magic_up_generations").update({ is_favorite: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
  };

  const handleDeleteHistory = async (id: string) => {
    await supabase.from("magic_up_generations").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
    toast.success("Imagem removida do histórico");
  };

  const handleSelectHistory = (item: GenerationHistoryItem) => {
    const newVar: VariationItem = { id: item.id, imageUrl: item.generated_image_url, isFavorite: item.is_favorite };
    setVariations([newVar]);
    setActiveVariation(0);
  };

  // ─── Progress ──────────────────────────────────────────────────

  const step = !selectedProduct ? 1 : !logoPreview ? 2 : !effectivePrompt ? 3 : 4;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-6 border border-primary/20">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                <Sparkles className="h-7 w-7 text-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Magic Up
                </h1>
                <p className="text-muted-foreground mt-1">
                  Crie imagens publicitárias profissionais com IA ✨
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {variations.length > 1 && (
                <Badge variant="secondary" className="gap-1">
                  {variations.length} variações
                </Badge>
              )}
              {history.length > 0 && (
                <Badge variant="outline" className="gap-1.5">
                  <Clock className="h-3 w-3" />
                  {history.length} geradas
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {["Produto", "Logo", "Cenário", "Gerar"].map((label, i) => {
            const s = i + 1;
            const done = step > s;
            const active = step === s;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all flex-1",
                  done ? "border-primary/30 bg-primary/5 text-primary" :
                  active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" :
                  "border-border bg-muted/30 text-muted-foreground"
                )}>
                  <span className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                    done ? "bg-primary text-primary-foreground" :
                    active ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {done ? "✓" : s}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
                {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-4">
            {/* Client (CRM externo) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Empresa
                  <Badge variant="outline" className="text-[9px] ml-1">Opcional</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Busque na base de 51k+ empresas do CRM
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedClient ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    {selectedClient.logo_url && (
                      <img src={selectedClient.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-background border" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedClient.name}</p>
                      {selectedClient.ramo_atividade && (
                        <p className="text-[10px] text-muted-foreground">{selectedClient.ramo_atividade}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => { setSelectedClient(null); setLogoPreview(null); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empresa por nome..."
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientResults(true);
                      }}
                      onFocus={() => setShowClientResults(true)}
                      className="pl-9 h-9"
                    />
                    {showClientResults && clientSearch.length >= 3 && (
                      <div className="absolute z-20 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {loadingClients ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Buscando...
                          </div>
                        ) : clientResults.length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada</div>
                        ) : (
                          clientResults.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent/50 flex items-center gap-2 text-sm"
                              onClick={() => handleSelectClient(c)}
                            >
                              {c.logo_url && (
                                <img src={c.logo_url} alt="" className="w-6 h-6 rounded object-contain border bg-background" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{getCompanyDisplayName(c)}</p>
                                {c.ramo_atividade && (
                                  <p className="text-[10px] text-muted-foreground">{c.ramo_atividade}</p>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 1: Product */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                  Produto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProductSearchCombobox
                  products={products}
                  selectedProduct={selectedProduct}
                  onSelect={(p) => {
                    setSelectedProduct(p);
                    setSelectedColor(null);
                    setVariations([]);
                    setActiveVariation(0);
                  }}
                  placeholder="Buscar produto por nome ou SKU..."
                />

                {selectedProduct && (
                  <div className="flex gap-4">
                    {currentImage && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-background border shrink-0">
                        <img src={currentImage} alt={selectedProduct.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm font-medium truncate">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {selectedProduct.sku}</p>
                      {!loadingColors && colors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {colors.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setSelectedColor(selectedColor?.name === c.name ? null : c)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                selectedColor?.name === c.name
                                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                  : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                              )}
                              title={c.name}
                            >
                              <span className="w-2.5 h-2.5 rounded-full border border-border/30" style={{ backgroundColor: c.hex }} />
                              {c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedProduct && sceneTab !== "ai" && !loadingPrintAreas && printAreas && printAreas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> Local de Personalização
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {printAreas.map((area) => {
                        const label = [area.component_name, area.location_name].filter(Boolean).join(" — ") || area.area_code;
                        const isSelected = selectedLocationId === area.area_id;
                        return (
                          <button
                            key={area.area_id}
                            type="button"
                            onClick={() => setSelectedLocationId(isSelected ? null : area.area_id)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                              isSelected
                                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                                : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            <MapPin className="h-3 w-3" />
                            {label}
                            {area.max_width > 0 && (
                              <span className="text-[9px] opacity-60">{area.max_width}×{area.max_height}{area.unit}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedProduct && sceneTab !== "ai" && availableTechniques.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Paintbrush className="h-3 w-3" /> Técnica
                    </Label>
                    <Select
                      value={selectedTechnique?.id || ""}
                      onValueChange={(v) => setSelectedTechnique(availableTechniques.find(t => t.id === v) || null)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTechniques.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Logo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                  Logo do Cliente
                </CardTitle>
                {selectedClient?.logo_url && logoPreview === selectedClient.logo_url && (
                  <CardDescription className="text-xs">
                    ✓ Logo carregado automaticamente da empresa
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  logoPreview ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/50"
                )}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="hidden"
                    id="magic-logo-upload"
                  />
                  <label htmlFor="magic-logo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    {logoUploading ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : logoPreview ? (
                      <>
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-background border">
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <Button variant="outline" size="sm" type="button">Trocar logo</Button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm font-medium">Clique para enviar o logo</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Máx. 10MB</p>
                      </>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Scene */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                  Cenário Publicitário
                </CardTitle>
                <CardDescription className="text-xs">
                  Use a IA para gerar cenários personalizados ou escolha do banco de prompts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Tab switcher */}
                <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSceneTab("ai")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                      sceneTab === "ai"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Gerar com IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setSceneTab("bank")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                      sceneTab === "bank"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Banco de Prompts
                  </button>
                </div>

                {sceneTab === "ai" ? (
                  <PromptGenerator
                    productName={selectedProduct?.name}
                    productColor={selectedColor?.name}
                    clientName={selectedClient?.name}
                    clientSegment={selectedClient?.ramo_atividade}
                    brandColorName={selectedClient?.cor_primaria_nome}
                    printAreas={printAreas || []}
                    onSelectPrompt={(p) => setSelectedScene(p)}
                    selectedPrompt={selectedScene}
                    initialLocationId={selectedLocationId}
                    initialTechniqueId={selectedTechnique?.id || null}
                    onCustomizationChange={(info) => {
                      setSelectedLocationId(info.locationId);
                      if (info.techniqueId && info.techniqueName) {
                        const tech = availableTechniques.find(t => t.id === info.techniqueId);
                        setSelectedTechnique({ id: info.techniqueId, name: info.techniqueName, code: tech?.code || "" });
                      } else {
                        setSelectedTechnique(null);
                      }
                    }}
                  />
                ) : (
                  <PromptBank
                    selectedPrompt={selectedScene}
                    onSelect={(p) => setSelectedScene(p)}
                    productName={selectedProduct?.name}
                    clientSegment={selectedClient?.ramo_atividade}
                  />
                )}

                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Detalhes adicionais (complementa o cenário acima):
                  </Label>
                  <Textarea
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                    placeholder="Ex: A pessoa deve estar sorrindo, ambiente com tons quentes, foco no produto..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                  {!selectedScene && additionalDetails.trim() && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      💡 Dica: selecione também um cenário acima para melhores resultados
                    </p>
                  )}
                </div>

                {/* Prompt Preview */}
                {(selectedScene || additionalDetails.trim()) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {selectedScene && additionalDetails.trim()
                          ? `${selectedScene.title} + detalhes extras`
                          : selectedScene
                          ? selectedScene.title
                          : "Cenário personalizado"}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 gap-1 text-[10px]"
                        onClick={() => setShowPromptPreview(!showPromptPreview)}
                      >
                        {showPromptPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showPromptPreview ? "Ocultar" : "Ver prompt completo"}
                      </Button>
                    </div>
                    {showPromptPreview && fullPromptPreview && (
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded p-2.5 border">
                        {fullPromptPreview}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando com modelo Pro...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  {variations.length > 0 ? "Gerar Nova Variação" : "Gerar Imagem Publicitária"}
                  {!canGenerate && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {!selectedProduct ? "Selecione um produto" :
                       !logoPreview ? "Envie o logo" :
                       !effectivePrompt ? "Escolha um cenário" : ""}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>

          {/* Right: Result with Variations Carousel */}
          <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
            {/* Variations carousel nav */}
            {variations.length > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={activeVariation === 0}
                  onClick={() => setActiveVariation(prev => prev - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1.5">
                  {variations.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveVariation(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === activeVariation
                          ? "bg-primary w-6"
                          : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={activeVariation === variations.length - 1}
                  onClick={() => setActiveVariation(prev => prev + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <AdImageResult
              imageUrl={currentVariation?.imageUrl || null}
              isLoading={generating}
              productName={selectedProduct?.name}
              sceneName={selectedScene?.title}
              onDownload={handleDownload}
              onShare={handleShare}
              onRegenerate={handleGenerate}
              onToggleFavorite={currentVariation?.id ? handleToggleFavorite : undefined}
              isFavorite={currentVariation?.isFavorite}
              history={history}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
              onToggleHistoryFavorite={handleToggleHistoryFavorite}
            />

            {/* Variations thumbnails */}
            {variations.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {variations.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVariation(i)}
                    className={cn(
                      "w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all",
                      i === activeVariation
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <img src={v.imageUrl} alt={`Variação ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
