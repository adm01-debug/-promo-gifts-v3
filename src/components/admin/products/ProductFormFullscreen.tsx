/**
 * ProductFormFullscreen — Orchestrator component
 * 
 * Slim orchestrator that composes modular section components.
 * Heavy sections (Classification, Media) are lazy-loaded.
 * All inline sections extracted to src/components/admin/products/sections/
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { FieldLabel } from './ProductFormHelpers';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Info,
  Ruler,
  Package,
  Tag,
  ImageIcon,
  Layers,
  Megaphone,
  AlertCircle,
  Globe,
  Search,
  FileText,
  ShieldCheck,
  Save,
  X,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

// Extracted section components
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

// Lazy-loaded heavy sections
const ProductClassificationSection = lazyWithRetry(() => import('./sections/ProductClassificationSection'));
const ProductMediaSection = lazyWithRetry(() => import('./sections/ProductMediaSection'));

// Section loading fallback
function SectionSkeleton() {
  return (
    <Card className="border-border/50 bg-card/60 overflow-hidden">
      <div className="p-5 pb-4 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="p-5 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
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

type SectionId = 'info' | 'price' | 'flags' | 'dimensions' | 'packaging' | 'fiscal' | 'seo' | 'marketing' | 'classification' | 'media';

interface SectionDef {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  group: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'info', label: 'Informações', icon: Info, group: 'Básico' },
  { id: 'dimensions', label: 'Dimensões', icon: Ruler, group: 'Básico' },
  { id: 'price', label: 'Preço e Estoque', icon: Tag, group: 'Básico' },
  { id: 'flags', label: 'Status', icon: ShieldCheck, group: 'Básico' },
  { id: 'packaging', label: 'Embalagem', icon: Package, group: 'Detalhes' },
  { id: 'fiscal', label: 'Fiscal', icon: FileText, group: 'Detalhes' },
  { id: 'seo', label: 'SEO', icon: Globe, group: 'Marketing' },
  { id: 'marketing', label: 'Textos', icon: Megaphone, group: 'Marketing' },
  { id: 'classification', label: 'Classificação', icon: Layers, group: 'Vínculos' },
  { id: 'media', label: 'Mídia', icon: ImageIcon, group: 'Vínculos' },
];

// ============================================
// MAIN COMPONENT
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
  // --- State ---
  const [images, setImages] = useState<string[]>(initialImages);
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(isEdit);
  const [supplierMarkup, setSupplierMarkup] = useState<number | null>(null);
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(isEdit);
  const [costPriceDisplay, setCostPriceDisplay] = useState('');
  const [salePriceDisplay, setSalePriceDisplay] = useState('');
  const [activeSection, setActiveSection] = useState<SectionId>('info');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [showPreview, setShowPreview] = useState(() => {
    const stored = localStorage.getItem('product-form-show-preview');
    return stored !== null ? stored === 'true' : true;
  });

  // --- Form ---
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

  // --- Watched values ---
  const supplierId = watch('supplier_id');
  const isKit = watch('is_kit');
  const packingType = watch('packing_type') || '';
  const isBoxProduct = packingType.toLowerCase().includes('caixa');
  const skuValue = watch('sku') || '';
  const nameValue = watch('name') || '';
  const salePriceValue = watch('sale_price') ?? 0;
  const costPriceValue = watch('cost_price') ?? 0;
  const stockQuantityValue = watch('stock_quantity') ?? 0;
  const brandValue = watch('brand') || '';
  const supplierRefValue = watch('supplier_reference') || '';

  // Flags
  const flags: Record<string, boolean> = {
    is_active: watch('is_active'),
    is_featured: watch('is_featured'),
    is_bestseller: watch('is_bestseller'),
    is_new: watch('is_new'),
    is_on_sale: watch('is_on_sale'),
    is_kit: isKit,
    is_imported: watch('is_imported'),
    is_textil: watch('is_textil'),
    is_thermal: watch('is_thermal'),
    allows_personalization: watch('allows_personalization'),
    has_gift_box: watch('has_gift_box'),
    has_optional_packaging: watch('has_optional_packaging'),
    has_commercial_packaging: watch('has_commercial_packaging'),
  };

  const { status: skuStatus, duplicateName } = useSkuValidation(skuValue, isEdit, initialData?.sku);

  // --- Effects ---

  // Auto-copy supplier ref to SKU
  const prevSupplierRef = React.useRef(supplierRefValue);
  React.useEffect(() => {
    if (!skuManuallyEdited && !isEdit && supplierRefValue) {
      setValue('sku', supplierRefValue, { shouldValidate: true });
    }
    prevSupplierRef.current = supplierRefValue;
  }, [supplierRefValue, skuManuallyEdited, isEdit, setValue]);

  // Sync display states on load
  React.useEffect(() => {
    if (costPriceValue && costPriceValue > 0 && !costPriceDisplay) {
      setCostPriceDisplay(costPriceValue.toFixed(2));
    }
  }, [costPriceValue]);

  React.useEffect(() => {
    if (salePriceValue && salePriceValue > 0 && !salePriceDisplay) {
      setSalePriceDisplay(salePriceValue.toFixed(2));
    }
  }, [salePriceValue]);

  // Auto-calculate suggested/sale price from markup
  React.useEffect(() => {
    if (!supplierMarkup || !costPriceValue || costPriceValue <= 0) return;
    const markupMultiplier = 1 + (supplierMarkup / 100);
    const calculatedPrice = Math.round(costPriceValue * markupMultiplier * 100) / 100;
    setValue('suggested_price', calculatedPrice);
    if (!priceManuallyEdited) {
      setValue('sale_price', calculatedPrice);
      setSalePriceDisplay(calculatedPrice.toFixed(2));
    }
  }, [costPriceValue, supplierMarkup, priceManuallyEdited, setValue]);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.getElementById('product-form-content');
      if (!scrollContainer) return;
      for (const section of SECTIONS) {
        const el = document.getElementById(`section-${section.id}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom > 200) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    const container = document.getElementById('product-form-content');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // --- Handlers ---
  const onFormSubmit = handleSubmit(async (data) => {
    if (skuStatus === 'duplicate') return;
    await onSubmit(data, images);
  });

  const numericProps = (name: keyof ProductFormData) => ({
    ...register(name, { valueAsNumber: true }),
    type: 'number' as const,
    step: name.includes('price') ? '0.01' : '1',
  });

  const scrollToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const errorCount = Object.keys(errors).length;

  const groups = SECTIONS.reduce<Record<string, SectionDef[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  // Shared props for form sections
  const formProps = { register, setValue, watch, errors, numericProps };

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col">
      <div className="flex gap-6">
        {/* ====== SIDEBAR NAVIGATION ====== */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24 space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                type="text"
                placeholder="Buscar seção..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-accent/30 border-border/30 placeholder:text-muted-foreground/40"
              />
            </div>

            {Object.entries(groups).map(([groupName, sections]) => {
              const filtered = sidebarSearch
                ? sections.filter((s) => s.label.toLowerCase().includes(sidebarSearch.toLowerCase()))
                : sections;
              if (filtered.length === 0) return null;
              return (
                <div key={groupName}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5 px-2">
                    {groupName}
                  </p>
                  <nav className="space-y-0.5">
                    {filtered.map((section) => {
                      const Icon = section.icon;
                      const isActive2 = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => { scrollToSection(section.id); setSidebarSearch(''); }}
                          className={cn(
                            'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                            isActive2
                              ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent',
                          )}
                        >
                          <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive2 ? 'text-primary' : 'text-muted-foreground/60')} />
                          <span className="truncate">{section.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              );
            })}

            <div className="pt-3 border-t border-border/30 space-y-2">
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-destructive text-[11px] font-medium px-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {errorCount} erro(s)
                </div>
              )}
              <Button type="submit" disabled={isSaving || skuStatus === 'duplicate'} className="w-full gap-2 font-semibold shadow-sm" size="sm">
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isEdit ? 'Salvar' : 'Criar Produto'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="w-full text-xs">Cancelar</Button>
            </div>
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div id="product-form-content" className="flex-1 min-w-0 space-y-5 pb-24">
          <ProductSupplierSection
            supplierId={supplierId || ''}
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

          <ProductPackagingSection {...formProps} />

          <ProductFiscalSection {...formProps} />

          <ProductSeoSection {...formProps} />

          <ProductMarketingTextsSection register={register} />

          {/* Lazy sections */}
          <Suspense fallback={<SectionSkeleton />}>
            <ProductClassificationSection
              productId={productId}
              isEdit={isEdit}
              isKit={isKit}
              productName={watch('name')}
              productSku={watch('sku')}
              internalDimensions={{
                height_cm: watch('internal_height_cm') ?? null,
                width_cm: watch('internal_width_cm') ?? null,
                length_cm: watch('internal_length_cm') ?? null,
              }}
              genderField={
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* ====== PREVIEW TOGGLE ====== */}
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

      {/* ====== MOBILE BOTTOM BAR ====== */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background/95 backdrop-blur-sm border-t border-border/50 p-3 z-40">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          {errorCount > 0 && (
            <span className="text-destructive text-xs font-medium flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errorCount} erro(s)
            </span>
          )}
          <Button type="submit" size="sm" disabled={isSaving || skuStatus === 'duplicate'} className="gap-2 font-semibold shadow-sm">
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
