/**
 * Generation + download/share/favorite handlers extracted from useMagicUpState
 */
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { VariationItem, MagicUpProduct, Technique, SelectedClient } from "./useMagicUpState";
import type { ScenePrompt } from "@/components/magic-up/PromptBank";
import type { GenerationHistoryItem } from "@/components/magic-up/AdImageResult";
import type { ProductColor } from "./useMagicUpState";
import type { MagicUpBrief, MagicUpCopyPack, MagicUpCreativeControls, MagicUpQualityScore } from "@/pages/magic-up/magicUpStrategy";

interface GenerationDeps {
  selectedProduct: MagicUpProduct | null;
  currentImage: string | null;
  logoPreview: string | null;
  effectivePrompt: string;
  selectedColor: ProductColor | null;
  selectedTechnique: Technique | null;
  selectedLocationName: string | null;
  selectedScene: ScenePrompt | null;
  selectedClient: SelectedClient | null;
  userId: string | undefined;
  brief: MagicUpBrief;
  creativeControls: MagicUpCreativeControls;
  qualityScore: MagicUpQualityScore;
  copyPack: MagicUpCopyPack;
  fullPromptPreview: string;
}

export function useMagicUpGeneration(deps: GenerationDeps) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<VariationItem[]>([]);
  const [activeVariation, setActiveVariation] = useState(0);

  const canGenerate = !!(deps.selectedProduct && deps.currentImage && deps.logoPreview && deps.effectivePrompt);
  const currentVariation = variations[activeVariation] || null;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const isLogoUrl = deps.logoPreview!.startsWith("http");
      const { data, error } = await supabase.functions.invoke("generate-ad-image", {
        body: {
          productImageUrl: deps.currentImage,
          logoBase64: isLogoUrl ? undefined : deps.logoPreview,
          logoUrl: isLogoUrl ? deps.logoPreview : undefined,
          productName: deps.selectedProduct!.name,
          productColor: deps.selectedColor?.name || null,
          techniqueName: deps.selectedTechnique?.name || null,
          locationName: deps.selectedLocationName || null,
          scenePrompt: deps.effectivePrompt,
          sceneCategory: deps.selectedScene?.category || "custom",
          brandColorHex: deps.selectedClient?.cor_primaria_hex || null,
          brandColorName: deps.selectedClient?.cor_primaria_nome || null,
          campaignBrief: deps.brief,
          outputChannel: deps.brief.channel,
          aspectRatio: deps.creativeControls.aspectRatio,
          qualityMode: deps.creativeControls.qualityMode,
          compositionMode: deps.creativeControls.composition,
          creativeMode: deps.creativeControls.creativeMode,
          negativePrompt: deps.creativeControls.negativePrompt,
        },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        let genId: string | null = null;
        if (deps.userId) {
          const { data: inserted } = await supabase
            .from("magic_up_generations")
            .insert({
              user_id: deps.userId,
              product_name: deps.selectedProduct!.name,
              product_id: deps.selectedProduct!.id,
              product_sku: deps.selectedProduct!.sku,
              scene_title: deps.selectedScene?.title || null,
              scene_category: deps.selectedScene?.category || "custom",
              generated_image_url: data.imageUrl,
              client_name: deps.selectedClient?.name || null,
              prompt_text: deps.fullPromptPreview || deps.effectivePrompt,
              model: "magic-up-pro",
              channel: deps.brief.channel,
              aspect_ratio: deps.creativeControls.aspectRatio,
              quality_score: deps.qualityScore.total,
              status: "draft",
              tags: [deps.brief.channel, deps.brief.objective, deps.brief.tone].filter(Boolean),
              copy_pack: deps.copyPack,
              export_presets: ["png", "jpg-whatsapp", deps.creativeControls.aspectRatio],
              metadata: { brief: deps.brief, creativeControls: deps.creativeControls, qualityScore: deps.qualityScore },
            })
            .select("id")
            .single();
          if (inserted) genId = inserted.id;
          queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
        }
        const newVariation: VariationItem = { id: genId, imageUrl: data.imageUrl, isFavorite: false };
        setVariations(prev => {
          setActiveVariation(prev.length);
          return [...prev, newVariation];
        });
        toast.success("🎉 Imagem publicitária gerada com sucesso!");
      } else {
        throw new Error(data?.error || "Nenhuma imagem retornada");
      }
    } catch (err: unknown) {
      console.error("Magic Up error:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao gerar imagem");
    } finally {
      setGenerating(false);
    }
  }, [canGenerate, deps, queryClient]);

  const handleDownload = useCallback(async (format: "png" | "jpg" = "png") => {
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
            canvas.toBlob((b) => { if (b) finalBlob = b; resolve(); }, "image/jpeg", 0.85);
          };
          img.src = URL.createObjectURL(blob);
        });
      }
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `magic-up-${deps.selectedProduct?.sku || "ad"}-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar imagem");
    }
  }, [currentVariation, deps.selectedProduct]);

  const handleShare = useCallback(() => {
    if (!currentVariation?.imageUrl) return;
    const clientGreeting = deps.selectedClient ? `Olá ${deps.selectedClient.name}! ` : "";
    const text = deps.copyPack.whatsapp || `${clientGreeting}✨ Confira a imagem publicitária: ${deps.selectedProduct?.name}${deps.selectedColor ? ` (${deps.selectedColor.name})` : ""} com ${deps.selectedTechnique?.name || "personalização"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + currentVariation.imageUrl)}`, "_blank");
  }, [currentVariation, deps]);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentVariation?.id) return;
    const newVal = !currentVariation.isFavorite;
    setVariations(prev => prev.map((v, i) => i === activeVariation ? { ...v, isFavorite: newVal } : v));
    await supabase.from("magic_up_generations").update({ is_favorite: newVal }).eq("id", currentVariation.id);
    queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
  }, [currentVariation, activeVariation, queryClient]);

  const handleToggleHistoryFavorite = useCallback(async (id: string, current: boolean) => {
    await supabase.from("magic_up_generations").update({ is_favorite: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
  }, [queryClient]);

  const handleDeleteHistory = useCallback(async (id: string) => {
    await supabase.from("magic_up_generations").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["magic-up-history"] });
    toast.success("Imagem removida do histórico");
  }, [queryClient]);

  const handleSelectHistory = useCallback((item: GenerationHistoryItem) => {
    const newVar: VariationItem = { id: item.id, imageUrl: item.generated_image_url, isFavorite: item.is_favorite };
    setVariations([newVar]);
    setActiveVariation(0);
  }, []);

  return {
    generating, variations, activeVariation, setActiveVariation,
    currentVariation, canGenerate, setVariations,
    handleGenerate, handleDownload, handleShare,
    handleToggleFavorite, handleToggleHistoryFavorite,
    handleDeleteHistory, handleSelectHistory,
  };
}
