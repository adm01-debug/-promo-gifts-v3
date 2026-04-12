/**
 * MediaAttributesSection — Imagens, Cores, Materiais, Técnicas
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormSection } from "@/components/ui/FormSection";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormSchema, ReferenceDataState } from "../productFormTypes";

interface MediaAttributesSectionProps {
  form: UseFormReturn<ProductFormSchema>;
  referenceData: ReferenceDataState;
}

export function MediaAttributesSection({ form, referenceData }: MediaAttributesSectionProps) {
  const [newImageUrl, setNewImageUrl] = useState("");
  const images = form.watch("images");
  const selectedColors = form.watch("colors");
  const selectedMaterials = form.watch("materials");
  const selectedTechniques = form.watch("technique_ids") || [];

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    try {
      new URL(newImageUrl);
      const current = form.getValues("images");
      form.setValue("images", [...current, { url: newImageUrl, is_primary: current.length === 0 }]);
      setNewImageUrl("");
    } catch { form.setError("images", { message: "URL inválida" }); }
  };

  const removeImage = (index: number) => {
    const current = form.getValues("images");
    const next = current.filter((_, i) => i !== index);
    if (current[index]?.is_primary && next.length > 0) next[0].is_primary = true;
    form.setValue("images", next);
  };

  const setPrimary = (index: number) => {
    form.setValue("images", form.getValues("images").map((img, i) => ({ ...img, is_primary: i === index })));
  };

  const toggle = (field: "colors" | "materials" | "technique_ids", id: string) => {
    const current = form.getValues(field) || [];
    form.setValue(field, current.includes(id) ? current.filter((v: string) => v !== id) : [...current, id]);
  };

  return (
    <>
      {/* Imagens */}
      <FormSection title="Imagens" required description="Adicione pelo menos uma imagem do produto">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Cole a URL da imagem" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImage())} />
            <Button type="button" onClick={addImage} variant="secondary"><ImagePlus className="h-4 w-4 mr-2" />Adicionar</Button>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((img, index) => (
                <Card key={index} className={cn("relative overflow-hidden", img.is_primary && "ring-2 ring-primary")}>
                  <CardContent className="p-2">
                    <img src={img.url} alt={img.alt_text || `Imagem ${index + 1}`} className="w-full h-24 object-cover rounded"
                      onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                    <div className="flex items-center justify-between mt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPrimary(index)}
                        className={cn("text-xs", img.is_primary && "text-primary")}>{img.is_primary ? "Principal" : "Definir como principal"}</Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Remover" onClick={() => removeImage(index)} className="h-6 w-6 text-destructive"><X className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {form.formState.errors.images && <p className="text-sm text-destructive">{form.formState.errors.images.message}</p>}
        </div>
      </FormSection>

      {/* Cores */}
      <FormSection title="Cores Disponíveis" required description="Selecione as cores disponíveis">
        <div className="flex flex-wrap gap-2">
          {referenceData.colors.map(color => (
            <Badge key={color.id} variant={selectedColors.includes(color.id) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggle("colors", color.id)}>
              {color.hex_code && <span className="w-3 h-3 rounded-full mr-1.5 border" style={{ backgroundColor: color.hex_code }} />}
              {color.color_name}
            </Badge>
          ))}
        </div>
        {form.formState.errors.colors && <p className="text-sm text-destructive mt-2">{form.formState.errors.colors.message}</p>}
      </FormSection>

      {/* Materiais */}
      <FormSection title="Materiais" required description="Selecione os materiais do produto">
        <div className="flex flex-wrap gap-2">
          {referenceData.materials.map(m => (
            <Badge key={m.id} variant={selectedMaterials.includes(m.id) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggle("materials", m.id)}>{m.material_name}</Badge>
          ))}
        </div>
        {form.formState.errors.materials && <p className="text-sm text-destructive mt-2">{form.formState.errors.materials.message}</p>}
      </FormSection>

      {/* Técnicas */}
      <FormSection title="Técnicas de Personalização" collapsible defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {referenceData.techniques.map(t => (
            <Badge key={t.id} variant={selectedTechniques.includes(t.id) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggle("technique_ids", t.id)}>{t.name}</Badge>
          ))}
        </div>
      </FormSection>
    </>
  );
}
