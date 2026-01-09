import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Plus, X, Upload, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormSection } from '@/components/ui/FormSection';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductRegistration, ProductFormData } from '@/hooks/useProductRegistration';
import { cn } from '@/lib/utils';

// Schema de validação
const productFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  sku: z.string().min(2, 'SKU deve ter pelo menos 2 caracteres'),
  price: z.number().min(0.01, 'Preço deve ser maior que zero'),
  supplier_id: z.string().min(1, 'Selecione um fornecedor'),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  images: z.array(z.object({
    url: z.string().url('URL inválida'),
    alt_text: z.string().optional(),
    is_primary: z.boolean().optional(),
    image_type: z.enum(['main', 'gallery', 'detail', 'mockup']).optional(),
  })).min(1, 'Adicione pelo menos uma imagem'),
  colors: z.array(z.string()).min(1, 'Selecione pelo menos uma cor'),
  materials: z.array(z.string()).min(1, 'Selecione pelo menos um material'),
  description: z.string().optional(),
  short_description: z.string().optional(),
  cost_price: z.number().optional(),
  subcategory_id: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  weight_grams: z.number().optional(),
  width_cm: z.number().optional(),
  height_cm: z.number().optional(),
  depth_cm: z.number().optional(),
  min_quantity: z.number().optional(),
  stock: z.number().optional(),
  lead_time_days: z.number().optional(),
  is_kit: z.boolean().optional(),
  is_active: z.boolean().optional(),
  technique_ids: z.array(z.string()).optional(),
  tag_ids: z.array(z.string()).optional(),
});

type FormSchema = z.infer<typeof productFormSchema>;

interface ProductRegistrationFormProps {
  onSuccess?: (product: unknown) => void;
  onCancel?: () => void;
}

