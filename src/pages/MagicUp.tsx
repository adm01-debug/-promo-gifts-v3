/**
 * MagicUp — Gerador de Imagens Publicitárias com IA
 * 
 * Gera fotos comerciais/publicitárias usando o produto personalizado
 * em cenários reais (pessoa usando mochila, café no escritório, etc).
 * 
 * Melhorias v2:
 * - Modelo Pro (gemini-3-pro-image-preview)
 * - Persistência de gerações (histórico + favoritos)
 * - Seleção de cliente CRM
 * - Prompt customizável com preview
 * - Gerar variações
 * - Download em múltiplos formatos
 * - WhatsApp com texto personalizado
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, Upload, Loader2, MapPin, Paintbrush,
  ChevronRight, Wand2, Eye, EyeOff, Building2, Clock,
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
import { PromptBank, type ScenePrompt } from "@/components/magic-up/PromptBank";
import { AdImageResult, type GenerationHistoryItem } from "@/components/magic-up/AdImageResult";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

interface CrmClient {
  id: string;
  name: string;
  logo_url?: string | null;
}

// ─── Component ───────────────────────────────────────────────────────

export default function MagicUp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Product
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [loadingColors, setLoadingColors] = useState(false);

  // Technique & Location
  const { data: printAreas, isLoading: loadingPrintAreas } = usePrintAreas(selectedProduct?.id || null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Scene
  const [selectedScene, setSelectedScene] = useState<ScenePrompt | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Client
  const [selectedClient, setSelectedClient] = useState<CrmClient | null>(null);
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [currentGenId, setCurrentGenId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // ─── Load CRM Clients ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bitrix_clients")
        .select("id, name, logo_url")
        .order("name")
        .limit(500);
      if (data) setCrmClients(data);
    })();
  }, []);

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

  // Clear technique if invalid
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

  // ─── Location name ────────────────────────────────────────────

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId || !printAreas) return null;
    const area = printAreas.find(a => a.area_id === selectedLocationId);
    return area ? [area.component_name, area.location_name].filter(Boolean).join(" — ") : null;
  }, [selectedLocationId, printAreas]);

  const effectivePrompt = customPrompt.trim() || selectedScene?.prompt || "";

  const canGenerate = !!(selectedProduct && currentImage && logoPreview && effectivePrompt);

  // ─── Build the full prompt preview ──────────────────────────────

  const fullPromptPreview = useMemo(() => {
    if (!selectedProduct || !effectivePrompt) return "";
    return `PRODUTO: ${selectedProduct.name}${selectedColor ? ` (${selectedColor.name})` : ""}
TÉCNICA: ${selectedTechnique?.name || "Não especificada"} @ ${selectedLocationName || "Não especificado"}
${selectedClient ? `CLIENTE: ${selectedClient.name}` : ""}
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

  // Auto-load client logo
  useEffect(() => {
    if (selectedClient?.logo_url && !logoPreview) {
      setLogoPreview(selectedClient.logo_url);
    }
  }, [selectedClient]);

  const handleGenerate = async () => {
    if (!canGenerate) return;

    setGenerating(true);
    setGeneratedImage(null);
    setCurrentGenId(null);
    setIsFavorite(false);

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
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success("🎉 Imagem publicitária gerada com sucesso!");

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
              custom_prompt: customPrompt.trim() || null,
              product_image_url: currentImage,
              logo_url: isLogoUrl ? logoPreview : null,
              generated_image_url: data.imageUrl,
              client_id: selectedClient?.id || null,
              client_name: selectedClient?.name || null,
            })
            .select("id")
            .single();
          if (inserted) setCurrentGenId(inserted.id);
          queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
        }
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

  const handleDownload = async (format: "png" | "jpg" = "png") => {
    if (!generatedImage) return;
    try {
      const resp = await fetch(generatedImage);
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
    if (!generatedImage) return;
    const clientGreeting = selectedClient ? `Olá ${selectedClient.name}! ` : "";
    const text = `${clientGreeting}✨ Confira a imagem publicitária: ${selectedProduct?.name}${selectedColor ? ` (${selectedColor.name})` : ""} com ${selectedTechnique?.name || "personalização"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + generatedImage)}`, "_blank");
  };

  const handleToggleFavorite = async () => {
    if (!currentGenId) return;
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    await supabase.from("magic_up_generations").update({ is_favorite: newVal }).eq("id", currentGenId);
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
    setGeneratedImage(item.generated_image_url);
    setCurrentGenId(item.id);
    setIsFavorite(item.is_favorite);
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
            {history.length > 0 && (
              <Badge variant="outline" className="gap-1.5">
                <Clock className="h-3 w-3" />
                {history.length} geradas
              </Badge>
            )}
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
            {/* Client (optional) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Cliente
                  <Badge variant="outline" className="text-[9px] ml-1">Opcional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedClient?.id || ""}
                  onValueChange={(v) => {
                    const client = crmClients.find(c => c.id === v);
                    setSelectedClient(client || null);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {crmClients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    setGeneratedImage(null);
                    setCurrentGenId(null);
                  }}
                  placeholder="Buscar produto por nome ou SKU..."
                />

                {/* Product image + colors */}
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

                {/* Locations */}
                {selectedProduct && !loadingPrintAreas && printAreas && printAreas.length > 0 && (
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

                {/* Technique */}
                {selectedProduct && availableTechniques.length > 0 && (
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
                {selectedClient?.logo_url && (
                  <CardDescription className="text-xs">
                    Logo carregado automaticamente do cliente
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
                  Escolha um cenário pronto ou descreva o seu
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PromptBank
                  selectedPrompt={selectedScene}
                  onSelect={(p) => {
                    setSelectedScene(p);
                    setCustomPrompt("");
                  }}
                  productName={selectedProduct?.name}
                />

                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-1 block">Detalhes adicionais ou cenário personalizado:</Label>
                  <Textarea
                    value={customPrompt}
                    onChange={(e) => {
                      setCustomPrompt(e.target.value);
                      if (e.target.value.trim() && !selectedScene) {
                        // Only clear scene if writing from scratch
                      }
                    }}
                    placeholder="Ex: Uma executiva em reunião, usando a mochila personalizada sobre a cadeira... (complementa ou substitui o cenário acima)"
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                {/* Prompt Preview */}
                {(selectedScene || customPrompt.trim()) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">Cenário selecionado:</p>
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
                    <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-medium text-foreground">
                        {selectedScene ? `${selectedScene.title}` : "Cenário personalizado"}
                      </p>
                      {showPromptPreview && fullPromptPreview && (
                        <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded p-2">
                          {fullPromptPreview}
                        </pre>
                      )}
                    </div>
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
                  {generatedImage ? "Gerar Nova Variação" : "Gerar Imagem Publicitária"}
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

          {/* Right: Result */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <AdImageResult
              imageUrl={generatedImage}
              isLoading={generating}
              productName={selectedProduct?.name}
              sceneName={selectedScene?.title}
              onDownload={handleDownload}
              onShare={handleShare}
              onRegenerate={handleGenerate}
              onToggleFavorite={currentGenId ? handleToggleFavorite : undefined}
              isFavorite={isFavorite}
              history={history}
              onSelectHistory={handleSelectHistory}
              onDeleteHistory={handleDeleteHistory}
              onToggleHistoryFavorite={handleToggleHistoryFavorite}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
