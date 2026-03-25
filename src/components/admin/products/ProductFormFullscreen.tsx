/**
 * ProductFormFullscreen — Ferramenta de cadastro com stepper horizontal compacto
 * Conteúdo ocupa a tela inteira, sem duplicações.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { FieldLabel, SectionCard } from './ProductFormHelpers';
import { CategorySelect } from './CategorySelect';
import { NewCategoryDialog } from './NewCategoryDialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
import { ProductSupplierSourcesSection } from './sections/ProductSupplierSourcesSection';

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

type StepId = 'category' | 'essentials' | 'commercial' | 'packaging' | 'fiscal' | 'engraving' | 'classification' | 'media' | 'content';

interface StepDef {
  id: StepId;
  label: string;
  description: string;
  icon: React.ElementType;
  requiredFields: (keyof ProductFormData)[];
  fieldLabels: Record<string, string>;
}

const STEPS: StepDef[] = [
  { id: 'category', label: 'Categoria', description: 'Classificação do produto', icon: Layers, requiredFields: [], fieldLabels: {} },
  { id: 'essentials', label: 'Identificação', description: 'Fornecedor, SKU e nome', icon: Info, requiredFields: ['supplier_id', 'sku', 'name'], fieldLabels: { supplier_id: 'Fornecedor', sku: 'SKU Interno', name: 'Nome do Produto' } },
  { id: 'commercial', label: 'Comercial', description: 'Dimensões e flags', icon: Tag, requiredFields: [], fieldLabels: {} },
  { id: 'packaging', label: 'Embalagem', description: 'Dados da embalagem', icon: Package, requiredFields: [], fieldLabels: {} },
  { id: 'fiscal', label: 'Financeiro e Fiscal', description: 'Preços, estoque e tributos', icon: FileText, requiredFields: ['sale_price'], fieldLabels: { sale_price: 'Preço de Venda' } },
  { id: 'engraving', label: 'Gravação', description: 'Áreas de personalização', icon: Paintbrush, requiredFields: [], fieldLabels: {} },
  { id: 'classification', label: 'Classificação', description: 'Gênero, cores e vínculos', icon: Layers, requiredFields: [], fieldLabels: {} },
  { id: 'media', label: 'Mídia', description: 'Imagens e vídeos', icon: ImageIcon, requiredFields: [], fieldLabels: {} },
  { id: 'content', label: 'SEO & Textos', description: 'Meta tags e marketing', icon: Megaphone, requiredFields: [], fieldLabels: {} },
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
  const completedSteps = stepReady.filter(Boolean).length;
  const progressPercent = (completedSteps / steps.length) * 100;

  return (
    <div className="w-full" role="navigation" aria-label="Etapas do cadastro de produto">
      {/* Desktop Stepper */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between" role="tablist" aria-label="Etapas">
          {/* Progress line background */}
          <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-muted" />
          
          {/* Progress line filled */}
          <div
            className="absolute top-5 left-[5%] h-0.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent * 0.9}%` }}
          />

          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeIndex;
            const isDone = stepReady[i];
            const hasError = stepErrors[i] > 0;
            const hasMissing = showValidation && missingFields[i].length > 0;
            const isClickable = true;

            return (
              <div
                key={step.id}
                className={cn(
                  "relative z-10 flex flex-col items-center",
                  "flex-1 first:flex-initial last:flex-initial",
                  isClickable && "cursor-pointer group/step"
                )}
                onClick={() => onStepClick(i)}
                onMouseEnter={() => setHoveredStep(i)}
                onMouseLeave={() => setHoveredStep(null)}
                role="tab"
                aria-selected={isActive}
                aria-label={`${step.label}: ${isDone ? 'completo' : hasMissing ? 'campos pendentes' : 'incompleto'}`}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStepClick(i); }
                  if (e.key === 'ArrowRight' && i < steps.length - 1) { e.preventDefault(); onStepClick(i + 1); }
                  if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); onStepClick(i - 1); }
                }}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                    "font-semibold text-sm",
                    isDone && !isActive && "bg-primary/20 border-primary text-primary shadow-md shadow-primary/15",
                    isActive && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg shadow-primary/25 scale-110",
                    !isActive && !isDone && "bg-muted border-muted-foreground/30 text-muted-foreground",
                    hasMissing && !isActive && "border-amber-500 ring-2 ring-amber-500/20",
                    hasError && !isActive && "border-destructive ring-2 ring-destructive/20",
                    "group-hover/step:scale-110 group-hover/step:shadow-lg transition-transform"
                  )}
                >
                  {isDone && !isActive ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}

                  {/* Error/Missing badge */}
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
                </div>

                {/* Label + Description */}
                <div className="mt-2 text-center max-w-[100px]">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isActive && "text-primary",
                      isDone && !isActive && "text-foreground",
                      !isActive && !isDone && "text-muted-foreground",
                      "group-hover/step:text-primary"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {step.description}
                  </p>
                </div>

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
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stepper - Progress Bar */}
      <div className="md:hidden space-y-3">
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              {React.createElement(steps[activeIndex]?.icon || Info, { className: "h-4 w-4" })}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{steps[activeIndex]?.label}</p>
              <p className="text-xs text-muted-foreground">{steps[activeIndex]?.description}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Passo {activeIndex + 1} de {steps.length}
          </p>
        </div>
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex ? "w-6 bg-primary" : "w-1.5",
                stepReady[i] && i !== activeIndex && "bg-primary",
                !stepReady[i] && i !== activeIndex && "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
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
    register, handleSubmit, setValue, watch, trigger,
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

  // ============================================
  // AUTOSAVE — localStorage draft
  // ============================================
  const DRAFT_KEY = `product-draft-${productId || 'new'}`;
  const draftRestoredRef = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Restore draft on mount (only once)
  useEffect(() => {
    if (draftRestoredRef.current) return;
    draftRestoredRef.current = true;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { formData: Partial<ProductFormData>; images: string[]; stepIndex: number; savedAt: number };
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      const keys = Object.keys(draft.formData) as (keyof ProductFormData)[];
      keys.forEach((key) => {
        const val = draft.formData[key];
        if (val !== undefined) setValue(key, val as any);
      });
      if (draft.images?.length) setImages(draft.images);
      if (typeof draft.stepIndex === 'number') setStepIndex(draft.stepIndex);
      setHasDraft(true);
    } catch { /* ignore corrupt drafts */ }
  }, [DRAFT_KEY, setValue]);

  // Show draft restored notification
  useEffect(() => {
    if (!hasDraft) return;
    toast.info('Rascunho restaurado', {
      description: 'Seus dados não salvos foram recuperados automaticamente.',
      action: {
        label: 'Descartar',
        onClick: () => {
          localStorage.removeItem(DRAFT_KEY);
          window.location.reload();
        },
      },
      duration: 8000,
    });
  }, [hasDraft, DRAFT_KEY]);

  // Save draft with debounce (2s)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!formValues.name && !formValues.sku) return;
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          formData: formValues,
          images,
          stepIndex,
          savedAt: Date.now(),
        }));
      } catch { /* quota exceeded */ }
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [formValues, images, stepIndex, DRAFT_KEY]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
  }, [DRAFT_KEY]);

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
  // stepReady must match STEPS length (8 entries)
  const stepReady = useMemo(() => [
    /* essentials */      Boolean(formValues.supplier_id && formValues.sku && formValues.name),
    /* commercial */      Boolean((formValues.sale_price ?? 0) > 0),
    /* packaging */       Boolean(formValues.packing_type),
    /* fiscal */          Boolean(formValues.ncm_code || formValues.ean),
    /* engraving */       isEdit && !!productId,
    /* classification */  true, // optional section, always "ready"
    /* media */           images.length > 0 || Boolean(formValues.video_url),
    /* content (SEO) */   Boolean(formValues.meta_title || formValues.meta_description || formValues.key_benefits),
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

  // Keyboard shortcuts: Ctrl+S save, Ctrl+←/→ navigate steps
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

  const onFormSubmit = handleSubmit(async (data) => {
    if (skuStatus === 'duplicate') return;
    await onSubmit(data, images);
  });

  // Intercept submit: run full Zod validation via trigger(), then check missing fields
  const handleSubmitWithValidation = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1) Run full Zod validation via react-hook-form
    const isValid = await trigger();

    // 2) Also check custom missing-fields logic
    const totalMissing = missingFields.reduce((sum, arr) => sum + arr.length, 0);

    if (!isValid || totalMissing > 0) {
      setShowValidation(true);
      // Navigate to first step with missing fields (missingFields is always up-to-date)
      const firstBadStep = missingFields.findIndex(arr => arr.length > 0);
      if (firstBadStep >= 0 && firstBadStep !== stepIndex) {
        goStep(firstBadStep);
      }
      return;
    }

    // 3) All good — clear draft and submit
    clearDraft();
    handleSubmit(async (data) => {
      if (skuStatus === 'duplicate') return;
      await onSubmit(data, images);
    })(e);
  };

  const currentStep = STEPS[stepIndex];

  const renderContent = () => {
    switch (currentStep.id) {
      case 'category':
        return (
          <SectionCard id="category" title="Categoria" icon={Layers} subtitle="Classificação principal do produto no catálogo">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <CategorySelect value={formValues.category_id || ''} onChange={(id) => setValue('category_id', id)} error={errors.category_id?.message} />
              </div>
              <NewCategoryDialog onCreated={(id) => setValue('category_id', id)} />
            </div>
          </SectionCard>
        );
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
            <ProductDimensionsSection {...formProps} isBoxProduct={isBoxProduct} />
            <ProductSupplierSourcesSection
              productId={productId}
              isEdit={isEdit}
              primarySupplierId={supplierId}
              primarySupplierName={formValues.brand || ''}
            />
          </>
        );
      case 'commercial':
        return (
          <>
            <ProductFlagsSection setValue={setValue} flags={flags} />
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
                      <FieldLabel htmlFor="gender" hint="Gênero do público-alvo do produto">Gênero</FieldLabel>
                      <Select value={formValues.gender || ''} onValueChange={(v) => setValue('gender', v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unissex">Unissex</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="infantil">Infantil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                }
              />
          </Suspense>
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