export function ProductRegistrationForm({ onSuccess, onCancel }: ProductRegistrationFormProps) {
  const { 
    isSubmitting, 
    referenceData, 
    loadReferenceData, 
    createProduct 
  } = useProductRegistration();

  const [newImageUrl, setNewImageUrl] = useState('');

  const form = useForm<FormSchema>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      sku: '',
      price: 0,
      supplier_id: '',
      category_id: '',
      images: [],
      colors: [],
      materials: [],
      description: '',
      short_description: '',
      is_active: true,
      is_kit: false,
      min_quantity: 1,
      stock: 0,
      technique_ids: [],
      tag_ids: [],
    },
  });

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const onSubmit = async (data: FormSchema) => {
    const result = await createProduct(data as ProductFormData);
    if (result) {
      form.reset();
      onSuccess?.(result);
    }
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    try {
      new URL(newImageUrl);
      const currentImages = form.getValues('images');
      form.setValue('images', [
        ...currentImages,
        { url: newImageUrl, is_primary: currentImages.length === 0 },
      ]);
      setNewImageUrl('');
    } catch {
      form.setError('images', { message: 'URL inválida' });
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues('images');
    const newImages = currentImages.filter((_, i) => i !== index);
    // Se removeu a primária, marca a primeira como primária
    if (currentImages[index]?.is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }
    form.setValue('images', newImages);
  };

  const setPrimaryImage = (index: number) => {
    const currentImages = form.getValues('images').map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    form.setValue('images', currentImages);
  };

  const toggleColor = (colorId: string) => {
    const currentColors = form.getValues('colors');
    if (currentColors.includes(colorId)) {
      form.setValue('colors', currentColors.filter(c => c !== colorId));
    } else {
      form.setValue('colors', [...currentColors, colorId]);
    }
  };

  const toggleMaterial = (materialId: string) => {
    const currentMaterials = form.getValues('materials');
    if (currentMaterials.includes(materialId)) {
      form.setValue('materials', currentMaterials.filter(m => m !== materialId));
    } else {
      form.setValue('materials', [...currentMaterials, materialId]);
    }
  };

  const toggleTechnique = (techniqueId: string) => {
    const currentTechniques = form.getValues('technique_ids') || [];
    if (currentTechniques.includes(techniqueId)) {
      form.setValue('technique_ids', currentTechniques.filter(t => t !== techniqueId));
    } else {
      form.setValue('technique_ids', [...currentTechniques, techniqueId]);
    }
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

  const selectedColors = form.watch('colors');
  const selectedMaterials = form.watch('materials');
  const selectedTechniques = form.watch('technique_ids') || [];
  const images = form.watch('images');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados Básicos */}
        <FormSection title="Dados Básicos" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Caneta Personalizada" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: CAN-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cost_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço de Custo (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Fornecedor e Categoria */}
        <FormSection title="Fornecedor e Categoria" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um fornecedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {referenceData.suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                          {supplier.code && ` (${supplier.code})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {referenceData.categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Imagens */}
        <FormSection title="Imagens" required description="Adicione pelo menos uma imagem do produto">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Cole a URL da imagem"
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addImage())}
              />
              <Button type="button" onClick={addImage} variant="secondary">
                <ImagePlus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((img, index) => (
                  <Card key={index} className={cn(
                    "relative overflow-hidden",
                    img.is_primary && "ring-2 ring-primary"
                  )}>
                    <CardContent className="p-2">
                      <img
                        src={img.url}
                        alt={img.alt_text || `Imagem ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.svg';
                        }}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrimaryImage(index)}
                          className={cn(
                            "text-xs",
                            img.is_primary && "text-primary"
                          )}
                        >
                          {img.is_primary ? 'Principal' : 'Definir como principal'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeImage(index)}
                          className="h-6 w-6 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {form.formState.errors.images && (
              <p className="text-sm text-destructive">{form.formState.errors.images.message}</p>
            )}
          </div>
        </FormSection>

        {/* Cores */}
        <FormSection title="Cores Disponíveis" required description="Selecione as cores disponíveis para este produto">
          <div className="flex flex-wrap gap-2">
            {referenceData.colors.map(color => (
              <Badge
                key={color.id}
                variant={selectedColors.includes(color.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleColor(color.id)}
              >
                {color.hex_code && (
                  <span
                    className="w-3 h-3 rounded-full mr-1.5 border"
                    style={{ backgroundColor: color.hex_code }}
                  />
                )}
                {color.color_name}
              </Badge>
            ))}
          </div>
          {form.formState.errors.colors && (
            <p className="text-sm text-destructive mt-2">{form.formState.errors.colors.message}</p>
          )}
        </FormSection>

        {/* Materiais */}
        <FormSection title="Materiais" required description="Selecione os materiais do produto">
          <div className="flex flex-wrap gap-2">
            {referenceData.materials.map(material => (
              <Badge
                key={material.id}
                variant={selectedMaterials.includes(material.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleMaterial(material.id)}
              >
                {material.material_name}
              </Badge>
            ))}
          </div>
          {form.formState.errors.materials && (
            <p className="text-sm text-destructive mt-2">{form.formState.errors.materials.message}</p>
          )}
        </FormSection>

        {/* Técnicas de Personalização */}
        <FormSection title="Técnicas de Personalização" collapsible defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {referenceData.techniques.map(technique => (
              <Badge
                key={technique.id}
                variant={selectedTechniques.includes(technique.id) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTechnique(technique.id)}
              >
                {technique.name}
              </Badge>
            ))}
          </div>
        </FormSection>

        {/* Descrição */}
        <FormSection title="Descrição" collapsible defaultOpen={false}>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="short_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Curta</FormLabel>
                  <FormControl>
                    <Input placeholder="Breve descrição para listagens" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Completa</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição detalhada do produto..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Dimensões e Peso */}
        <FormSection title="Dimensões e Peso" collapsible defaultOpen={false}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="weight_grams"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (g)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="width_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Largura (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="height_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depth_cm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profundidade (cm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Estoque e Disponibilidade */}
        <FormSection title="Estoque e Disponibilidade" collapsible defaultOpen={false}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque Atual</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="min_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade Mínima</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lead_time_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prazo de Entrega (dias)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-6 mt-4">
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Produto Ativo</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_kit"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">É um Kit</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </FormSection>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Cadastrar Produto
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
