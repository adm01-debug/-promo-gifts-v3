/**
 * ProductFormFullscreen — Ferramenta de cadastro com stepper horizontal compacto
 * Conteúdo ocupa a tela inteira, sem duplicações.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { FieldLabel, SectionCard } from './ProductFormHelpers';
import { CategoryCascadeSelector } from './CategoryCascadeSelector';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import { HorizontalStepper, type StepDef } from './HorizontalStepper';
import { useProductFormDraft } from './hooks/useProductFormDraft';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Loader2, Package, Tag, ImageIcon, Layers, Megaphone, Paintbrush,
  AlertCircle, FileText, Save, X,
  PanelRightClose, PanelRightOpen,
  ChevronLeft, ChevronRight, Info, Boxes, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { motion, AnimatePresence } from 'framer-motion';

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
import { useProductSeoAI } from '@/hooks/useProductSeoAI';

const ProductClassificationSection = lazyWithRetry(() => import('./sections/ProductClassificationSection'));
const ProductMediaSection = lazyWithRetry(() => import('./sections/ProductMediaSection'));
const ProductEngravingSection = lazyWithRetry(() => import('./sections/ProductEngravingSection'));
const ProductKitComponentsSection = lazyWithRetry(() => import('../products/kit-components/ProductKitComponentsSection').then(m => ({ default: m.ProductKitComponentsSection })));

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

// ============================================
// TYPES & STEPS
// ============================================

interface ProductFormFullscreenProps {
  initialData?: Partial<ProductFormData>;
  productImages?: string[];
  productId?: string;
  onSubmit: (data: ProductFormData, images: string[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  isEdit: boolean;
}

const STEPS: StepDef[] = [
  { id: 'essentials', label: 'Identificação', description: 'Fornecedor e dados', icon: Info, requiredFields: ['supplier_id', 'sku', 'name'], fieldLabels: { supplier_id: 'Fornecedor', sku: 'SKU Interno', name: 'Nome do Produto' } },
  { id: 'fiscal', label: 'Financeiro e Fiscal', description: 'Preços, estoque e tributos', icon: FileText, requiredFields: ['sale_price'], fieldLabels: { sale_price: 'Preço de Venda' } },
  { id: 'classification', label: 'Classificação', description: 'Gênero, cores e vínculos', icon: Layers, requiredFields: [], fieldLabels: {} },
  { id: 'commercial', label: 'Categorias e Dimensões', description: 'Categoria, dimensões e flags', icon: Tag, requiredFields: [], fieldLabels: {} },
  { id: 'engraving', label: 'Gravação', description: 'Áreas de personalização', icon: Paintbrush, requiredFields: [], fieldLabels: {} },
  { id: 'packaging', label: 'Embalagem', description: 'Dados da embalagem', icon: Package, requiredFields: [], fieldLabels: {} },
  { id: 'kits', label: 'Kits', description: 'Gestão de kits nativos', icon: Boxes, requiredFields: [], fieldLabels: {} } as StepDef,
  { id: 'media', label: 'Mídia', description: 'Imagens e vídeos', icon: ImageIcon, requiredFields: [], fieldLabels: {} },
  { id: 'content', label: 'SEO', description: 'Meta tags e marketing', icon: Megaphone, requiredFields: [], fieldLabels: {} },
];

// ============================================
// MAIN
// ============================================

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
  const [stepIndex, setStepIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(() => {
    const stored = localStorage.getItem('product-form-show-preview');
    return stored !== null ? stored === 'true' : true;
  });

  const {
    register, handleSubmit, setValue, watch, trigger, getValues,
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

  const expirations: Record<string, string | null> = {
    is_featured_expires_at: formValues.is_featured_expires_at ?? null,
    is_bestseller_expires_at: formValues.is_bestseller_expires_at ?? null,
    is_new_expires_at: formValues.is_new_expires_at ?? null,
    is_on_sale_expires_at: formValues.is_on_sale_expires_at ?? null,
  };

  const { status: skuStatus, duplicateName } = useSkuValidation(skuValue, isEdit, initialData?.sku);

  // Draft auto-save
  const { clearDraft } = useProductFormDraft(
    productId, setValue, formValues, images, stepIndex, setImages, setStepIndex,
  );

  // Effects
  useEffect(() => {
    if (!skuManuallyEdited && !isEdit && supplierRefValue) {
      setValue('sku', supplierRefValue, { shouldValidate: true });
    }
  }, [supplierRefValue, skuManuallyEdited, isEdit, setValue]);

  useEffect(() => {
    if (costPriceValue && costPriceValue > 0 && !costPriceDisplay)
      setCostPriceDisplay(costPriceValue.toFixed(2));
  }, [costPriceValue, costPriceDisplay]);

  useEffect(() => {
    if (salePriceValue && salePriceValue > 0 && !salePriceDisplay)
      setSalePriceDisplay(salePriceValue.toFixed(2));
  }, [salePriceValue, salePriceDisplay]);

  useEffect(() => {
    if (!supplierMarkup || !costPriceValue || costPriceValue <= 0) return;
    const calc = Math.round(costPriceValue * (1 + supplierMarkup / 100) * 100) / 100;
    setValue('suggested_price', calc);
    if (!priceManuallyEdited) {
      setValue('sale_price', calc);
      setSalePriceDisplay(calc.toFixed(2));
    }
  }, [costPriceValue, supplierMarkup, priceManuallyEdited, setValue]);

  const numericProps = (name: keyof ProductFormData) => ({
    ...register(name, { valueAsNumber: true }),
    type: 'number' as const,
    step: name.includes('price') ? '0.01' : '1',
  });

  const formProps = { register, setValue, watch, errors, numericProps };
  const { generate: generateSeoAI, isGenerating: isSeoGenerating } = useProductSeoAI(getValues, setValue);

  const [showValidation, setShowValidation] = useState(false);

  const missingFields = useMemo(() => {
    return STEPS.map(step =>
      step.requiredFields
        .filter(f => {
          const val = formValues[f];
          if (typeof val === 'number') return val <= 0 || val === undefined || val === null;
          return !val;
        })
        .map(f => step.fieldLabels[f] || f)
    );
  }, [formValues]);

  const stepReady = useMemo(() => [
    Boolean(formValues.supplier_id && formValues.sku && formValues.name),
    Boolean((formValues.sale_price ?? 0) > 0),
    Boolean(formValues.packing_type),
    Boolean(formValues.ncm_code || formValues.ean),
    isEdit && !!productId,
    true,
    images.length > 0 || Boolean(formValues.video_url),
    Boolean(formValues.meta_title || formValues.meta_description || formValues.key_benefits),
  ], [formValues, images.length, isEdit, productId]);

  const stepErrors = useMemo(() => {
    const errs = Object.keys(errors);
    return STEPS.map(step =>
      step.requiredFields.reduce((c, f) => c + (errs.includes(f) ? 1 : 0), 0)
    );
  }, [errors]);

  const [direction, setDirection] = useState(0);

  const goStep = useCallback((i: number) => {
    setDirection(i > stepIndex ? 1 : -1);
    setStepIndex(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stepIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          document.querySelector<HTMLFormElement>('form')?.requestSubmit();
        } else if (e.key === 'ArrowRight' && stepIndex < STEPS.length - 1) {
          e.preventDefault();
          goStep(stepIndex + 1);
        } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
          e.preventDefault();
          goStep(stepIndex - 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [stepIndex, goStep]);

  const handleSubmitWithValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await trigger();
    const totalMissing = missingFields.reduce((sum, arr) => sum + arr.length, 0);

    if (!isValid || totalMissing > 0) {
      setShowValidation(true);
      const firstBadStep = missingFields.findIndex(arr => arr.length > 0);
      if (firstBadStep >= 0 && firstBadStep !== stepIndex) {
        goStep(firstBadStep);
      }
      return;
    }

    clearDraft();
    handleSubmit(async (data) => {
      if (skuStatus === 'duplicate') return;
      await onSubmit(data, images);
    })(e);
  };

  const currentStep = STEPS[stepIndex];

  const renderContent = () => {
    switch (currentStep.id) {
      case 'essentials':
        return (
          <>
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
              productId={productId}
              isEdit={isEdit}
              primarySupplierName={formValues.brand || ''}
            />
            <ProductInfoSection
              {...formProps}
              skuStatus={skuStatus}
              duplicateName={duplicateName}
              skuManuallyEdited={skuManuallyEdited}
              onSkuManualEdit={() => setSkuManuallyEdited(true)}
            />
            <ProductDimensionsSection {...formProps} isBoxProduct={isBoxProduct} />
          </>
        );
      case 'commercial':
        return (
          <>
            <SectionCard id="category" title="Categoria" icon={Layers} subtitle="Classificação principal do produto no catálogo">
              <CategoryCascadeSelector
                value={formValues.category_id || ''}
                onChange={(id) => setValue('category_id', id)}
                error={errors.category_id?.message}
              />
            </SectionCard>
            <ProductFlagsSection setValue={setValue} flags={flags} expirations={expirations} />
          </>
        );
      case 'packaging':
        return <ProductPackagingSection {...formProps} />;
      case 'fiscal':
        return (
          <>
            <ProductPriceSection
              {...formProps}
              supplierMarkup={supplierMarkup}
              costPriceDisplay={costPriceDisplay}
              salePriceDisplay={salePriceDisplay}
              onCostPriceDisplayChange={setCostPriceDisplay}
              onSalePriceDisplayChange={setSalePriceDisplay}
              onSalePriceManualEdit={() => setPriceManuallyEdited(true)}
            />
            <ProductFiscalSection {...formProps} />
          </>
        );
      case 'content':
        return (
          <>
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSeoAI}
                disabled={isSeoGenerating}
                className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                {isSeoGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 animate-pulse" />}
                {isSeoGenerating ? 'Gerando...' : 'Preencher com IA'}
              </Button>
            </div>
            <ProductSeoSection {...formProps} />
            <ProductMarketingTextsSection register={register} />
          </>
        );
      case 'engraving':
        return (
          <Suspense fallback={<SectionSkeleton />}>
            <ProductEngravingSection productId={productId} isEdit={isEdit} />
          </Suspense>
        );
      case 'classification':
        return (
          <Suspense fallback={<SectionSkeleton />}>
            <ProductClassificationSection
              productId={productId}
              isEdit={isEdit}
              productName={formValues.name}
              productSku={formValues.sku}
              gender={formValues.gender || ''}
              onGenderChange={(v) => setValue('gender', v)}
            />
          </Suspense>
        );
      case 'kits':
        return (
          <>
            <SectionCard id="kit-flag" title="Tipo de Produto" icon={Package} subtitle="Defina se este produto é um kit">
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:bg-accent/30',
                  formValues.is_kit ? 'bg-primary/5 border-primary/20' : 'border-border/50',
                )}
                onClick={() => setValue('is_kit', !formValues.is_kit)}
                role="switch"
                aria-checked={!!formValues.is_kit}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setValue('is_kit', !formValues.is_kit); } }}
              >
                <div className="flex items-center gap-1.5">
                  <Label className="cursor-pointer text-xs font-medium">É Kit</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/40 cursor-help shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-[220px]">Define como kit composto por múltiplos componentes</TooltipContent>
                  </Tooltip>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch checked={!!formValues.is_kit} onCheckedChange={(v) => setValue('is_kit', v)} />
                </div>
              </div>
            </SectionCard>
            {formValues.is_kit && (
              <Suspense fallback={<SectionSkeleton />}>
                <ProductKitComponentsSection
                  productId={productId || ''}
                  boxInternalDimensions={{
                    height_cm: formValues.internal_height_cm ?? null,
                    width_cm: formValues.internal_width_cm ?? null,
                    length_cm: formValues.internal_length_cm ?? null,
                  }}
                />
              </Suspense>
            )}
          </>
        );
      case 'media':
        return (
          <Suspense fallback={<SectionSkeleton />}>
            <ProductMediaSection
              images={images}
              onImagesChange={setImages}
              productId={productId}
            />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const hasPrev = stepIndex > 0;
  const hasNext = stepIndex < STEPS.length - 1;
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <form onSubmit={handleSubmitWithValidation} className="flex flex-col gap-4">
      {/* ===== STEPPER BAR ===== */}
      <Card className="border-border/50 bg-card/80 px-6 py-4">
        <div className="flex items-end justify-between gap-6">
          <div className="flex-1 min-w-0">
            <HorizontalStepper
              steps={STEPS}
              activeIndex={stepIndex}
              stepReady={stepReady}
              stepErrors={stepErrors}
              onStepClick={goStep}
              missingFields={missingFields}
              showValidation={showValidation}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 pb-1">
            {Object.keys(errors).length > 0 && (
              <span className="flex items-center gap-1 text-destructive text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                {Object.keys(errors).length}
              </span>
            )}
            <Button
              type="submit"
              size="sm"
              disabled={isSaving || skuStatus === 'duplicate'}
              className="gap-2 font-semibold shadow-sm"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ===== CONTENT + PREVIEW ===== */}
      <div className="flex gap-6">
        <div className="flex-1 min-w-0 space-y-5">
          {skuStatus === 'duplicate' && (
            <Card className="border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-start gap-3 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">SKU duplicado</p>
                  <p className="mt-1 text-sm">
                    Este SKU já está em uso{duplicateName ? ` no produto "${duplicateName}"` : ''}. Ajuste antes de salvar.
                  </p>
                </div>
              </div>
            </Card>
          )}

          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={currentStep.id}
              custom={direction}
              className="space-y-5"
              initial={{ opacity: 0, x: direction > 0 ? 60 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -60 : 60 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {showValidation && missingFields[stepIndex].length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-500">
                    {missingFields[stepIndex].length} campo{missingFields[stepIndex].length > 1 ? 's' : ''} obrigatório{missingFields[stepIndex].length > 1 ? 's' : ''} nesta etapa
                  </p>
                  <ul className="mt-1.5 space-y-0.5">
                    {missingFields[stepIndex].map(label => (
                      <li key={label} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="h-1 w-1 rounded-full bg-amber-500" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation footer */}
          <div className="flex items-center justify-between pt-2 pb-20 lg:pb-4">
            <div className="flex items-center gap-3">
              {hasPrev && (
                <Button type="button" variant="outline" size="sm" onClick={() => goStep(stepIndex - 1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  {STEPS[stepIndex - 1].label}
                </Button>
              )}
              <span className="hidden lg:inline text-[10px] text-muted-foreground/50">
                Ctrl+←/→ navegar · Ctrl+S salvar
              </span>
            </div>

            <div className="flex items-center gap-2">
              {hasNext && (
                <Button type="button" size="sm" onClick={() => goStep(stepIndex + 1)} className="gap-2">
                  {STEPS[stepIndex + 1].label}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
              {isLast && (
                <Button type="submit" size="sm" disabled={isSaving || skuStatus === 'duplicate'} className="gap-2 font-semibold shadow-sm">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? 'Salvar produto' : 'Criar produto'}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>

        {/* Preview sidebar */}
        <div className="hidden xl:flex flex-col shrink-0">
          <div className="sticky top-24">
            <div className="flex items-center justify-end mb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                onClick={() => setShowPreview(v => {
                  const next = !v;
                  localStorage.setItem('product-form-show-preview', String(next));
                  return next;
                })}
              >
                {showPreview ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                {showPreview ? 'Ocultar' : 'Preview'}
              </Button>
            </div>
            {showPreview && (
              <div className="w-64 animate-in slide-in-from-right-4 duration-200">
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-sm border-t border-border/50 p-3 z-40">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            {hasPrev && (
              <Button type="button" variant="outline" size="sm" onClick={() => goStep(stepIndex - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {stepIndex + 1}/{STEPS.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasNext ? (
              <Button type="button" size="sm" onClick={() => goStep(stepIndex + 1)} className="gap-2">
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="sm" disabled={isSaving || skuStatus === 'duplicate'} className="gap-2">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
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
