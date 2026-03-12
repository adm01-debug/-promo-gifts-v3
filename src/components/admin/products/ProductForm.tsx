/**
 * ProductForm — Formulário unificado para criar/editar produtos
 * Organizado em seções com validação zod e seletores reais
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { CategorySelect } from './CategorySelect';
import { SupplierSelect } from './SupplierSelect';
import { ImageUploadButton } from '../ImageUploadButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ChevronDown, Info, Ruler, Package, Tag, ImageIcon, Palette, Layers } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ProductVariantsSection } from './ProductVariantsSection';

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  productImages?: string[];
  productId?: string;
  onSubmit: (data: ProductFormData, images: string[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  isEdit: boolean;
}

// Section wrapper component
function FormSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors">
        <Icon className="h-4 w-4 text-primary" />
        {title}
        <ChevronDown className={cn('h-4 w-4 ml-auto transition-transform', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-4 pb-4 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ProductForm({
  initialData,
  productImages: initialImages = [],
  productId,
  onSubmit,
  onCancel,
  isSaving,
  isEdit,
}: ProductFormProps) {
  const [images, setImages] = useState<string[]>(initialImages);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData },
  });

  // Watch values for controlled components
  const categoryId = watch('category_id');
  const supplierId = watch('supplier_id');
  const isActive = watch('is_active');
  const isFeatured = watch('is_featured');
  const isNew = watch('is_new');
  const isOnSale = watch('is_on_sale');

  const onFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data, images);
  });

  const handleImageUpload = (url: string) => {
    setImages(prev => [...prev, url]);
  };

  const handleImageRemove = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Helper for number input that allows empty
  const numericProps = (name: keyof ProductFormData) => ({
    ...register(name, { valueAsNumber: true }),
    type: 'number' as const,
    step: name.includes('price') ? '0.01' : '1',
  });

  return (
    <form onSubmit={onFormSubmit}>
      <div className="max-h-[60vh] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div className="space-y-1">
          {/* ====== INFO BÁSICA ====== */}
          <FormSection title="Informações Básicas" icon={Info} defaultOpen>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  {...register('sku')}
                  placeholder="Ex: PROD-001"
                  className={cn(errors.sku && 'border-destructive')}
                />
                {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Nome do produto"
                  className={cn(errors.name && 'border-destructive')}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Descrição detalhada do produto"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="short_description">Descrição Curta</Label>
                <Input
                  id="short_description"
                  {...register('short_description')}
                  placeholder="Resumo em uma linha"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  {...register('brand')}
                  placeholder="Ex: Tramontina"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <CategorySelect
                  value={categoryId || ''}
                  onChange={(id) => setValue('category_id', id)}
                  error={errors.category_id?.message}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fornecedor</Label>
                <SupplierSelect
                  value={supplierId || ''}
                  onChange={(id) => setValue('supplier_id', id)}
                  error={errors.supplier_id?.message}
                />
              </div>
            </div>
          </FormSection>

          <Separator />

          {/* ====== PREÇO E ESTOQUE ====== */}
          <FormSection title="Preço e Estoque" icon={Tag} defaultOpen>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sale_price">Preço Venda (R$)</Label>
                <Input id="sale_price" {...numericProps('sale_price')} min="0" />
                {errors.sale_price && <p className="text-xs text-destructive">{errors.sale_price.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost_price">Preço Custo (R$)</Label>
                <Input id="cost_price" {...numericProps('cost_price')} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock_quantity">Estoque</Label>
                <Input id="stock_quantity" {...numericProps('stock_quantity')} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="min_quantity">Qtd. Mínima</Label>
                <Input id="min_quantity" {...numericProps('min_quantity')} min="1" />
              </div>
            </div>
          </FormSection>

          <Separator />

          {/* ====== DIMENSÕES ====== */}
          <FormSection title="Dimensões e Peso" icon={Ruler} defaultOpen={false}>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="height_cm">Altura (cm)</Label>
                <Input id="height_cm" {...numericProps('height_cm')} min="0" step="0.1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="width_cm">Largura (cm)</Label>
                <Input id="width_cm" {...numericProps('width_cm')} min="0" step="0.1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="length_cm">Comprimento (cm)</Label>
                <Input id="length_cm" {...numericProps('length_cm')} min="0" step="0.1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="diameter_cm">Diâmetro (cm)</Label>
                <Input id="diameter_cm" {...numericProps('diameter_cm')} min="0" step="0.1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weight_g">Peso (g)</Label>
                <Input id="weight_g" {...numericProps('weight_g')} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capacity_ml">Capacidade (ml)</Label>
                <Input id="capacity_ml" {...numericProps('capacity_ml')} min="0" />
              </div>
            </div>
          </FormSection>

          <Separator />

          {/* ====== EMBALAGEM ====== */}
          <FormSection title="Embalagem (Caixa)" icon={Package} defaultOpen={false}>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="box_width_mm">Largura (mm)</Label>
                <Input id="box_width_mm" {...numericProps('box_width_mm')} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="box_height_mm">Altura (mm)</Label>
                <Input id="box_height_mm" {...numericProps('box_height_mm')} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="box_length_mm">Profundidade (mm)</Label>
                <Input id="box_length_mm" {...numericProps('box_length_mm')} min="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="box_weight_kg">Peso caixa (kg)</Label>
                <Input id="box_weight_kg" {...numericProps('box_weight_kg')} min="0" step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="box_quantity">Qtd por caixa</Label>
                <Input id="box_quantity" {...numericProps('box_quantity')} min="0" />
              </div>
            </div>
          </FormSection>

          <Separator />

          {/* ====== MATERIAIS ====== */}
          <FormSection title="Materiais" icon={Tag} defaultOpen={false}>
            <div className="space-y-1.5">
              <Label htmlFor="materials">Materiais (separados por vírgula)</Label>
              <Input
                id="materials"
                {...register('materials')}
                placeholder="Ex: Plástico, Metal, Silicone"
              />
            </div>
          </FormSection>

          <Separator />

          {/* ====== VARIAÇÕES DE COR ====== */}
          {isEdit && productId && (
            <>
              <FormSection title="Variações de Cor" icon={Palette} defaultOpen>
                <ProductVariantsSection productId={productId} productName={watch('name')} productSku={watch('sku')} />
              </FormSection>
              <Separator />
            </>
          )}

          {/* ====== FLAGS ====== */}
          <FormSection title="Status e Destaques" icon={Tag} defaultOpen>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Produto Ativo</Label>
                <Switch
                  checked={isActive}
                  onCheckedChange={(v) => setValue('is_active', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Destaque</Label>
                <Switch
                  checked={isFeatured}
                  onCheckedChange={(v) => setValue('is_featured', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Lançamento</Label>
                <Switch
                  checked={isNew}
                  onCheckedChange={(v) => setValue('is_new', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Em Promoção</Label>
                <Switch
                  checked={isOnSale}
                  onCheckedChange={(v) => setValue('is_on_sale', v)}
                />
              </div>
            </div>
          </FormSection>

          <Separator />

          {/* ====== IMAGENS ====== */}
          <FormSection title="Imagens" icon={ImageIcon} defaultOpen>
            <div className="flex flex-wrap gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img
                    src={img}
                    alt={`Imagem ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleImageRemove(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <ImageUploadButton
                currentImageUrl={null}
                onUpload={handleImageUpload}
                onRemove={() => {}}
                folder="products"
              />
            </div>
          </FormSection>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t mt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? 'Salvar Alterações' : 'Criar Produto'}
        </Button>
      </div>
    </form>
  );
}
