/**
 * ProductFormFullscreen — Formulário full-screen com sidebar de navegação vertical
 * Layout de 3 colunas: sidebar de seções à esquerda + conteúdo no centro + preview à direita
 *
 * Heavy sections (Classification, Media) are lazy-loaded to reduce initial bundle.
 */

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormData, defaultFormValues } from './ProductFormSchema';
import { CategorySelect } from './CategorySelect';
import { SupplierSelect } from './SupplierSelect';
import { NewSupplierDialog } from './NewSupplierDialog';
import { ProductPreviewPanel } from './ProductPreviewPanel';
import { FieldLabel, SectionCard } from './ProductFormHelpers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Loader2,
  Info,
  Ruler,
  Package,
  Tag,
  ImageIcon,
  Layers,
  Truck,
  Megaphone,
  AlertCircle,
  CheckCircle2,
  Globe,
  Search,
  FileText,
  ShieldCheck,
  Save,
  X,
  Plus,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

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

type SectionId = 'info' | 'price' | 'commercial' | 'flags' | 'dimensions' | 'packaging' | 'fiscal' | 'logistics' | 'seo' | 'marketing' | 'classification' | 'media';

interface SectionDef {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  group: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'info', label: 'Informações', icon: Info, group: 'Básico' },
  { id: 'price', label: 'Preço e Estoque', icon: Tag, group: 'Básico' },
  { id: 'commercial', label: 'Comercial', icon: Truck, group: 'Básico' },
  { id: 'flags', label: 'Status', icon: ShieldCheck, group: 'Básico' },
  { id: 'dimensions', label: 'Dimensões', icon: Ruler, group: 'Detalhes' },
  { id: 'packaging', label: 'Embalagem', icon: Package, group: 'Detalhes' },
  { id: 'fiscal', label: 'Fiscal', icon: FileText, group: 'Detalhes' },
  { id: 'logistics', label: 'Logística', icon: Truck, group: 'Detalhes' },
  { id: 'seo', label: 'SEO', icon: Globe, group: 'Marketing' },
  { id: 'marketing', label: 'Textos', icon: Megaphone, group: 'Marketing' },
  { id: 'classification', label: 'Classificação', icon: Layers, group: 'Vínculos' },
  { id: 'media', label: 'Mídia', icon: ImageIcon, group: 'Vínculos' },
];

// ============================================
// SKU VALIDATION HOOK
// ============================================

function useSkuValidation(currentSku: string, isEdit: boolean, originalSku?: string) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'duplicate'>('idle');
  const [duplicateName, setDuplicateName] = useState('');

  useEffect(() => {
    if (!currentSku || currentSku.length < 2) { setStatus('idle'); return; }
    if (isEdit && currentSku === originalSku) { setStatus('valid'); return; }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { fetchPromobrindProducts } = await import('@/lib/external-db');
        const existing = await fetchPromobrindProducts({ search: currentSku, limit: 5 });
        const products = Array.isArray(existing) ? existing : (existing as Record<string, unknown>).products || [];
        const dup = products.find((p: any) => p.sku?.toLowerCase() === currentSku.toLowerCase());
        if (dup) { setStatus('duplicate'); setDuplicateName(dup.name || ''); }
        else { setStatus('valid'); setDuplicateName(''); }
      } catch { setStatus('idle'); }
    }, 600);
    return () => clearTimeout(timer);
  }, [currentSku, isEdit, originalSku]);

  return { status, duplicateName };
}

// ============================================
// NEW CATEGORY DIALOG
// ============================================

function NewCategoryDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; parent_id: string | null }>>([]);
  const [loadingCats, setLoadingCats] = useState(false);

  const loadCategories = async () => {
    if (categories.length > 0) return;
    setLoadingCats(true);
    try {
      const { invokeExternalDb } = await import('@/lib/external-db');
      const result = await invokeExternalDb<{ id: string; name: string; parent_id: string | null }>({
        table: 'categories',
        operation: 'select',
        filters: { is_active: true },
        orderBy: 'name',
      });
      setCategories(result || []);
    } catch {
      // silent
    } finally {
      setLoadingCats(false);
    }
  };

  const categoryOptions = useMemo(() => {
    const map = new Map(categories.map(c => [c.id, c]));
    const getPath = (id: string): string => {
      const parts: string[] = [];
      let current = map.get(id);
      while (current) {
        parts.unshift(current.name);
        current = current.parent_id ? map.get(current.parent_id) : undefined;
      }
      return parts.join(' › ');
    };
    return categories
      .map(c => ({ id: c.id, label: getPath(c.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { invokeExternalDbSingle } = await import('@/lib/external-db');
      const result = await invokeExternalDbSingle<{ id: string }>({
        table: 'categories',
        operation: 'insert',
        data: {
          name: name.trim(),
          slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          is_active: true,
          parent_id: parentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });
      if (result?.id) {
        onCreated(result.id);
        toast.success(`Categoria "${name.trim()}" criada com sucesso`);
        setOpen(false);
        setName('');
        setParentId(null);
        setCategories([]);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar categoria');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadCategories(); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0 h-9">
          <Plus className="h-3.5 w-3.5" />
          Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Categoria</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label htmlFor="new-category-parent" className="text-xs font-semibold">Categoria Pai</Label>
            <select
              id="new-category-parent"
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              disabled={loadingCats}
            >
              <option value="">Nenhuma (raiz)</option>
              {categoryOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground mt-1">Deixe vazio para criar na raiz</p>
          </div>
          <div>
            <Label htmlFor="new-category-name" className="text-xs font-semibold">
              Nome da Categoria <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Canecas Térmicas"
              className="mt-1.5 h-9"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" size="sm" disabled={!name.trim() || saving} onClick={handleCreate} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Criar Categoria
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  const [images, setImages] = useState<string[]>(initialImages);
  const [activeSection, setActiveSection] = useState<SectionId>('info');
  const [sidebarSearch, setSidebarSearch] = useState('');
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

  const skuValue = watch('sku') || '';
  const nameValue = watch('name') || '';
  const descValue = watch('description') || '';
  const shortDescValue = watch('short_description') || '';
  const metaDescValue = watch('meta_description') || '';
  const supplierRefValue = watch('supplier_reference') || '';
  const metaTitleValue = watch('meta_title') || '';
  const metaKeywordsValue = watch('meta_keywords') || '';
  const salePriceValue = watch('sale_price') ?? 0;
  const stockQuantityValue = watch('stock_quantity') ?? 0;
  const brandValue = watch('brand') || '';

  const { status: skuStatus, duplicateName } = useSkuValidation(skuValue, isEdit, initialData?.sku);

  const onFormSubmit = handleSubmit(async (data) => {
    if (skuStatus === 'duplicate') return;
    await onSubmit(data, images);
  });

  const numericProps = (name: keyof ProductFormData) => ({
    ...register(name, { valueAsNumber: true }),
    type: 'number' as const,
    step: name.includes('price') ? '0.01' : '1',
  });

  const flagCount = [isActive, isFeatured, isBestseller, isNew, isOnSale, isKit, hasCommercialPackaging, isImported, isTextil, isThermal, allowsPersonalization, hasGiftBox, hasOptionalPackaging].filter(Boolean).length;

  // Scroll to section
  const scrollToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    const el = document.getElementById(`section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Track active section on scroll
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

  const errorCount = Object.keys(errors).length;

  const groups = SECTIONS.reduce<Record<string, SectionDef[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

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

          {/* === FORNECEDOR === */}
          <Card className="border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Fornecedor</h3>
                  <p className="text-[11px] text-muted-foreground">Selecione ou cadastre o fornecedor do produto</p>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <SupplierSelect value={supplierId || ''} onChange={(id) => setValue('supplier_id', id)} error={errors.supplier_id?.message} />
                </div>
                <NewSupplierDialog onCreated={(id) => setValue('supplier_id', id)} />
              </div>
            </div>
          </Card>

          {/* === INFORMAÇÕES BÁSICAS === */}
          <SectionCard id="info" title="Informações Básicas" icon={Info} subtitle="SKU, nome, descrição, marca e categoria">
            {/* 1 - Nome do Produto */}
            <div>
              <FieldLabel htmlFor="name" required charCount={nameValue.length} charMax={300}>Nome do Produto</FieldLabel>
              <Input id="name" {...register('name')} placeholder="Nome do produto" className={cn('h-9', errors.name && 'border-destructive')} />
              {errors.name && <p className="text-[10px] text-destructive mt-1">{errors.name.message}</p>}
            </div>

            {/* 2 - SKU Fornecedor | 3 - SKU Interno */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="supplier_reference" charCount={supplierRefValue.length} charMax={100}>SKU do Fornecedor</FieldLabel>
                <Input id="supplier_reference" {...register('supplier_reference')} placeholder="Ex: FORN-12345" className="font-mono h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="sku" required charCount={skuValue.length} charMax={50}>SKU Interno</FieldLabel>
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
                        <TooltipTrigger asChild><AlertCircle className="h-3.5 w-3.5 text-destructive" /></TooltipTrigger>
                        <TooltipContent className="text-xs">SKU já usado em "{duplicateName}"</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {errors.sku && <p className="text-[10px] text-destructive mt-1">{errors.sku.message}</p>}
                {skuStatus === 'duplicate' && <p className="text-[10px] text-destructive mt-1">SKU duplicado: "{duplicateName}"</p>}
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="description" charCount={descValue.length} charMax={5000}>Descrição Completa</FieldLabel>
              <Textarea id="description" {...register('description')} placeholder="Descrição detalhada do produto" rows={4} className="text-sm resize-y min-h-[80px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="short_description" charCount={shortDescValue.length} charMax={500}>Descrição Curta</FieldLabel>
                <Input id="short_description" {...register('short_description')} placeholder="Resumo em uma linha" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="meta_description" charCount={metaDescValue.length} charMax={500}>Meta Descrição (SEO)</FieldLabel>
                <Input id="meta_description" {...register('meta_description')} placeholder="Descrição para buscadores" className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="brand">Marca</FieldLabel>
                <Input id="brand" {...register('brand')} placeholder="Ex: Tramontina" className="h-9" />
              </div>
              <div>
                <FieldLabel>Categoria</FieldLabel>
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <CategorySelect value={categoryId || ''} onChange={(id) => setValue('category_id', id)} error={errors.category_id?.message} />
                  </div>
                  <NewCategoryDialog onCreated={(id) => setValue('category_id', id)} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="lead_time_days">Prazo Entrega (dias)</FieldLabel>
                <Input id="lead_time_days" {...numericProps('lead_time_days')} min="0" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="supply_mode">Modo de Fornecimento</FieldLabel>
                <Input id="supply_mode" {...register('supply_mode')} placeholder="Ex: pronta_entrega_liso" className="h-9" />
              </div>
            </div>
          </SectionCard>

          {/* === PREÇO E ESTOQUE === */}
          <SectionCard id="price" title="Preço e Estoque" icon={Tag} subtitle={`Preço atual: R$ ${(watch('sale_price') ?? 0).toFixed(2)}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <FieldLabel htmlFor="cost_price">Preço Custo (R$)</FieldLabel>
                <Input id="cost_price" {...numericProps('cost_price')} min="0" step="0.01" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="suggested_price">Preço Sugerido (R$)</FieldLabel>
                <Input id="suggested_price" {...numericProps('suggested_price')} min="0" step="0.01" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="sale_price" required>Preço Venda (R$)</FieldLabel>
                <Input id="sale_price" {...numericProps('sale_price')} min="0" step="0.01" className={cn('h-9', errors.sale_price && 'border-destructive')} />
                {errors.sale_price && <p className="text-[10px] text-destructive mt-1">{errors.sale_price.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <FieldLabel htmlFor="stock_quantity">Estoque</FieldLabel>
                <Input id="stock_quantity" {...numericProps('stock_quantity')} min="0" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="stock_unit">Unidade</FieldLabel>
                <Input id="stock_unit" {...register('stock_unit')} placeholder="un" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="min_quantity" hint="Quantidade mínima que o cliente precisa comprar desse produto no pedido">Qtd. Mín. Venda</FieldLabel>
                <Input id="min_quantity" {...numericProps('min_quantity')} min="1" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="min_order_quantity" hint="Quantidade mínima exigida pelo fornecedor para compra/reposição">Qtd. Mín. Compra</FieldLabel>
                <Input id="min_order_quantity" {...numericProps('min_order_quantity')} min="0" className="h-9" />
              </div>
            </div>
          </SectionCard>

          {/* === COMERCIAL === */}
          <SectionCard id="commercial" title="Comercial" icon={Truck} subtitle="Gênero e classificação comercial">
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
          </SectionCard>

          {/* === STATUS E DESTAQUES === */}
          <SectionCard id="flags" title="Status e Destaques" icon={ShieldCheck} subtitle={`${flagCount} ativos`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
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
                { key: 'has_commercial_packaging' as const, label: 'Embalagem Nativa', value: hasCommercialPackaging },
              ].map(({ key, label, value, activeClass }) => {
                const toggle = () => setValue(key, !value);
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between rounded-lg border p-3 transition-all duration-200 cursor-pointer hover:bg-accent/30',
                      value ? (activeClass || 'bg-primary/5 border-primary/20') : 'border-border/50',
                    )}
                    onClick={toggle}
                  >
                    <Label className="cursor-pointer text-xs font-medium">{label}</Label>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Switch checked={value} onCheckedChange={toggle} />
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {/* === DIMENSÕES === */}
          <SectionCard id="dimensions" title="Dimensões" icon={Ruler} subtitle="Dimensões externas e internas do produto">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">Externas</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                { id: 'height_cm', label: 'Altura (cm)' },
                { id: 'width_cm', label: 'Largura (cm)' },
                { id: 'length_cm', label: 'Comprimento (cm)' },
                { id: 'diameter_cm', label: 'Diâmetro (cm)' },
                { id: 'circumference_cm', label: 'Circunferência (cm)' },
                { id: 'weight_g', label: 'Peso (g)' },
                { id: 'capacity_ml', label: 'Capacidade (ml)' },
              ].map(({ id: fId, label }) => (
                <div key={fId}>
                  <FieldLabel htmlFor={fId}>{label}</FieldLabel>
                  <Input id={fId} {...numericProps(fId as keyof ProductFormData)} min="0" step="0.1" className="h-9" />
                </div>
              ))}
            </div>
            <div className="border-t border-border/30 pt-4 mt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">Internas</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { id: 'internal_height_cm', label: 'Altura Int. (cm)' },
                  { id: 'internal_width_cm', label: 'Largura Int. (cm)' },
                  { id: 'internal_length_cm', label: 'Comprim. Int. (cm)' },
                  { id: 'internal_diameter_cm', label: 'Diâmetro Int. (cm)' },
                ].map(({ id: fId, label }) => (
                  <div key={fId}>
                    <FieldLabel htmlFor={fId}>{label}</FieldLabel>
                    <Input id={fId} {...numericProps(fId as keyof ProductFormData)} min="0" step="0.1" className="h-9" />
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* === EMBALAGEM === */}
          <SectionCard id="packaging" title="Embalagem (Caixa)" icon={Package} subtitle="Dimensões e especificações da embalagem">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="packing_type">Tipo de Embalagem</FieldLabel>
                <Input id="packing_type" {...register('packing_type')} placeholder="Ex: Caixa, Bolsa, Estojo" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="packaging_material">Material Embalagem</FieldLabel>
                <Input id="packaging_material" {...register('packaging_material')} placeholder="Ex: Papelão, Plástico" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="packaging_color">Cor Embalagem</FieldLabel>
                <Input id="packaging_color" {...register('packaging_color')} placeholder="Ex: Kraft, Branco" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="packaging_finish">Acabamento Embalagem</FieldLabel>
                <Input id="packaging_finish" {...register('packaging_finish')} placeholder="Ex: Fosco, Brilhante" className="h-9" />
              </div>
            </div>
          </SectionCard>

          {/* === FISCAL === */}
          <SectionCard id="fiscal" title="Dados Fiscais" icon={FileText} subtitle="NCM, EAN, GTIN, IPI, ICMS, PIS/COFINS e origem">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="ncm_code" hint="Nomenclatura Comum do Mercosul — código de 8 dígitos usado na classificação fiscal">Código NCM</FieldLabel>
                <Input id="ncm_code" {...register('ncm_code')} placeholder="Ex: 96081000" className="font-mono h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="cest" hint="Código Especificador da Substituição Tributária">CEST</FieldLabel>
                <Input id="cest" {...register('cest')} placeholder="Ex: 2000100" className="font-mono h-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="ean" hint="Código de barras padrão europeu (13 dígitos)">Código EAN</FieldLabel>
                <Input id="ean" {...register('ean')} placeholder="Código de barras EAN" className="font-mono h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="gtin" hint="Global Trade Item Number — identificação global do produto">GTIN</FieldLabel>
                <Input id="gtin" {...register('gtin')} placeholder="Global Trade Item Number" className="font-mono h-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="cfop" hint="Código Fiscal de Operações e Prestações — ex: 5102 (venda dentro do estado)">CFOP</FieldLabel>
                <Input id="cfop" {...register('cfop')} placeholder="Ex: 5102" className="font-mono h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="csosn" hint="Código de Situação da Operação no Simples Nacional">CSOSN</FieldLabel>
                <Input id="csosn" {...register('csosn')} placeholder="Ex: 102" className="font-mono h-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <FieldLabel htmlFor="ipi_rate" hint="Imposto sobre Produtos Industrializados">Alíquota IPI (%)</FieldLabel>
                <Input id="ipi_rate" {...numericProps('ipi_rate')} min="0" step="0.01" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="icms_rate" hint="Imposto sobre Circulação de Mercadorias e Serviços">Alíquota ICMS (%)</FieldLabel>
                <Input id="icms_rate" {...numericProps('icms_rate')} min="0" step="0.01" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="pis_rate" hint="Programa de Integração Social">Alíquota PIS (%)</FieldLabel>
                <Input id="pis_rate" {...numericProps('pis_rate')} min="0" step="0.01" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <FieldLabel htmlFor="cofins_rate" hint="Contribuição para o Financiamento da Seguridade Social">Alíquota COFINS (%)</FieldLabel>
                <Input id="cofins_rate" {...numericProps('cofins_rate')} min="0" step="0.01" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="tax_regime" hint="Regime tributário aplicável ao produto">Regime Tributário</FieldLabel>
                <select
                  id="tax_regime"
                  {...register('tax_regime')}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  <option value="simples_nacional">Simples Nacional</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                  <option value="mei">MEI</option>
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="country_of_origin">País de Origem</FieldLabel>
                <Input id="country_of_origin" {...register('country_of_origin')} placeholder="Ex: Brasil, China" className="h-9" />
              </div>
            </div>
          </SectionCard>

          {/* === LOGÍSTICA === */}
          <SectionCard id="logistics" title="Logística e Frete" icon={Truck} subtitle="Classe de frete, cubagem e transportadora">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="freight_class" hint="Classe de frete para cálculo — ex: Normal, Pesado, Frágil">Classe de Frete</FieldLabel>
                <select
                  id="freight_class"
                  {...register('freight_class')}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Selecione...</option>
                  <option value="normal">Normal</option>
                  <option value="pesado">Pesado</option>
                  <option value="fragil">Frágil</option>
                  <option value="perigoso">Perigoso</option>
                  <option value="refrigerado">Refrigerado</option>
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="default_carrier" hint="Transportadora padrão para envio desse produto">Transportadora Padrão</FieldLabel>
                <Input id="default_carrier" {...register('default_carrier')} placeholder="Ex: Correios, Jadlog" className="h-9" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider pt-2">Dimensões de Envio</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <FieldLabel htmlFor="shipping_weight_kg" hint="Peso real do produto embalado para envio">Peso (kg)</FieldLabel>
                <Input id="shipping_weight_kg" {...numericProps('shipping_weight_kg')} min="0" step="0.01" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="shipping_width_cm">Largura (cm)</FieldLabel>
                <Input id="shipping_width_cm" {...numericProps('shipping_width_cm')} min="0" step="0.1" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="shipping_height_cm">Altura (cm)</FieldLabel>
                <Input id="shipping_height_cm" {...numericProps('shipping_height_cm')} min="0" step="0.1" className="h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="shipping_length_cm">Comprimento (cm)</FieldLabel>
                <Input id="shipping_length_cm" {...numericProps('shipping_length_cm')} min="0" step="0.1" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="cubic_weight" hint="Peso cubado = (L × A × C) / 6000 — usado pelas transportadoras para cálculo de frete">Peso Cubado (kg)</FieldLabel>
                <Input id="cubic_weight" {...numericProps('cubic_weight')} min="0" step="0.01" className="h-9" />
              </div>
              <div className="flex items-end gap-3 pb-1">
                <Switch
                  id="requires_special_shipping"
                  checked={watch('requires_special_shipping')}
                  onCheckedChange={(v) => setValue('requires_special_shipping', v)}
                />
                <Label htmlFor="requires_special_shipping" className="text-sm cursor-pointer">Requer frete especial</Label>
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="shipping_notes" hint="Observações sobre transporte, cuidados ou restrições de envio">Observações de Envio</FieldLabel>
              <Textarea id="shipping_notes" {...register('shipping_notes')} placeholder="Instruções especiais para envio..." rows={2} className="text-sm resize-y" />
            </div>
          </SectionCard>

          {/* === SEO === */}
          <SectionCard id="seo" title="SEO e Metadados" icon={Globe} subtitle="Otimize o produto para buscadores">
            <div>
              <FieldLabel htmlFor="meta_title" charCount={metaTitleValue.length} charMax={200}>Meta Título</FieldLabel>
              <Input id="meta_title" {...register('meta_title')} placeholder="Título para buscadores (Google)" className="h-9" />
            </div>
            <div>
              <FieldLabel htmlFor="meta_keywords" charCount={metaKeywordsValue.length} charMax={500}>Palavras-chave (separadas por vírgula)</FieldLabel>
              <Input id="meta_keywords" {...register('meta_keywords')} placeholder="caneta, brinde, personalizado" className="h-9" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="slug">Slug (URL)</FieldLabel>
                <Input id="slug" {...register('slug')} placeholder="caneta-plastica-001" className="font-mono h-9" />
              </div>
              <div>
                <FieldLabel htmlFor="canonical_url">URL Canônica</FieldLabel>
                <Input id="canonical_url" {...register('canonical_url')} placeholder="/produto/caneta-001" className="font-mono h-9" />
              </div>
            </div>
          </SectionCard>

          {/* === MARKETING TEXTS === */}
          <SectionCard id="marketing" title="Textos de Marketing" icon={Megaphone} subtitle="Benefícios e casos de uso">
            <div>
              <FieldLabel htmlFor="key_benefits">Benefícios Principais</FieldLabel>
              <Textarea id="key_benefits" {...register('key_benefits')} placeholder="Liste os benefícios do produto" rows={3} className="text-sm resize-y" />
            </div>
            <div>
              <FieldLabel htmlFor="use_cases">Casos de Uso</FieldLabel>
              <Textarea id="use_cases" {...register('use_cases')} placeholder="Cenários e ocasiões de uso" rows={3} className="text-sm resize-y" />
            </div>
          </SectionCard>

          {/* === CLASSIFICAÇÃO (LAZY) === */}
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
            />
          </Suspense>

          {/* === MÍDIA (LAZY) === */}
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
                  isFeatured={isFeatured}
                  isNew={isNew}
                  isOnSale={isOnSale}
                  isKit={isKit}
                  isActive={isActive}
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
