/**
 * ProductForm — Formulário unificado para criar/editar produtos
 * Organizado em seções com validação zod, contadores de caracteres e seletores reais
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { CategorySelect } from './CategorySelect';
import { SupplierSelect } from './SupplierSelect';
import { ProductImageGallery } from './image-gallery';
import { ProductVideoGallery } from './ProductVideoGallery';
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
  Globe,
  Truck,
  FileText,
  Video,
  ShieldCheck,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ProductVariantsSection } from './ProductVariantsSection';
import { ProductMaterialsSection } from './ProductMaterialsSection';
import { ProductTagsSection } from './ProductTagsSection';
import { ProductRamosSection } from './ProductRamosSection';
import { ProductMarketingSection } from './ProductMarketingSection';
import { ProductTechniquesSection } from './ProductTechniquesSection';
import { ProductKitComponentsSection } from './kit-components';

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
      'text-[10px] tabular-nums font-medium',
      pct > 0.9 ? 'text-destructive' : pct > 0.7 ? 'text-warning' : 'text-muted-foreground/50',
      className,
    )}>
      {current}/{max}
    </span>
  );
}

// Required field label
function FieldLabel({ htmlFor, children, required, charCount, charMax, hint }: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  charCount?: number;
  charMax?: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground/80">
          {children}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/40 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[200px]">{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
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
      <CollapsibleTrigger className="flex items-center gap-2.5 w-full py-3 px-3 text-sm font-semibold text-foreground hover:bg-accent/50 rounded-lg transition-colors group -mx-1">
        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="flex-1 text-left">{title}</span>
        {badge && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal bg-muted">
            {badge}
          </Badge>
        )}
        <ChevronDown className={cn('h-4 w-4 transition-transform duration-200 text-muted-foreground/50', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid gap-3.5 pb-5 pt-2 pl-1">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Helper to extract YouTube video ID
function extractYoutubeId(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match?.[1] || '';
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
        const products = Array.isArray(existing) ? existing : (existing as Record<string, unknown>).products || [];
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
  const isImported = watch('is_imported');
  const isTextil = watch('is_textil');
  const isThermal = watch('is_thermal');
  const allowsPersonalization = watch('allows_personalization');
  const hasGiftBox = watch('has_gift_box');
  const hasOptionalPackaging = watch('has_optional_packaging');
  
  // Watch for char counters
  const skuValue = watch('sku') || '';
  const nameValue = watch('name') || '';
  const descValue = watch('description') || '';
  const shortDescValue = watch('short_description') || '';
  const metaDescValue = watch('meta_description') || '';
  const supplierRefValue = watch('supplier_reference') || '';
  const metaTitleValue = watch('meta_title') || '';
  const metaKeywordsValue = watch('meta_keywords') || '';

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
  const flagCount = [isActive, isFeatured, isBestseller, isNew, isOnSale, isKit, hasCommercialPackaging, isImported, isTextil, isThermal, allowsPersonalization, hasGiftBox, hasOptionalPackaging].filter(Boolean).length;

  // Error count per tab for visual feedback
  const basicErrors = ['sku', 'name', 'description', 'short_description', 'meta_description', 'brand', 'category_id', 'supplier_id', 'supplier_reference'].filter(k => (errors as Record<string, unknown>)[k]).length;
  const priceErrors = ['sale_price', 'cost_price', 'stock_quantity', 'min_quantity'].filter(k => (errors as Record<string, unknown>)[k]).length;

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col">
      {/* Quick action: Gerenciar Variações (edit mode only) */}
      {isEdit && productId && (
        <div className="flex items-center justify-end mb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setFormTab('classification')}
          >
            <Layers className="h-3.5 w-3.5" />
            Gerenciar Variações
          </Button>
        </div>
      )}
      <div className="max-h-[65vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <Tabs value={formTab} onValueChange={setFormTab} className="w-full">
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 -mx-1 px-1">
            <TabsList className="w-full h-10 p-1 bg-muted/50 rounded-xl gap-0.5">
              <TabsTrigger value="basic" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm relative flex-1">
                <Info className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Básico</span>
                {basicErrors > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold shadow-sm">
                    {basicErrors}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="details" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
                <Ruler className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Detalhes</span>
              </TabsTrigger>
              <TabsTrigger value="fiscal" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Fiscal</span>
              </TabsTrigger>
              <TabsTrigger value="seo" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">SEO</span>
              </TabsTrigger>
              <TabsTrigger value="classification" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1">
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Classificação</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="text-xs gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm relative flex-1">
                <ImageIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mídia</span>
                {images.length > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5 bg-primary/10 text-primary border-0">{images.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ====== TAB BÁSICO ====== */}
          <TabsContent value="basic" className="space-y-4 mt-0 animate-in fade-in-50 duration-200">
            {/* Card: Informações Básicas */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Info className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Informações Básicas</h4>
              </div>

              {/* 1 - Nome do Produto */}
              <div>
                <FieldLabel htmlFor="name" required charCount={nameValue.length} charMax={300}>
                  Nome do Produto
                </FieldLabel>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Nome do produto"
                  className={cn('h-9', errors.name && 'border-destructive')}
                />
                {errors.name && <p className="text-[10px] text-destructive mt-1">{errors.name.message}</p>}
              </div>

              {/* 2 - SKU Fornecedor | 3 - SKU Interno */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="supplier_reference" charCount={supplierRefValue.length} charMax={100}>
                    SKU do Fornecedor
                  </FieldLabel>
                  <Input
                    id="supplier_reference"
                    {...register('supplier_reference')}
                    placeholder="Ex: FORN-12345"
                    className="font-mono h-9"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="sku" required charCount={skuValue.length} charMax={50}>
                    SKU Interno (Nosso)
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="sku"
                      {...register('sku')}
                      placeholder="Ex: GS-001"
                      className={cn(
                        'font-mono pr-8 h-9',
                        errors.sku && 'border-destructive',
                        skuStatus === 'valid' && 'border-success/50',
                        skuStatus === 'duplicate' && 'border-destructive',
                      )}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {skuStatus === 'checking' && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                      {skuStatus === 'valid' && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
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
                  {errors.sku && <p className="text-[10px] text-destructive mt-1">{errors.sku.message}</p>}
                  {skuStatus === 'duplicate' && (
                    <p className="text-[10px] text-destructive mt-1">SKU duplicado: "{duplicateName}"</p>
                  )}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <FieldLabel htmlFor="description" charCount={descValue.length} charMax={5000}>
                  Descrição
                </FieldLabel>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Descrição detalhada do produto"
                  rows={3}
                  className="text-sm resize-y min-h-[72px]"
                />
              </div>

              {/* Descrição Curta + Meta Descrição */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="short_description" charCount={shortDescValue.length} charMax={500}>
                    Descrição Curta
                  </FieldLabel>
                  <Input
                    id="short_description"
                    {...register('short_description')}
                    placeholder="Resumo em uma linha"
                    className="h-9"
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="meta_description" charCount={metaDescValue.length} charMax={500}>
                    Meta Descrição (SEO)
                  </FieldLabel>
                  <Input
                    id="meta_description"
                    {...register('meta_description')}
                    placeholder="Descrição para buscadores"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Marca + Categoria + Fornecedor */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel htmlFor="brand">Marca</FieldLabel>
                  <Input
                    id="brand"
                    {...register('brand')}
                    placeholder="Ex: Tramontina"
                    className="h-9"
                  />
                </div>
                <div>
                  <FieldLabel>Categoria</FieldLabel>
                  <CategorySelect
                    value={categoryId || ''}
                    onChange={(id) => setValue('category_id', id)}
                    error={errors.category_id?.message}
                  />
                </div>
                <div>
                  <FieldLabel>Fornecedor</FieldLabel>
                  <SupplierSelect
                    value={supplierId || ''}
                    onChange={(id) => setValue('supplier_id', id)}
                    error={errors.supplier_id?.message}
                  />
                </div>
              </div>
            </div>

            {/* Card: Preço e Estoque */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Preço e Estoque</h4>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono tabular-nums">
                  R$ {watch('sale_price')?.toFixed(2) || '0.00'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel htmlFor="sale_price" required>Preço Venda (R$)</FieldLabel>
                  <Input id="sale_price" {...numericProps('sale_price')} min="0" step="0.01" className={cn('h-9', errors.sale_price && 'border-destructive')} />
                  {errors.sale_price && <p className="text-[10px] text-destructive mt-1">{errors.sale_price.message}</p>}
                </div>
                <div>
                  <FieldLabel htmlFor="cost_price">Preço Custo (R$)</FieldLabel>
                  <Input id="cost_price" {...numericProps('cost_price')} min="0" step="0.01" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="suggested_price">Preço Sugerido (R$)</FieldLabel>
                  <Input id="suggested_price" {...numericProps('suggested_price')} min="0" step="0.01" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <FieldLabel htmlFor="stock_quantity">Estoque</FieldLabel>
                  <Input id="stock_quantity" {...numericProps('stock_quantity')} min="0" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="stock_unit">Unidade</FieldLabel>
                  <Input id="stock_unit" {...register('stock_unit')} placeholder="un" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="min_quantity">Qtd. Mínima</FieldLabel>
                  <Input id="min_quantity" {...numericProps('min_quantity')} min="1" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="min_order_quantity">Qtd. Mín. Pedido</FieldLabel>
                  <Input id="min_order_quantity" {...numericProps('min_order_quantity')} min="0" className="h-9" />
                </div>
              </div>
            </div>

            {/* Card: Comercial (collapsible) */}
            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
              <FormSection title="Comercial" icon={Truck} defaultOpen={false}>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <FieldLabel htmlFor="lead_time_days">Prazo Entrega (dias)</FieldLabel>
                    <Input id="lead_time_days" {...numericProps('lead_time_days')} min="0" className="h-9" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="warranty_months">Garantia (meses)</FieldLabel>
                    <Input id="warranty_months" {...numericProps('warranty_months')} min="0" className="h-9" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="product_type">Tipo de Produto</FieldLabel>
                    <Input id="product_type" {...register('product_type')} placeholder="product" className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel htmlFor="supply_mode">Modo de Fornecimento</FieldLabel>
                    <Input id="supply_mode" {...register('supply_mode')} placeholder="Ex: pronta_entrega_liso" className="h-9" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="gender">Gênero</FieldLabel>
                    <select
                      id="gender"
                      {...register('gender')}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Selecione...</option>
                      <option value="unissex">Unissex</option>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                      <option value="infantil">Infantil</option>
                    </select>
                  </div>
                </div>
              </FormSection>
            </div>

            {/* Card: Status e Destaques */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">Status e Destaques</h4>
                </div>
                <Badge variant="outline" className="text-[10px]">{flagCount} ativos</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'is_active' as const, label: 'Produto Ativo', value: isActive, activeClass: 'bg-success/8 border-success/30' },
                  { key: 'is_featured' as const, label: 'Destaque', value: isFeatured },
                  { key: 'is_bestseller' as const, label: 'Mais Vendido', value: isBestseller },
                  { key: 'is_new' as const, label: 'Lançamento', value: isNew },
                  { key: 'is_on_sale' as const, label: 'Em Promoção', value: isOnSale },
                  { key: 'is_kit' as const, label: 'É Kit', value: isKit },
                  { key: 'is_imported' as const, label: 'Importado', value: isImported },
                  { key: 'is_textil' as const, label: 'Têxtil', value: isTextil },
                  { key: 'is_thermal' as const, label: 'Térmico', value: isThermal },
                  { key: 'allows_personalization' as const, label: 'Permite Personalização', value: allowsPersonalization },
                  { key: 'has_gift_box' as const, label: 'Caixa Presente', value: hasGiftBox },
                  { key: 'has_optional_packaging' as const, label: 'Embalagem Opcional', value: hasOptionalPackaging },
                ].map(({ key, label, value, activeClass }) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-2.5 transition-all duration-200 cursor-pointer hover:bg-accent/30',
                      value ? (activeClass || 'bg-primary/5 border-primary/20') : 'border-border/50',
                    )}
                    onClick={() => setValue(key, !value)}
                  >
                    <Label className="cursor-pointer text-xs font-medium">{label}</Label>
                    <Switch
                      checked={value}
                      onCheckedChange={(v) => setValue(key, v)}
                    />
                  </div>
                ))}
                <div
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-2.5 col-span-2 transition-all duration-200 cursor-pointer hover:bg-accent/30',
                    hasCommercialPackaging ? 'bg-primary/5 border-primary/20' : 'border-border/50',
                  )}
                  onClick={() => setValue('has_commercial_packaging', !hasCommercialPackaging)}
                >
                  <Label className="cursor-pointer text-xs font-medium">Embalagem Nativa (comercial)</Label>
                  <Switch
                    checked={hasCommercialPackaging}
                    onCheckedChange={(v) => setValue('has_commercial_packaging', v)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ====== TAB DETALHES ====== */}
          <TabsContent value="details" className="space-y-4 mt-0 animate-in fade-in-50 duration-200">
            {/* Card: Dimensões Externas */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Ruler className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Dimensões Externas</h4>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel htmlFor="height_cm">Altura (cm)</FieldLabel>
                  <Input id="height_cm" {...numericProps('height_cm')} min="0" step="0.1" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="width_cm">Largura (cm)</FieldLabel>
                  <Input id="width_cm" {...numericProps('width_cm')} min="0" step="0.1" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="length_cm">Comprimento (cm)</FieldLabel>
                  <Input id="length_cm" {...numericProps('length_cm')} min="0" step="0.1" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <FieldLabel htmlFor="diameter_cm">Diâmetro (cm)</FieldLabel>
                  <Input id="diameter_cm" {...numericProps('diameter_cm')} min="0" step="0.1" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="circumference_cm">Circunferência (cm)</FieldLabel>
                  <Input id="circumference_cm" {...numericProps('circumference_cm')} min="0" step="0.1" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="weight_g">Peso (g)</FieldLabel>
                  <Input id="weight_g" {...numericProps('weight_g')} min="0" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="capacity_ml">Capacidade (ml)</FieldLabel>
                  <Input id="capacity_ml" {...numericProps('capacity_ml')} min="0" className="h-9" />
                </div>
              </div>
            </div>

            {/* Card: Dimensões Internas */}
            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
              <FormSection title="Dimensões Internas" icon={Ruler} defaultOpen={false}>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <FieldLabel htmlFor="internal_height_cm">Altura Int. (cm)</FieldLabel>
                    <Input id="internal_height_cm" {...numericProps('internal_height_cm')} min="0" step="0.1" className="h-9" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="internal_width_cm">Largura Int. (cm)</FieldLabel>
                    <Input id="internal_width_cm" {...numericProps('internal_width_cm')} min="0" step="0.1" className="h-9" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="internal_length_cm">Comprim. Int. (cm)</FieldLabel>
                    <Input id="internal_length_cm" {...numericProps('internal_length_cm')} min="0" step="0.1" className="h-9" />
                  </div>
                  <div>
                    <FieldLabel htmlFor="internal_diameter_cm">Diâmetro Int. (cm)</FieldLabel>
                    <Input id="internal_diameter_cm" {...numericProps('internal_diameter_cm')} min="0" step="0.1" className="h-9" />
                  </div>
                </div>
              </FormSection>
            </div>

            {/* Card: Embalagem */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Package className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Embalagem (Caixa)</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="packing_type">Tipo de Embalagem</FieldLabel>
                  <Input id="packing_type" {...register('packing_type')} placeholder="Ex: Caixa, Bolsa, Estojo" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="packaging_material">Material Embalagem</FieldLabel>
                  <Input id="packaging_material" {...register('packaging_material')} placeholder="Ex: Papelão, Plástico" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <FieldLabel htmlFor="box_width_mm">Largura (mm)</FieldLabel>
                  <Input id="box_width_mm" {...numericProps('box_width_mm')} min="0" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="box_height_mm">Altura (mm)</FieldLabel>
                  <Input id="box_height_mm" {...numericProps('box_height_mm')} min="0" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="box_length_mm">Profundidade (mm)</FieldLabel>
                  <Input id="box_length_mm" {...numericProps('box_length_mm')} min="0" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <FieldLabel htmlFor="box_weight_kg">Peso (kg)</FieldLabel>
                  <Input id="box_weight_kg" {...numericProps('box_weight_kg')} min="0" step="0.01" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="box_quantity">Qtd por caixa</FieldLabel>
                  <Input id="box_quantity" {...numericProps('box_quantity')} min="0" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="box_inner_quantity">Qtd Interna</FieldLabel>
                  <Input id="box_inner_quantity" {...numericProps('box_inner_quantity')} min="0" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="box_volume_cm3">Volume (cm³)</FieldLabel>
                  <Input id="box_volume_cm3" {...numericProps('box_volume_cm3')} min="0" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="packaging_color">Cor Embalagem</FieldLabel>
                  <Input id="packaging_color" {...register('packaging_color')} placeholder="Ex: Kraft, Branco" className="h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="packaging_finish">Acabamento Embalagem</FieldLabel>
                  <Input id="packaging_finish" {...register('packaging_finish')} placeholder="Ex: Fosco, Brilhante" className="h-9" />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ====== TAB FISCAL ====== */}
          <TabsContent value="fiscal" className="space-y-4 mt-0 animate-in fade-in-50 duration-200">
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Dados Fiscais</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="ncm_code">Código NCM</FieldLabel>
                  <Input id="ncm_code" {...register('ncm_code')} placeholder="Ex: 96081000" className="font-mono h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="ipi_rate">Alíquota IPI (%)</FieldLabel>
                  <Input id="ipi_rate" {...numericProps('ipi_rate')} min="0" step="0.01" className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="ean">Código EAN</FieldLabel>
                  <Input id="ean" {...register('ean')} placeholder="Código de barras EAN" className="font-mono h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="gtin">GTIN</FieldLabel>
                  <Input id="gtin" {...register('gtin')} placeholder="Global Trade Item Number" className="font-mono h-9" />
                </div>
              </div>
              <div>
                <FieldLabel htmlFor="country_of_origin">País de Origem</FieldLabel>
                <Input id="country_of_origin" {...register('country_of_origin')} placeholder="Ex: Brasil, China" className="h-9" />
              </div>
            </div>
          </TabsContent>

          {/* ====== TAB SEO ====== */}
          <TabsContent value="seo" className="space-y-4 mt-0 animate-in fade-in-50 duration-200">
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">SEO e Metadados</h4>
              </div>
              <div>
                <FieldLabel htmlFor="meta_title" charCount={metaTitleValue.length} charMax={200}>
                  Meta Título
                </FieldLabel>
                <Input id="meta_title" {...register('meta_title')} placeholder="Título para buscadores (Google)" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="meta_keywords" charCount={metaKeywordsValue.length} charMax={500}>
                  Palavras-chave (separadas por vírgula)
                </FieldLabel>
                <Input id="meta_keywords" {...register('meta_keywords')} placeholder="caneta, brinde, personalizado" className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="slug">Slug (URL)</FieldLabel>
                  <Input id="slug" {...register('slug')} placeholder="caneta-plastica-001" className="font-mono h-9" />
                </div>
                <div>
                  <FieldLabel htmlFor="canonical_url">URL Canônica</FieldLabel>
                  <Input id="canonical_url" {...register('canonical_url')} placeholder="/produto/caneta-001" className="font-mono h-9" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
              <FormSection title="Textos de Marketing" icon={Megaphone} defaultOpen={false}>
                <div>
                  <FieldLabel htmlFor="key_benefits">Benefícios Principais</FieldLabel>
                  <Textarea id="key_benefits" {...register('key_benefits')} placeholder="Liste os benefícios do produto" rows={3} className="text-sm resize-y" />
                </div>
                <div>
                  <FieldLabel htmlFor="use_cases">Casos de Uso</FieldLabel>
                  <Textarea id="use_cases" {...register('use_cases')} placeholder="Cenários e ocasiões de uso" rows={3} className="text-sm resize-y" />
                </div>
              </FormSection>
            </div>
          </TabsContent>

          {/* ====== TAB CLASSIFICAÇÃO ====== */}
          <TabsContent value="classification" className="space-y-3 mt-0 animate-in fade-in-50 duration-200">
            {isEdit && productId && (
              <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                <FormSection title="Variações de Cor" icon={Palette} defaultOpen>
                  <ProductVariantsSection productId={productId} productName={watch('name')} productSku={watch('sku')} />
                </FormSection>
              </div>
            )}

            {isEdit && productId && isKit && (
              <div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                <FormSection title="Componentes do Kit" icon={Layers} defaultOpen>
                  <ProductKitComponentsSection
                    productId={productId}
                    boxInternalDimensions={{
                      height_cm: watch('internal_height_cm') ?? null,
                      width_cm: watch('internal_width_cm') ?? null,
                      length_cm: watch('internal_length_cm') ?? null,
                    }}
                  />
                </FormSection>
              </div>
            )}

            {[
              { title: 'Materiais', icon: Layers, defaultOpen: isEdit, content: isEdit && productId ? <ProductMaterialsSection productId={productId} /> : null },
              { title: 'Tags', icon: Tag, defaultOpen: false, content: isEdit && productId ? <ProductTagsSection productId={productId} /> : null },
              { title: 'Ramos de Atividade', icon: Building2, defaultOpen: false, content: isEdit && productId ? <ProductRamosSection productId={productId} /> : null },
              { title: 'Marketing', icon: Megaphone, defaultOpen: false, content: isEdit && productId ? <ProductMarketingSection productId={productId} /> : null },
              { title: 'Técnicas de Personalização', icon: Paintbrush, defaultOpen: false, content: isEdit && productId ? <ProductTechniquesSection productId={productId} /> : null },
            ].map(({ title, icon, defaultOpen: defOpen, content }) => (
              <div key={title} className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
                <FormSection title={title} icon={icon} defaultOpen={defOpen}>
                  {content || (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      Salve o produto primeiro para gerenciar {title.toLowerCase()}.
                    </div>
                  )}
                </FormSection>
              </div>
            ))}
          </TabsContent>

          {/* ====== TAB MÍDIA ====== */}
          <TabsContent value="media" className="mt-0 space-y-4 animate-in fade-in-50 duration-200">
            {/* Imagens do Produto (gerais) */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Galeria de Imagens</h4>
                    <p className="text-[11px] text-muted-foreground">Imagens gerais do produto • Classificadas por tipo (principal, galeria, detalhe, embalagem, mockup)</p>
                  </div>
                </div>
                {images.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {images.length} imagem(ns)
                  </Badge>
                )}
              </div>
              <ProductImageGallery
                images={images}
                onChange={setImages}
                folder="products"
                productId={productId}
              />
            </div>

            {/* Galeria de Vídeos */}
            <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <Video className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Galeria de Vídeos</h4>
                    <p className="text-[11px] text-muted-foreground">Vídeos do produto • Classificados por tipo (produto, tutorial, unboxing, review, lifestyle)</p>
                  </div>
                </div>
              </div>

              <ProductVideoGallery productId={productId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
        <div className="text-xs text-muted-foreground">
          {Object.keys(errors).length > 0 && (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertCircle className="h-3.5 w-3.5" />
              {Object.keys(errors).length} campo(s) com erro
            </span>
          )}
        </div>
        <div className="flex gap-2.5">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving} className="px-5">
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving || skuStatus === 'duplicate'}
            className="px-6 font-semibold shadow-sm"
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </div>
      </div>
    </form>
  );
}
