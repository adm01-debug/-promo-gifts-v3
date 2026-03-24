/**
 * ProductFormFullscreen — Ferramenta de cadastro com stepper horizontal compacto
 * Conteúdo ocupa a tela inteira, sem duplicações.
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, Package, Tag, ImageIcon, Layers, Megaphone, Paintbrush,
  AlertCircle, Globe, FileText, ShieldCheck, Save, X,
  PanelRightClose, PanelRightOpen, CheckCircle2,
  ChevronLeft, ChevronRight, Truck, Info, Ruler,
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

const ProductClassificationSection = lazyWithRetry(() => import('./sections/ProductClassificationSection'));
const ProductMediaSection = lazyWithRetry(() => import('./sections/ProductMediaSection'));
const ProductEngravingSection = lazyWithRetry(() => import('./sections/ProductEngravingSection'));

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
// TYPES
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

type StepId = 'essentials' | 'commercial' | 'packaging' | 'fiscal' | 'content' | 'engraving' | 'relations';

interface StepDef {
  id: StepId;
  label: string;
  icon: React.ElementType;
  requiredFields: (keyof ProductFormData)[];
  fieldLabels: Record<string, string>;
}

const STEPS: StepDef[] = [
  { id: 'essentials', label: 'Identificação', icon: Info, requiredFields: ['supplier_id', 'sku', 'name'], fieldLabels: { supplier_id: 'Fornecedor', sku: 'SKU Interno', name: 'Nome do Produto' } },
  { id: 'commercial', label: 'Comercial', icon: Tag, requiredFields: ['sale_price'], fieldLabels: { sale_price: 'Preço de Venda' } },
  { id: 'packaging', label: 'Embalagem & Fiscal', icon: Package, requiredFields: [], fieldLabels: {} },
  { id: 'content', label: 'SEO & Textos', icon: Megaphone, requiredFields: [], fieldLabels: {} },
  { id: 'engraving', label: 'Gravação', icon: Paintbrush, requiredFields: [], fieldLabels: {} },
  { id: 'relations', label: 'Vínculos & Mídia', icon: Layers, requiredFields: [], fieldLabels: {} },
];

// ============================================
// STEPPER
// ============================================

function HorizontalStepper({
  steps,
  activeIndex,
  stepReady,
  stepErrors,
  onStepClick,
  missingFields,
  showValidation,
}: {
  steps: StepDef[];
  activeIndex: number;
  stepReady: boolean[];
  stepErrors: number[];
  onStepClick: (i: number) => void;
  missingFields: string[][];
  showValidation: boolean;
}) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1 overflow-x-auto overflow-y-visible pb-1" style={{ paddingBottom: 120, marginBottom: -120 }}>
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === activeIndex;
        const isDone = stepReady[i];
        const hasError = stepErrors[i] > 0;
        const hasMissing = showValidation && missingFields[i].length > 0;

        return (
          <React.Fragment key={step.id}>
            {i > 0 && (
              <div className={cn(
                'hidden sm:block h-px flex-1 min-w-[16px] max-w-[48px] transition-colors',
                isDone || i <= activeIndex ? 'bg-primary/40' : 'bg-border/40',
              )} />
            )}
            <button
              type="button"
              onClick={() => onStepClick(i)}
              onMouseEnter={() => setHoveredStep(i)}
              onMouseLeave={() => setHoveredStep(null)}
              className={cn(
                'group relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/25 shadow-sm'
                  : isDone
                    ? 'bg-primary/5 text-primary/80 hover:bg-primary/10'
                    : hasMissing
                      ? 'text-destructive/80 ring-1 ring-destructive/20 bg-destructive/5 hover:bg-destructive/10'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                isActive ? 'bg-primary text-primary-foreground' :
                isDone ? 'bg-primary/20 text-primary' :
                'bg-muted/60 text-muted-foreground',
              )}>
                {isDone && !isActive ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
              {hasError && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {stepErrors[i]}
                </span>
              )}
              {hasMissing && !hasError && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                  {missingFields[i].length}
                </span>
              )}
              {/* Tooltip com campos faltantes */}
              {hoveredStep === i && hasMissing && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-max max-w-[220px] rounded-lg border border-border bg-popover p-2.5 shadow-lg animate-fade-in">
                  <p className="text-[10px] font-semibold text-amber-500 mb-1.5">Campos obrigatórios:</p>
                  <ul className="space-y-0.5">
                    {missingFields[i].map((label) => (
                      <li key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

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
    register, handleSubmit, setValue, watch,
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

  // Effects (same as before)
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

  const [showValidation, setShowValidation] = useState(false);

  // Missing fields per step (human-readable labels)
  const missingFields = useMemo(() => {
    return STEPS.map(step => {
      return step.requiredFields
        .filter(f => {
          const val = formValues[f];
          if (typeof val === 'number') return val <= 0 || val === undefined || val === null;
          return !val;
        })
        .map(f => step.fieldLabels[f] || f);
    });
  }, [formValues]);

  // Step readiness
  const stepReady = useMemo(() => [
    Boolean(formValues.supplier_id && formValues.sku && formValues.name),
    Boolean((formValues.sale_price ?? 0) >= 0),
    Boolean(formValues.packing_type || formValues.ncm_code || formValues.ean),
    Boolean(formValues.meta_title || formValues.meta_description || formValues.key_benefits),
    isEdit && !!productId, // engraving — ready if editing
    images.length > 0 || Boolean(formValues.video_url),
  ], [formValues, images.length, isEdit, productId]);

  const stepErrors = useMemo(() => {
    const errs = Object.keys(errors);
    return STEPS.map(step =>
      step.requiredFields.reduce((c, f) => c + (errs.includes(f) ? 1 : 0), 0)
    );
  }, [errors]);

  const [direction, setDirection] = useState(0);

  const goStep = (i: number) => {
    setDirection(i > stepIndex ? 1 : -1);
    setStepIndex(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onFormSubmit = handleSubmit(async (data) => {
    if (skuStatus === 'duplicate') return;
    await onSubmit(data, images);
  });

  // Intercept submit to show validation
  const handleSubmitWithValidation = (e: React.FormEvent) => {
    const totalMissing = missingFields.reduce((sum, arr) => sum + arr.length, 0);
    if (totalMissing > 0) {
      e.preventDefault();
      setShowValidation(true);
      // Navigate to first step with missing fields
      const firstBadStep = missingFields.findIndex(arr => arr.length > 0);
      if (firstBadStep >= 0 && firstBadStep !== stepIndex) {
        goStep(firstBadStep);
      }
      return;
    }
    onFormSubmit(e);
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
            />
            <ProductInfoSection
              {...formProps}
              skuStatus={skuStatus}
              duplicateName={duplicateName}
              skuManuallyEdited={skuManuallyEdited}
              onSkuManualEdit={() => setSkuManuallyEdited(true)}
            />
          </>
        );
      case 'commercial':
        return (
          <>
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
          </>
        );
      case 'packaging':
        return (
          <>
            <ProductPackagingSection {...formProps} />
            <ProductFiscalSection {...formProps} />
          </>
        );
      case 'content':
        return (
          <>
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
      case 'relations':
        return (
          <>
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
          </>
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
      <Card className="border-border/50 bg-card/80 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <HorizontalStepper
            steps={STEPS}
            activeIndex={stepIndex}
            stepReady={stepReady}
            stepErrors={stepErrors}
            onStepClick={goStep}
            missingFields={missingFields}
            showValidation={showValidation}
          />

          <div className="flex items-center gap-2 shrink-0">
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
        {/* Main content */}
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

          {/* Validation summary for current step */}
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
            <div>
              {hasPrev && (
                <Button type="button" variant="outline" size="sm" onClick={() => goStep(stepIndex - 1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  {STEPS[stepIndex - 1].label}
                </Button>
              )}
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