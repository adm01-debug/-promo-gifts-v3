/**
 * ProductForm — Formulário unificado para criar/editar produtos
 * Organizado em seções com validação zod, contadores de caracteres e seletores reais
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { CategorySelect } from './CategorySelect';
import { SupplierSelect } from './SupplierSelect';
import { ProductImageGallery } from './ProductImageGallery';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  ChevronDown,
  Info,
  Ruler,
  Package,
  Tag,
  ImageIcon,
  Palette,
  Layers,
  Building2,
  Paintbrush,
  Megaphone,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ProductVariantsSection } from './ProductVariantsSection';
import { ProductMaterialsSection } from './ProductMaterialsSection';
import { ProductTagsSection } from './ProductTagsSection';
import { ProductRamosSection } from './ProductRamosSection';
import { ProductMarketingSection } from './ProductMarketingSection';
import { ProductTechniquesSection } from './ProductTechniquesSection';

interface ProductFormProps {
  initialData?: Partial<ProductFormData>;
  productImages?: string[];
  productId?: string;
  onSubmit: (data: ProductFormData, images: string[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  isEdit: boolean;
}

// Character counter component
function CharCounter({ current, max, className }: { current: number; max: number; className?: string }) {
  const pct = current / max;
  return (
    <span className={cn(
      'text-[10px] tabular-nums',
      pct > 0.9 ? 'text-destructive' : pct > 0.7 ? 'text-yellow-500' : 'text-muted-foreground/60',
      className,
    )}>
      {current}/{max}
    </span>
  );
}

// Required field label
function FieldLabel({ htmlFor, children, required, charCount, charMax }: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  charCount?: number;
  charMax?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor} className="text-xs font-medium">
        {children}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {charCount !== undefined && charMax !== undefined && (
        <CharCounter current={charCount} max={charMax} />
      )}
    </div>
  );
}

// Section wrapper component
function FormSection({
  title,
  icon: Icon,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full py-2.5 text-sm font-semibold text-foreground hover:text-primary transition-colors group">
        <Icon className="h-4 w-4 text-primary" />
        {title}
        {badge && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
            {badge}
          </Badge>
        )}
        <ChevronDown className={cn('h-4 w-4 ml-auto transition-transform text-muted-foreground group-hover:text-primary', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-3 pb-4 pt-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// SKU validation hook
function useSkuValidation(currentSku: string, isEdit: boolean, originalSku?: string) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'duplicate'>('idle');
  const [duplicateName, setDuplicateName] = useState('');

  useEffect(() => {
    if (!currentSku || currentSku.length < 2) {
      setStatus('idle');
      return;
    }
    if (isEdit && currentSku === originalSku) {
      setStatus('valid');
      return;
    }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { fetchPromobrindProducts } = await import('@/lib/external-db');
        const existing = await fetchPromobrindProducts({ search: currentSku, limit: 5 });
        const products = Array.isArray(existing) ? existing : (existing as any).products || [];
        const duplicate = products.find(
          (p: any) => p.sku?.toLowerCase() === currentSku.toLowerCase()
        );
        if (duplicate) {
          setStatus('duplicate');
          setDuplicateName(duplicate.name || '');
        } else {
          setStatus('valid');
          setDuplicateName('');
        }
      } catch {
        setStatus('idle');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [currentSku, isEdit, originalSku]);

  return { status, duplicateName };
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
  const [formTab, setFormTab] = useState<string>('basic');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { ...defaultFormValues, ...initialData },
  });

  // Watch values
  const categoryId = watch('category_id');
  const supplierId = watch('supplier_id');
  const isActive = watch('is_active');
  const isFeatured = watch('is_featured');
  const isBestseller = watch('is_bestseller');
  const isNew = watch('is_new');
  const isOnSale = watch('is_on_sale');
  const isKit = watch('is_kit');
  const hasCommercialPackaging = watch('has_commercial_packaging');
  
  // Watch for char counters
  const skuValue = watch('sku') || '';
  const nameValue = watch('name') || '';
  const descValue = watch('description') || '';
  const shortDescValue = watch('short_description') || '';
  const metaDescValue = watch('meta_description') || '';

  // SKU validation
  const { status: skuStatus, duplicateName } = useSkuValidation(
    skuValue,
    isEdit,
    initialData?.sku,
  );

  const onFormSubmit = handleSubmit(async (data) => {
    if (skuStatus === 'duplicate') return;
    await onSubmit(data, images);
  });

  // Helper for number input
  const numericProps = (name: keyof ProductFormData) => ({
    ...register(name, { valueAsNumber: true }),
    type: 'number' as const,
    step: name.includes('price') ? '0.01' : '1',
  });

  // Count active flags
  const flagCount = [isActive, isFeatured, isBestseller, isNew, isOnSale, isKit, hasCommercialPackaging].filter(Boolean).length;

  // Error count per tab for visual feedback
  const basicErrors = ['sku', 'name', 'description', 'short_description', 'meta_description', 'brand', 'category_id', 'supplier_id', 'supplier_reference'].filter(k => (errors as any)[k]).length;
  const priceErrors = ['sale_price', 'cost_price', 'stock_quantity', 'min_quantity'].filter(k => (errors as any)[k]).length;

  return (
    <form onSubmit={onFormSubmit}>
      <div className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Tab navigation for main sections */}
        <Tabs value={formTab} onValueChange={setFormTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-9">
            <TabsTrigger value="basic" className="text-xs gap-1 relative">
              <Info className="h-3 w-3" />
              Básico
              {basicErrors > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                  {basicErrors}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="details" className="text-xs gap-1">
              <Ruler className="h-3 w-3" />
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="classification" className="text-xs gap-1">
              <Layers className="h-3 w-3" />
              Classificação
            </TabsTrigger>
            <TabsTrigger value="media" className="text-xs gap-1">
              <ImageIcon className="h-3 w-3" />
              Mídia
              {images.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 ml-1">{images.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ====== TAB BÁSICO ====== */}
          <TabsContent value="basic" className="space-y-1 mt-0">
            <FormSection title="Informações Básicas" icon={Info} defaultOpen>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="sku" required charCount={skuValue.length} charMax={50}>
                    SKU
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="sku"
                      {...register('sku')}
                      placeholder="Ex: PROD-001"
                      className={cn(
                        'font-mono pr-8',
                        errors.sku && 'border-destructive',
                        skuStatus === 'valid' && 'border-green-500/50',
                        skuStatus === 'duplicate' && 'border-destructive',
                      )}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      {skuStatus === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {skuStatus === 'valid' && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                      {skuStatus === 'duplicate' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            SKU já usado em "{duplicateName}"
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  {errors.sku && <p className="text-[10px] text-destructive">{errors.sku.message}</p>}
                  {skuStatus === 'duplicate' && (
                    <p className="text-[10px] text-destructive">SKU duplicado: "{duplicateName}"</p>
                  )}
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="name" required charCount={nameValue.length} charMax={300}>
                    Nome
                  </FieldLabel>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Nome do produto"
                    className={cn(errors.name && 'border-destructive')}
                  />
                  {errors.name && <p className="text-[10px] text-destructive">{errors.name.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <FieldLabel htmlFor="description" charCount={descValue.length} charMax={5000}>
                  Descrição
                </FieldLabel>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Descrição detalhada do produto"
                  rows={3}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="short_description" charCount={shortDescValue.length} charMax={500}>
                    Descrição Curta
                  </FieldLabel>
                  <Input
                    id="short_description"
                    {...register('short_description')}
                    placeholder="Resumo em uma linha"
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="meta_description" charCount={metaDescValue.length} charMax={500}>
                    Meta Descrição (SEO)
                  </FieldLabel>
                  <Input
                    id="meta_description"
                    {...register('meta_description')}
                    placeholder="Descrição para buscadores"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="brand">Marca</FieldLabel>
                  <Input
                    id="brand"
                    {...register('brand')}
                    placeholder="Ex: Tramontina"
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="supplier_reference">Ref. Fornecedor</FieldLabel>
                  <Input
                    id="supplier_reference"
                    {...register('supplier_reference')}
                    placeholder="Código do fornecedor"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <FieldLabel>Categoria</FieldLabel>
                  <CategorySelect
                    value={categoryId || ''}
                    onChange={(id) => setValue('category_id', id)}
                    error={errors.category_id?.message}
                  />
                </div>
                <div className="space-y-1">
                  <FieldLabel>Fornecedor</FieldLabel>
                  <SupplierSelect
                    value={supplierId || ''}
                    onChange={(id) => setValue('supplier_id', id)}
                    error={errors.supplier_id?.message}
                  />
                </div>
              </div>
            </FormSection>

            <Separator />

            {/* Preço e Estoque */}
            <FormSection title="Preço e Estoque" icon={Tag} defaultOpen badge={`R$ ${watch('sale_price')?.toFixed(2) || '0.00'}`}>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="sale_price" required>Preço Venda (R$)</FieldLabel>
                  <Input id="sale_price" {...numericProps('sale_price')} min="0" className={cn(errors.sale_price && 'border-destructive')} />
                  {errors.sale_price && <p className="text-[10px] text-destructive">{errors.sale_price.message}</p>}
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="cost_price">Preço Custo (R$)</FieldLabel>
                  <Input id="cost_price" {...numericProps('cost_price')} min="0" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="stock_quantity">Estoque</FieldLabel>
                  <Input id="stock_quantity" {...numericProps('stock_quantity')} min="0" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="min_quantity">Qtd. Mínima</FieldLabel>
                  <Input id="min_quantity" {...numericProps('min_quantity')} min="1" />
                </div>
              </div>
            </FormSection>

            <Separator />

            {/* Status / Flags */}
            <FormSection title="Status e Destaques" icon={Tag} defaultOpen badge={`${flagCount} ativos`}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'is_active' as const, label: 'Produto Ativo', value: isActive, color: 'bg-green-500/10 border-green-500/30' },
                  { key: 'is_featured' as const, label: 'Destaque', value: isFeatured },
                  { key: 'is_bestseller' as const, label: 'Mais Vendido', value: isBestseller },
                  { key: 'is_new' as const, label: 'Lançamento', value: isNew },
                  { key: 'is_on_sale' as const, label: 'Em Promoção', value: isOnSale },
                  { key: 'is_kit' as const, label: 'É Kit', value: isKit },
                ].map(({ key, label, value, color }) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-2.5 transition-colors',
                      value && (color || 'bg-primary/5 border-primary/20'),
                    )}
                  >
                    <Label className="cursor-pointer text-xs">{label}</Label>
                    <Switch
                      checked={value}
                      onCheckedChange={(v) => setValue(key, v)}
                    />
                  </div>
                ))}
                <div
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-2.5 col-span-2 transition-colors',
                    hasCommercialPackaging && 'bg-primary/5 border-primary/20',
                  )}
                >
                  <Label className="cursor-pointer text-xs">Embalagem Nativa (comercial)</Label>
                  <Switch
                    checked={hasCommercialPackaging}
                    onCheckedChange={(v) => setValue('has_commercial_packaging', v)}
                  />
                </div>
              </div>
            </FormSection>
          </TabsContent>

          {/* ====== TAB DETALHES ====== */}
          <TabsContent value="details" className="space-y-1 mt-0">
            <FormSection title="Dimensões e Peso" icon={Ruler} defaultOpen>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="height_cm">Altura (cm)</FieldLabel>
                  <Input id="height_cm" {...numericProps('height_cm')} min="0" step="0.1" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="width_cm">Largura (cm)</FieldLabel>
                  <Input id="width_cm" {...numericProps('width_cm')} min="0" step="0.1" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="length_cm">Comprimento (cm)</FieldLabel>
                  <Input id="length_cm" {...numericProps('length_cm')} min="0" step="0.1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="diameter_cm">Diâmetro (cm)</FieldLabel>
                  <Input id="diameter_cm" {...numericProps('diameter_cm')} min="0" step="0.1" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="weight_g">Peso (g)</FieldLabel>
                  <Input id="weight_g" {...numericProps('weight_g')} min="0" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="capacity_ml">Capacidade (ml)</FieldLabel>
                  <Input id="capacity_ml" {...numericProps('capacity_ml')} min="0" />
                </div>
              </div>
            </FormSection>

            <Separator />

            <FormSection title="Embalagem (Caixa)" icon={Package} defaultOpen>
              <div className="space-y-1">
                <FieldLabel htmlFor="packing_type">Tipo de Embalagem</FieldLabel>
                <Input
                  id="packing_type"
                  {...register('packing_type')}
                  placeholder="Ex: Caixa de Presente, Bolsa, Estojo"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="box_width_mm">Largura (mm)</FieldLabel>
                  <Input id="box_width_mm" {...numericProps('box_width_mm')} min="0" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="box_height_mm">Altura (mm)</FieldLabel>
                  <Input id="box_height_mm" {...numericProps('box_height_mm')} min="0" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="box_length_mm">Profundidade (mm)</FieldLabel>
                  <Input id="box_length_mm" {...numericProps('box_length_mm')} min="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <FieldLabel htmlFor="box_weight_kg">Peso caixa (kg)</FieldLabel>
                  <Input id="box_weight_kg" {...numericProps('box_weight_kg')} min="0" step="0.01" />
                </div>
                <div className="space-y-1">
                  <FieldLabel htmlFor="box_quantity">Qtd por caixa</FieldLabel>
                  <Input id="box_quantity" {...numericProps('box_quantity')} min="0" />
                </div>
              </div>
            </FormSection>
          </TabsContent>

          {/* ====== TAB CLASSIFICAÇÃO ====== */}
          <TabsContent value="classification" className="space-y-1 mt-0">
            {/* Variações de Cor */}
            {isEdit && productId && (
              <>
                <FormSection title="Variações de Cor" icon={Palette} defaultOpen>
                  <ProductVariantsSection productId={productId} productName={watch('name')} productSku={watch('sku')} />
                </FormSection>
                <Separator />
              </>
            )}

            <FormSection title="Materiais" icon={Layers} defaultOpen={isEdit}>
              {isEdit && productId ? (
                <ProductMaterialsSection productId={productId} />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Salve o produto para selecionar materiais.
                </div>
              )}
            </FormSection>

            <Separator />

            <FormSection title="Tags" icon={Tag} defaultOpen={false}>
              {isEdit && productId ? (
                <ProductTagsSection productId={productId} />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Salve o produto para vincular tags.
                </div>
              )}
            </FormSection>

            <Separator />

            <FormSection title="Ramos de Atividade" icon={Building2} defaultOpen={false}>
              {isEdit && productId ? (
                <ProductRamosSection productId={productId} />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Salve o produto para vincular ramos.
                </div>
              )}
            </FormSection>

            <Separator />

            <FormSection title="Marketing" icon={Megaphone} defaultOpen={false}>
              {isEdit && productId ? (
                <ProductMarketingSection productId={productId} />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Salve o produto para classificar marketing.
                </div>
              )}
            </FormSection>

            <Separator />

            <FormSection title="Técnicas de Personalização" icon={Paintbrush} defaultOpen={false}>
              {isEdit && productId ? (
                <ProductTechniquesSection productId={productId} />
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  Salve o produto para vincular técnicas.
                </div>
              )}
            </FormSection>
          </TabsContent>

          {/* ====== TAB MÍDIA ====== */}
          <TabsContent value="media" className="mt-0">
            <FormSection title="Galeria de Imagens" icon={ImageIcon} defaultOpen>
              <ProductImageGallery
                images={images}
                onChange={setImages}
                folder="products"
              />
            </FormSection>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <div className="text-xs text-muted-foreground">
          {Object.keys(errors).length > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {Object.keys(errors).length} campo(s) com erro
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving || skuStatus === 'duplicate'}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </div>
      </div>
    </form>
  );
}
