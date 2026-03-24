/**
 * ProductFormFullscreen — Nova ferramenta guiada de cadastro
 *
 * Substitui a navegação longa por um fluxo em etapas, mantendo
 * os mesmos campos, validações e integrações existentes.
 */

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { FieldLabel } from './ProductFormHelpers';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Sparkles,
  Package,
  Tag,
  ImageIcon,
  Layers,
  Megaphone,
  AlertCircle,
  Globe,
  FileText,
  ShieldCheck,
  Save,
  X,
  PanelRightClose,
  PanelRightOpen,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Truck,
  Info,
  Ruler,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

import { ProductSupplierSection } from './sections/ProductSupplierSection';
import { ProductInfoSection } from './sections/ProductInfoSection';
import { ProductDimensionsSection } from './sections/ProductDimensionsSection';
import { ProductPriceSection } from './sections/ProductPriceSection';
import { ProductFlagsSection } from './sections/ProductFlagsSection';
import { ProductPackagingSection } from './sections/ProductPackagingSection';
import { ProductFiscalSection } from './sections/ProductFiscalSection';
import { ProductSeoSection } from './sections/ProductSeoSection';
import { ProductMarketingTextsSection } from './sections/ProductMarketingTextsSection';
import { useSkuValidation } from './hooks/useSkuValidation';

const ProductClassificationSection = lazyWithRetry(() => import('./sections/ProductClassificationSection'));
const ProductMediaSection = lazyWithRetry(() => import('./sections/ProductMediaSection'));

function SectionSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/70">
      <div className="space-y-4 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    </Card>
  );
}

