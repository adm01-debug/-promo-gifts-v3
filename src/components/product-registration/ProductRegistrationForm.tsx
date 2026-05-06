/**
 * ProductRegistrationForm — Orchestrator (refactored)
 * Sections extracted to ./sections/
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductRegistration, type ProductFormData } from "@/hooks/useProductRegistration";
import { productFormSchema, type ProductFormSchema } from "./productFormTypes";
import { BasicDataSection } from "./sections/BasicDataSection";
import { MediaAttributesSection } from "./sections/MediaAttributesSection";
import { DetailsSection } from "./sections/DetailsSection";

interface ProductRegistrationFormProps {
  onSuccess?: (product: unknown) => void;
  onCancel?: () => void;
}

export function ProductRegistrationForm({ onSuccess, onCancel }: ProductRegistrationFormProps) {
  const { isSubmitting, referenceData, loadReferenceData, createProduct } = useProductRegistration();

  const form = useForm<ProductFormSchema>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "", sku: "", price: 0, supplier_id: "", category_id: "",
      images: [], colors: [], materials: [], description: "", short_description: "",
      is_active: true, is_kit: false, min_quantity: 1, stock: 0, technique_ids: [], tag_ids: [],
    },
  });

  useEffect(() => { loadReferenceData(); }, [loadReferenceData]);

  const onSubmit = async (data: ProductFormSchema) => {
    const result = await createProduct(data as ProductFormData);
    if (result) { form.reset(); onSuccess?.(result); }
  };

  if (referenceData.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <BasicDataSection form={form} referenceData={referenceData} />
        <MediaAttributesSection form={form} referenceData={referenceData} />
        <DetailsSection form={form} />

        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>) : (<><Save className="h-4 w-4 mr-2" />Cadastrar Produto</>)}
          </Button>
        </div>
      </form>
    </Form>
  );
}