interface ProductFormFullscreenProps {
  initialData?: Partial<ProductFormData>;
  productImages?: string[];
  productId?: string;
  onSubmit: (data: ProductFormData, images: string[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  isEdit: boolean;
}

type StageId = 'essentials' | 'commercial' | 'packaging' | 'content' | 'relations';

interface StageDef {
  id: StageId;
  title: string;
  description: string;
  icon: React.ElementType;
  highlights: string[];
  fields: (keyof ProductFormData)[];
}

const STAGES: StageDef[] = [
  {
    id: 'essentials',
    title: 'Base do produto',
    description: 'Fornecedor, identificação e atributos centrais para o cadastro começar certo.',
    icon: Info,
    highlights: ['Fornecedor', 'SKU', 'Nome', 'Categoria e marca'],
    fields: ['supplier_id', 'sku', 'name', 'brand', 'category_id', 'supplier_reference'],
  },
  {
    id: 'commercial',
    title: 'Comercial e operação',
    description: 'Preço, estoque, dimensões e status comercial em uma única visão operacional.',
    icon: Tag,
    highlights: ['Preço', 'Estoque', 'Dimensões', 'Flags do produto'],
    fields: ['sale_price', 'cost_price', 'stock_quantity', 'min_quantity', 'width_cm', 'height_cm', 'length_cm', 'is_active'],
  },
  {
    id: 'packaging',
    title: 'Embalagem e fiscal',
    description: 'Consolida dados de caixa, materiais e códigos fiscais sem espalhar o preenchimento.',
    icon: Package,
    highlights: ['Tipo de embalagem', 'Caixa master', 'NCM / EAN / GTIN', 'Origem'],
    fields: ['packing_type', 'packaging_material', 'ncm_code', 'ean', 'gtin', 'country_of_origin'],
  },
  {
    id: 'content',
    title: 'Conteúdo e descoberta',
    description: 'Ajusta SEO e textos comerciais para catálogo, busca e venda consultiva.',
    icon: Megaphone,
    highlights: ['SEO', 'Textos de apoio', 'Benefícios', 'Casos de uso'],
    fields: ['meta_title', 'meta_description', 'slug', 'key_benefits', 'use_cases'],
  },
  {
    id: 'relations',
    title: 'Vínculos e mídia',
    description: 'Fecha o cadastro ligando classificação, mockup operacional e galeria do produto.',
    icon: Layers,
    highlights: ['Classificação', 'Tags', 'Técnicas', 'Imagens e vídeo'],
    fields: ['video_url'],
  },
];

function StageRailButton({
  stage,
  isActive,
  isReady,
  errorCount,
  onClick,
}: {
  stage: StageDef;
  isActive: boolean;
  isReady: boolean;
  errorCount: number;
  onClick: () => void;
}) {
  const Icon = stage.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'step' : undefined}
      className={cn(
        'w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
        isActive
          ? 'border-primary/30 bg-primary/10 shadow-sm'
          : 'border-border/50 bg-card/70 hover:border-border hover:bg-accent/30',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
          isActive ? 'border-primary/20 bg-primary/15 text-primary' : 'border-border/50 bg-muted/40 text-muted-foreground',
        )}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn('text-sm font-semibold', isActive ? 'text-foreground' : 'text-foreground/90')}>
              {stage.title}
            </p>
            {isReady ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {stage.description}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {errorCount > 0 ? (
              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-[10px]">
                {errorCount} erro(s)
              </Badge>
            ) : (
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                {isReady ? 'Pronto' : 'Em andamento'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function ToolHeader({
  stage,
  progressValue,
  completedCount,
  totalCount,
  errorCount,
}: {
  stage: StageDef;
  progressValue: number;
  completedCount: number;
  totalCount: number;
  errorCount: number;
}) {
  const Icon = stage.icon;

  return (
    <Card className="border-border/50 bg-card/80 overflow-hidden">
      <div className="border-b border-border/40 bg-muted/20 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]">
                Nova ferramenta
              </Badge>
              <span className="text-xs text-muted-foreground">
                Fluxo guiado para cadastro completo
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {stage.title}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  {stage.description}
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-[260px] space-y-2 rounded-2xl border border-border/50 bg-background/70 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso geral</span>
              <span>{completedCount}/{totalCount} etapas prontas</span>
            </div>
            <Progress value={progressValue} className="h-2" />
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Ferramenta orientada por contexto
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 font-medium text-destructive">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorCount} erro(s)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          {stage.highlights.map((item) => (
            <Badge key={item} variant="outline" className="rounded-full px-3 py-1 text-[11px]">
              {item}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function ProductFormFullscreen({
  initialData,
  productImages: initialImages = [],
  productId,
  onSubmit,
  onCancel,
  isSaving,
  isEdit,
}: ProductFormFullscreenProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(isEdit);
  const [supplierMarkup, setSupplierMarkup] = useState<number | null>(null);
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(isEdit);
  const [costPriceDisplay, setCostPriceDisplay] = useState('');
  const [salePriceDisplay, setSalePriceDisplay] = useState('');
  const [activeStage, setActiveStage] = useState<StageId>('essentials');
  const [showPreview, setShowPreview] = useState(() => {
    const stored = localStorage.getItem('product-form-show-preview');
    return stored !== null ? stored === 'true' : true;
  });

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

  const formValues = watch();
  const supplierId = formValues.supplier_id || '';
  const isKit = formValues.is_kit;
  const packingType = formValues.packing_type || '';
  const isBoxProduct = packingType.toLowerCase().includes('caixa');
  const skuValue = formValues.sku || '';
  const nameValue = formValues.name || '';
  const salePriceValue = formValues.sale_price ?? 0;
  const costPriceValue = formValues.cost_price ?? 0;
  const stockQuantityValue = formValues.stock_quantity ?? 0;
  const brandValue = formValues.brand || '';
  const supplierRefValue = formValues.supplier_reference || '';

  const flags: Record<string, boolean> = {
    is_active: formValues.is_active,
    is_featured: formValues.is_featured,
    is_bestseller: formValues.is_bestseller,
    is_new: formValues.is_new,
    is_on_sale: formValues.is_on_sale,
    is_kit: formValues.is_kit,
    is_imported: formValues.is_imported,
    is_textil: formValues.is_textil,
    is_thermal: formValues.is_thermal,
    allows_personalization: formValues.allows_personalization,
    has_gift_box: formValues.has_gift_box,
    has_optional_packaging: formValues.has_optional_packaging,
    has_commercial_packaging: formValues.has_commercial_packaging,
  };

  const { status: skuStatus, duplicateName } = useSkuValidation(skuValue, isEdit, initialData?.sku);

  useEffect(() => {
    if (!skuManuallyEdited && !isEdit && supplierRefValue) {
      setValue('sku', supplierRefValue, { shouldValidate: true });
    }
  }, [supplierRefValue, skuManuallyEdited, isEdit, setValue]);

  useEffect(() => {
    if (costPriceValue && costPriceValue > 0 && !costPriceDisplay) {
      setCostPriceDisplay(costPriceValue.toFixed(2));
    }
  }, [costPriceValue, costPriceDisplay]);

  useEffect(() => {
    if (salePriceValue && salePriceValue > 0 && !salePriceDisplay) {
      setSalePriceDisplay(salePriceValue.toFixed(2));
    }
  }, [salePriceValue, salePriceDisplay]);

  useEffect(() => {
    if (!supplierMarkup || !costPriceValue || costPriceValue <= 0) return;
    const markupMultiplier = 1 + supplierMarkup / 100;
    const calculatedPrice = Math.round(costPriceValue * markupMultiplier * 100) / 100;
    setValue('suggested_price', calculatedPrice);

    if (!priceManuallyEdited) {
      setValue('sale_price', calculatedPrice);
      setSalePriceDisplay(calculatedPrice.toFixed(2));
    }
  }, [costPriceValue, supplierMarkup, priceManuallyEdited, setValue]);

  const numericProps = (name: keyof ProductFormData) => ({
    ...register(name, { valueAsNumber: true }),
    type: 'number' as const,
    step: name.includes('price') ? '0.01' : '1',
  });

  const formProps = { register, setValue, watch, errors, numericProps };
  const totalErrorCount = Object.keys(errors).length;
  const stageIndex = STAGES.findIndex((stage) => stage.id === activeStage);
  const currentStage = STAGES[stageIndex] ?? STAGES[0];

  const stageStates = useMemo(() => {
    const hasBasics = Boolean(formValues.supplier_id && formValues.sku && formValues.name);
    const hasCommercialCore = Boolean((formValues.sale_price ?? 0) >= 0 && (formValues.stock_quantity ?? 0) >= 0 && formValues.is_active !== undefined);
    const hasPackagingCore = Boolean(formValues.packing_type || formValues.ncm_code || formValues.ean || formValues.gtin || formValues.country_of_origin);
    const hasContentCore = Boolean(formValues.meta_title || formValues.meta_description || formValues.key_benefits || formValues.use_cases);
    const hasRelationsCore = images.length > 0 || Boolean(formValues.video_url);

    const readiness: Record<StageId, boolean> = {
      essentials: hasBasics,
      commercial: hasCommercialCore,
      packaging: hasPackagingCore,
      content: hasContentCore,
      relations: hasRelationsCore,
    };

    return STAGES.map((stage) => ({
      ...stage,
      isReady: readiness[stage.id],
      errorCount: stage.fields.reduce((count, field) => count + ((errors as Record<string, unknown>)[field] ? 1 : 0), 0),
    }));
  }, [errors, formValues, images.length]);

  const completedCount = stageStates.filter((stage) => stage.isReady).length;
  const progressValue = (completedCount / STAGES.length) * 100;

  const goToStage = (stageId: StageId) => {
    setActiveStage(stageId);
    requestAnimationFrame(() => {
      document.getElementById('product-form-tool-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const onFormSubmit = handleSubmit(async (data) => {
    if (skuStatus === 'duplicate') return;
    await onSubmit(data, images);
  });

  const renderStageContent = () => {
    switch (activeStage) {
      case 'essentials':
        return (
          <div className="space-y-5">
            <ProductSupplierSection
              supplierId={supplierId}
              onSupplierChange={(id, name, markupPercent) => {
                setValue('supplier_id', id);
                if (name) setValue('brand', name);
                setSupplierMarkup(markupPercent ?? null);
                setPriceManuallyEdited(false);
              }}
              setValue={setValue}
              errors={errors}
            />

            <ProductInfoSection
              {...formProps}
              skuStatus={skuStatus}
              duplicateName={duplicateName}
              skuManuallyEdited={skuManuallyEdited}
              onSkuManualEdit={() => setSkuManuallyEdited(true)}
            />
          </div>
        );

      case 'commercial':
        return (
          <div className="space-y-5">
            <ProductDimensionsSection {...formProps} isBoxProduct={isBoxProduct} />

            <ProductPriceSection
              {...formProps}
              supplierMarkup={supplierMarkup}
              costPriceDisplay={costPriceDisplay}
              salePriceDisplay={salePriceDisplay}
              onCostPriceDisplayChange={setCostPriceDisplay}
              onSalePriceDisplayChange={setSalePriceDisplay}
              onSalePriceManualEdit={() => setPriceManuallyEdited(true)}
            />

            <ProductFlagsSection setValue={setValue} flags={flags} />
          </div>
        );

      case 'packaging':
        return (
          <div className="space-y-5">
            <ProductPackagingSection {...formProps} />
            <ProductFiscalSection {...formProps} />
          </div>
        );

      case 'content':
        return (
          <div className="space-y-5">
            <ProductSeoSection {...formProps} />
            <ProductMarketingTextsSection register={register} />
          </div>
        );

      case 'relations':
        return (
          <div className="space-y-5">
            <Card className="border-border/50 bg-card/70 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Fechamento do cadastro</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Aqui você conecta o produto aos vínculos operacionais e sobe a mídia que abastece catálogo, mockups e orçamento.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                    <Truck className="mr-1 h-3.5 w-3.5" />
                    Operação pronta para vínculo
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                    <ImageIcon className="mr-1 h-3.5 w-3.5" />
                    {images.length} mídia(s)
                  </Badge>
                </div>
              </div>
            </Card>

            <Suspense fallback={<SectionSkeleton />}>
              <ProductClassificationSection
                productId={productId}
                isEdit={isEdit}
                isKit={isKit}
                productName={formValues.name}
                productSku={formValues.sku}
                internalDimensions={{
                  height_cm: formValues.internal_height_cm ?? null,
                  width_cm: formValues.internal_width_cm ?? null,
                  length_cm: formValues.internal_length_cm ?? null,
                }}
                genderField={
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                }
              />
            </Suspense>

            <Suspense fallback={<SectionSkeleton />}>
              <ProductMediaSection
                images={images}
                onImagesChange={setImages}
                productId={productId}
              />
            </Suspense>
          </div>
        );

      default:
        return null;
    }
  };

  const previousStage = stageIndex > 0 ? STAGES[stageIndex - 1] : null;
  const nextStage = stageIndex < STAGES.length - 1 ? STAGES[stageIndex + 1] : null;

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col" id="product-form-tool-top">
      <div className="flex flex-col gap-6 2xl:flex-row">
        <aside className="2xl:w-[330px] 2xl:shrink-0">
          <div className="space-y-4 2xl:sticky 2xl:top-24">
            <Card className="border-border/50 bg-card/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Ferramenta de cadastro
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Fluxo novo, mais guiado e sem espalhar o preenchimento.
                  </p>
                </div>
                <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[10px]">
                  {stageIndex + 1}/{STAGES.length}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Etapas concluídas</span>
                  <span>{completedCount}</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-1">
              {stageStates.map((stage) => (
                <StageRailButton
                  key={stage.id}
                  stage={stage}
                  isActive={activeStage === stage.id}
                  isReady={stage.isReady}
                  errorCount={stage.errorCount}
                  onClick={() => goToStage(stage.id)}
                />
              ))}
            </div>

            <Card className="hidden border-border/50 bg-card/80 p-4 2xl:block">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Preview lateral</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPreview((value) => {
                    const next = !value;
                    localStorage.setItem('product-form-show-preview', String(next));
                    return next;
                  })}
                >
                  {showPreview ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                  {showPreview ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>

              {showPreview ? (
                <ProductPreviewPanel
                  name={nameValue}
                  sku={skuValue}
                  salePrice={salePriceValue}
                  stockQuantity={stockQuantityValue}
                  images={images}
                  brand={brandValue}
                  isFeatured={flags.is_featured}
                  isNew={flags.is_new}
                  isOnSale={flags.is_on_sale}
                  isKit={isKit}
                  isActive={flags.is_active}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  Preview recolhido para dar mais foco ao preenchimento.
                </div>
              )}
            </Card>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5 pb-28">
          <ToolHeader
            stage={currentStage}
            progressValue={progressValue}
            completedCount={completedCount}
            totalCount={STAGES.length}
            errorCount={totalErrorCount}
          />

          {skuStatus === 'duplicate' && (
            <Card className="border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start gap-3 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">SKU duplicado</p>
                  <p className="mt-1 text-sm">
                    Este SKU já está em uso{duplicateName ? ` no produto “${duplicateName}”` : ''}. Ajuste o código antes de salvar.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {renderStageContent()}

          <Card className="border-border/50 bg-card/80 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Controle da ferramenta</p>
                <p className="text-sm text-muted-foreground">
                  Avance por etapas ou salve agora — sem perder nenhum dos campos já existentes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {previousStage && (
                  <Button type="button" variant="outline" onClick={() => goToStage(previousStage.id)} className="gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Etapa anterior
                  </Button>
                )}

                {nextStage ? (
                  <Button type="button" onClick={() => goToStage(nextStage.id)} className="gap-2">
                    Próxima etapa
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSaving || skuStatus === 'duplicate'} className="gap-2 font-semibold shadow-sm">
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isEdit ? 'Salvar produto' : 'Criar produto'}
                  </Button>
                )}

                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 p-3 backdrop-blur-sm 2xl:hidden z-40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              {currentStage.title}
            </p>
            <p className="text-xs text-muted-foreground">
              Etapa {stageIndex + 1} de {STAGES.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {previousStage && (
              <Button type="button" variant="outline" size="sm" onClick={() => goToStage(previousStage.id)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {nextStage ? (
              <Button type="button" size="sm" onClick={() => goToStage(nextStage.id)} className="gap-2">
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={isSaving || skuStatus === 'duplicate'} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isEdit ? 'Salvar' : 'Criar'}
              </Button>
            )}

            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}