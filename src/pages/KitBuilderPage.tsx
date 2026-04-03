/**
 * Kit Builder Page — Redesigned
 * Layout moderno com header sticky, stepper animado, sidebar contextual e navegação bottom
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Package, ArrowLeft, ArrowRight, RotateCcw, Save, Loader2, Undo2, Redo2, Cloud, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadKitPDF } from '@/utils/kitPdfGenerator';
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/kit-builder';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKitBuilder } from '@/hooks/useKitBuilder';
import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';
import { useKitAutoSave } from '@/hooks/useKitAutoSave';
import { useKitUndoRedo } from '@/hooks/useKitUndoRedo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { invokeExternalDb } from '@/lib/external-db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  WizardSteps,
  BoxSelector,
  ItemSelector,
  VolumeIndicator,
  PersonalizationConfig,
  KitSummary,
} from '@/components/kit-builder';
import { KitSmartSuggestions } from '@/components/kit-builder/KitSmartSuggestions';
import { FreightEstimator } from '@/components/kit-builder/FreightEstimator';
import { KitTemplates } from '@/components/kit-builder/KitTemplates';
import { KitMiniPreview } from '@/components/kit-builder/KitMiniPreview';
import { KitTypeCards } from '@/components/kit-builder/KitTypeCards';
import type { KitTemplate } from '@/components/kit-builder/KitTemplates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transformToKitItem } from '@/hooks/useKitBuilderTransformers';

const STEP_LABELS: Record<string, string> = {
  box: 'Caixa',
  items: 'Itens',
  personalization: 'Personalização',
  summary: 'Resumo',
};

const STEPS_ORDER = ['box', 'items', 'personalization', 'summary'];

// Slide animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
  }),
};

export default function KitBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kitIdParam = searchParams.get('kit');
  const productIdParam = searchParams.get('product');
  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const hasLoadedRef = useRef(false);
  const hasLoadedProductRef = useRef(false);
  const [slideDirection, setSlideDirection] = useState(0);
  const prevStepRef = useRef('box');
  
  const {
    kitState,
    setKitType,
    wizardState,
    kitQuantity,
    availableBoxes,
    availableItems,
    isLoadingBoxes,
    isLoadingItems,
    boxFilters,
    setBoxFilters,
    itemFilters,
    setItemFilters,
    setKitName,
    selectBox,
    clearBox,
    addItem,
    removeItem,
    updateItemQuantity,
    updateItemVariant,
    reorderItems,
    setItemPersonalization,
    setBoxPersonalization,
    setKitQuantity,
    goToStep,
    nextStep,
    prevStep,
    resetKit,
    loadKit,
  } = useKitBuilder();

  const { saveKit, isSaving } = useCustomKitPersistence();

  // Auto-save
  const { lastSavedAt, isSaving: isAutoSaving, autoSavedKitId } = useKitAutoSave(
    kitState, kitQuantity, currentKitId,
    (id) => setCurrentKitId(id),
  );

  // Undo/Redo
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useKitUndoRedo();

  // Track slide direction
  useEffect(() => {
    const prevIdx = STEPS_ORDER.indexOf(prevStepRef.current);
    const currIdx = STEPS_ORDER.indexOf(wizardState.currentStep);
    setSlideDirection(currIdx > prevIdx ? 1 : -1);
    prevStepRef.current = wizardState.currentStep;
  }, [wizardState.currentStep]);

  // Track state changes for undo
  useEffect(() => {
    pushSnapshot({
      boxId: kitState.box?.id || null,
      items: kitState.items.map(i => ({ id: i.id, quantity: i.quantity, sku: i.sku })),
      personalizationKeys: Object.keys(kitState.personalization.items),
      name: kitState.name,
      kitQuantity,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitState.box?.id, kitState.items.length, kitState.name, kitQuantity]);

  // Load saved kit from ?kit= param
  useEffect(() => {
    if (!kitIdParam || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadSavedKit = async () => {
      try {
        const { data, error } = await supabase
          .from('custom_kits')
          .select('*')
          .eq('id', kitIdParam)
          .maybeSingle();

        if (error || !data) {
          toast.error('Kit não encontrado');
          return;
        }

        loadKit({
          name: data.name || '',
          kitType: (data.kit_type as string) || 'montado',
          box: data.box_data as Record<string, unknown>,
          items: (data.items_data as unknown[]) || [],
          personalization: (data.personalization_data as Record<string, unknown>) || { box: { enabled: false }, items: {} },
          kitQuantity: data.kit_quantity || 1,
        });

        toast.success('Kit carregado para edição');
      } catch {
        toast.error('Erro ao carregar kit');
      }
    };

    loadSavedKit();
  }, [kitIdParam, loadKit]);

  // Load product from ?product= param
  useEffect(() => {
    if (!productIdParam || hasLoadedProductRef.current || kitIdParam) return;
    hasLoadedProductRef.current = true;

    const loadProduct = async () => {
      try {
        const result = await invokeExternalDb<any>({
          table: 'products',
          operation: 'select',
          filters: { id: productIdParam },
          select: 'id, name, sku, sale_price, cost_price, primary_image_url, weight_g, width_mm, height_mm, length_mm, width_cm, height_cm, length_cm, materials, is_kit, category_id',
          limit: 1,
        });

        if (result.records?.length > 0) {
          const product = result.records[0];
          const kitItem = transformToKitItem(product as Record<string, unknown>);
          addItem(kitItem);
          setKitName(product.name || '');
          toast.success(`"${product.name}" adicionado ao kit!`, {
            description: 'Selecione uma caixa e continue montando.',
          });
        } else {
          toast.error('Produto não encontrado no catálogo');
        }
      } catch (err) {
        console.warn('[kit-builder] Failed to load product:', err);
        toast.error('Erro ao carregar produto');
      }
    };

    loadProduct();
  }, [productIdParam, kitIdParam, addItem, setKitName]);

  const handleSaveKit = async () => {
    try {
      const result = await saveKit(kitState, kitQuantity, currentKitId || autoSavedKitId || undefined);
      if (result && 'id' in result) {
        setCurrentKitId((result as { id: string }).id);
      }
    } catch {
      // error handled by hook
    }
  };

  const [isCreatingQuote, setIsCreatingQuote] = useState(false);

  const handleAddToQuote = async () => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para criar um orçamento.');
      return;
    }
    if (!kitState.isValid) return;

    setIsCreatingQuote(true);
    try {
      const kitLabel = kitState.name || 'Kit sem nome';
      const kitGroupId = crypto.randomUUID();

      const { total: kitTotal } = await import('@/lib/kit-builder').then(m =>
        m.calculateTotalKitPrice(kitState.box, kitState.items, kitState.personalization, kitQuantity)
      );

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          seller_id: user.id,
          status: 'draft',
          subtotal: kitTotal,
          total: kitTotal,
          notes: `Kit "${kitLabel}" (${kitQuantity}x) — tipo: ${kitState.kitType}`,
          internal_notes: kitState.box
            ? `Caixa: ${kitState.box.name} | Volume: ${kitState.volumeUsagePercent.toFixed(0)}%`
            : undefined,
        })
        .select('id, quote_number')
        .single();

      if (quoteError) throw quoteError;

      const quoteItems: Array<{
        quote_id: string;
        product_name: string;
        product_sku: string | null;
        product_image_url: string | null;
        product_id: string | null;
        quantity: number;
        unit_price: number;
        sort_order: number;
        notes: string | null;
        color_name: string | null;
        color_hex: string | null;
        kit_group_id: string | null;
        kit_name: string | null;
      }> = [];

      if (kitState.box) {
        quoteItems.push({
          quote_id: quote.id,
          product_name: `[Embalagem] ${kitState.box.name}`,
          product_sku: kitState.box.sku || null,
          product_image_url: kitState.box.imageUrl || null,
          product_id: kitState.box.id,
          quantity: kitQuantity,
          unit_price: kitState.box.price,
          sort_order: 0,
          notes: `Dimensões internas: ${kitState.box.internalWidth}×${kitState.box.internalHeight}×${kitState.box.internalDepth}cm`,
          color_name: null,
          color_hex: null,
          kit_group_id: kitGroupId,
          kit_name: kitLabel,
        });
      }

      kitState.items.forEach((item, index) => {
        quoteItems.push({
          quote_id: quote.id,
          product_name: item.name,
          product_sku: item.sku || null,
          product_image_url: item.imageUrl || null,
          product_id: item.id,
          quantity: item.quantity * kitQuantity,
          unit_price: item.price,
          sort_order: index + 1,
          notes: item.isOptional ? 'Item opcional' : null,
          color_name: item.selectedColor?.name || null,
          color_hex: item.selectedColor?.hex || null,
          kit_group_id: kitGroupId,
          kit_name: kitLabel,
        });
      });

      if (quoteItems.length > 0) {
        const { data: insertedItems, error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems)
          .select('id, product_id');
        if (itemsError) throw itemsError;

        if (insertedItems) {
          const personalizations: Array<{
            quote_item_id: string;
            technique_name: string | null;
            colors_count: number | null;
            width_cm: number | null;
            height_cm: number | null;
            unit_cost: number | null;
            total_cost: number | null;
            setup_cost: number | null;
            personalized_quantity: number | null;
            notes: string | null;
          }> = [];

          if (kitState.personalization.box.enabled && kitState.box) {
            const boxQuoteItem = insertedItems.find(i => i.product_id === kitState.box!.id);
            if (boxQuoteItem) {
              const bp = kitState.personalization.box;
              personalizations.push({
                quote_item_id: boxQuoteItem.id,
                technique_name: bp.techniqueName || null,
                colors_count: bp.colors || null,
                width_cm: bp.width || null,
                height_cm: bp.height || null,
                unit_cost: bp.estimatedPrice || null,
                total_cost: bp.estimatedPrice ? bp.estimatedPrice * kitQuantity : null,
                setup_cost: null,
                personalized_quantity: kitQuantity,
                notes: bp.position ? `Posição: ${bp.position}` : null,
              });
            }
          }

          kitState.items.forEach(item => {
            const itemPersonalization = kitState.personalization.items[item.id];
            if (itemPersonalization?.enabled) {
              const itemQuoteItem = insertedItems.find(i => i.product_id === item.id);
              if (itemQuoteItem) {
                const totalQty = item.quantity * kitQuantity;
                personalizations.push({
                  quote_item_id: itemQuoteItem.id,
                  technique_name: itemPersonalization.techniqueName || null,
                  colors_count: itemPersonalization.colors || null,
                  width_cm: itemPersonalization.width || null,
                  height_cm: itemPersonalization.height || null,
                  unit_cost: itemPersonalization.estimatedPrice || null,
                  total_cost: itemPersonalization.estimatedPrice ? itemPersonalization.estimatedPrice * totalQty : null,
                  setup_cost: null,
                  personalized_quantity: totalQty,
                  notes: itemPersonalization.position ? `Posição: ${itemPersonalization.position}` : null,
                });
              }
            }
          });

          if (personalizations.length > 0) {
            const { error: persError } = await supabase
              .from('quote_item_personalizations')
              .insert(personalizations);
            if (persError) console.warn('Erro ao salvar personalizações:', persError);
          }
        }
      }

      toast.success(`Orçamento ${quote.quote_number} criado!`, {
        description: `${quoteItems.length} itens adicionados ao kit "${kitLabel}".`,
        action: {
          label: 'Ver orçamento',
          onClick: () => navigate(`/orcamentos/${quote.id}`),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao criar orçamento: ${message}`);
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleExportPDF = () => {
    try {
      downloadKitPDF({
        kitState,
        kitQuantity,
        kitName: kitState.name,
      });
      toast.success('PDF do kit exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar PDF do kit');
    }
  };

  const handleResetKit = () => {
    resetKit();
    setCurrentKitId(undefined);
  };

  // Weight calculation
  const itemsWeight = kitState.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0);
  const weightExceeded = kitState.box?.maxWeight ? itemsWeight > kitState.box.maxWeight : false;
  const weightPercent = kitState.box?.maxWeight ? (itemsWeight / kitState.box.maxWeight) * 100 : 0;

  // Step counts for badges
  const stepCounts = {
    items: kitState.items.length,
    personalization: Object.values(kitState.personalization.items).filter((p: any) => p?.enabled).length + (kitState.personalization.box.enabled ? 1 : 0),
  };

  // Next step label
  const currentStepIdx = STEPS_ORDER.indexOf(wizardState.currentStep);
  const nextStepLabel = currentStepIdx < STEPS_ORDER.length - 1
    ? STEP_LABELS[STEPS_ORDER[currentStepIdx + 1]]
    : null;

  // Show sidebar based on step
  const showSidebar = wizardState.currentStep !== 'summary';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ═══════════════════════════════════════════
          HEADER — Sticky, compact, modern
         ═══════════════════════════════════════════ */}
      <div className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md">
        <div className="container">
          {/* Top bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <BackButton fallbackPath="/meus-kits" className="mr-1" />
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="leading-tight">
                <h1 className="text-base font-bold tracking-tight">Montador de Kits</h1>
                <div className="flex items-center gap-2">
                  {/* Auto-save status */}
                  {isAutoSaving ? (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      Salvando...
                    </span>
                  ) : lastSavedAt ? (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
                      <Cloud className="h-2.5 w-2.5 text-emerald-500" />
                      Salvo {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/50">Rascunho</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={() => undo()}>
                      <Undo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><span className="text-xs">Desfazer · Ctrl+Z</span></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={() => redo()}>
                      <Redo2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><span className="text-xs">Refazer · Ctrl+Y</span></TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="h-5 w-px bg-border mx-1" />

              <Button
                size="sm"
                variant="default"
                className="h-8 text-xs gap-1.5"
                onClick={handleSaveKit}
                disabled={isSaving || (!kitState.box && kitState.items.length === 0)}
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {currentKitId || autoSavedKitId ? 'Atualizar' : 'Salvar'}
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handleResetKit}>
                <RotateCcw className="h-3.5 w-3.5" />
                Novo
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <div className="pb-3">
            <WizardSteps
              currentStep={wizardState.currentStep}
              completedSteps={wizardState.completedSteps}
              onStepClick={goToStep}
              stepCounts={stepCounts}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          CONTENT — Grid with contextual sidebar
         ═══════════════════════════════════════════ */}
      <div className="flex-1 container py-6 pb-24">
        <div className={cn(
          "grid gap-6 transition-all duration-300",
          showSidebar ? "grid-cols-1 lg:grid-cols-[1fr_280px]" : "grid-cols-1 max-w-4xl mx-auto"
        )}>
          {/* Main Content with slide animation */}
          <div className="min-w-0">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={wizardState.currentStep}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Card className="shadow-sm">
                  <CardContent className="p-6">
                    {/* Step: Box Selection */}
                    {wizardState.currentStep === 'box' && (
                      <div className="space-y-6">
                        {/* Templates */}
                        {!kitState.box && kitState.items.length === 0 && (
                          <KitTemplates
                            visible
                            onSelectTemplate={(template: KitTemplate) => {
                              setKitType(template.kitType);
                              setKitName(template.name);
                              toast.success(`Template "${template.name}" aplicado!`, {
                                description: `Tipo: ${template.kitType}. Agora selecione a caixa.`,
                              });
                            }}
                          />
                        )}

                        <div>
                          <h2 className="text-lg font-semibold">Selecione a Embalagem</h2>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Escolha a caixa que será a base do seu kit
                          </p>
                        </div>

                        {/* Kit Type — Visual Cards */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de Kit</label>
                          <KitTypeCards value={kitState.kitType} onChange={setKitType} />
                        </div>

                        <BoxSelector
                          boxes={availableBoxes}
                          selectedBox={kitState.box}
                          isLoading={isLoadingBoxes}
                          filters={boxFilters}
                          onFiltersChange={setBoxFilters}
                          onSelect={selectBox}
                          onClear={clearBox}
                        />
                      </div>
                    )}

                    {/* Step: Items Selection */}
                    {wizardState.currentStep === 'items' && (
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-lg font-semibold">Adicione os Itens</h2>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Selecione os produtos que farão parte do kit
                          </p>
                        </div>
                        <ItemSelector
                          items={availableItems}
                          selectedItems={kitState.items}
                          isLoading={isLoadingItems}
                          filters={itemFilters}
                          onFiltersChange={setItemFilters}
                          onAddItem={addItem}
                          onRemoveItem={removeItem}
                          onUpdateQuantity={updateItemQuantity}
                          onUpdateVariant={(itemId, data) => updateItemVariant(itemId, data)}
                          onReorder={reorderItems}
                          boxSelected={kitState.box !== null}
                        />
                        {kitState.items.length > 0 && (
                          <KitSmartSuggestions
                            selectedItems={kitState.items}
                            onAddItem={(item) => {
                              const kitItem = availableItems.find(i => i.id === item.id);
                              if (kitItem) addItem(kitItem);
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Step: Personalization */}
                    {wizardState.currentStep === 'personalization' && (
                      <PersonalizationConfig
                        box={kitState.box}
                        items={kitState.items}
                        kitQuantity={kitQuantity}
                        boxPersonalization={kitState.personalization.box}
                        itemPersonalizations={kitState.personalization.items}
                        onBoxPersonalizationChange={setBoxPersonalization}
                        onItemPersonalizationChange={setItemPersonalization}
                      />
                    )}

                    {/* Step: Summary */}
                    {wizardState.currentStep === 'summary' && (
                      <KitSummary
                        kitState={kitState}
                        kitQuantity={kitQuantity}
                        kitName={kitState.name}
                        onKitNameChange={setKitName}
                        onKitQuantityChange={setKitQuantity}
                        onAddToQuote={handleAddToQuote}
                        onExportPDF={handleExportPDF}
                        isAddingToQuote={isCreatingQuote}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ═══════════════════════════════════════
              SIDEBAR — Contextual per step
             ═══════════════════════════════════════ */}
          {showSidebar && (
            <div className="space-y-3">
              {/* Kit Mini Preview — always visible */}
              <KitMiniPreview
                box={kitState.box}
                items={kitState.items}
                kitName={kitState.name}
              />

              {/* Volume Indicator — show when box selected */}
              {kitState.box && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <VolumeIndicator
                    usedVolume={kitState.totalItemsVolume}
                    totalVolume={kitState.box.internalVolume}
                    usagePercent={kitState.volumeUsagePercent}
                  />
                </motion.div>
              )}

              {/* Weight Indicator */}
              {kitState.box && kitState.box.maxWeight && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <Card className={cn("transition-colors", weightExceeded && "border-destructive/50")}>
                    <CardContent className="p-3 space-y-2">
                      <h3 className="font-semibold text-xs flex items-center justify-between">
                        <span>⚖️ Peso</span>
                        <span className={cn(
                          "text-[10px] tabular-nums",
                          weightExceeded ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {(itemsWeight / 1000).toFixed(1)}kg / {(kitState.box.maxWeight / 1000).toFixed(1)}kg
                        </span>
                      </h3>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <motion.div
                          className={cn(
                            "h-1.5 rounded-full",
                            weightExceeded ? "bg-destructive" : weightPercent > 80 ? "bg-warning" : "bg-primary"
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(weightPercent, 100)}%` }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                      </div>
                      {weightExceeded && (
                        <p className="text-[10px] text-destructive font-medium">
                          ⚠ Excede em {((itemsWeight - kitState.box.maxWeight) / 1000).toFixed(1)}kg
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Price Preview */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="p-3 space-y-2">
                    <h3 className="font-semibold text-xs">Prévia de Preços</h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Caixa</span>
                        <span className="tabular-nums">{formatCurrency(kitState.boxPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Itens</span>
                        <span className="tabular-nums">{formatCurrency(kitState.itemsPrice)}</span>
                      </div>
                      {kitState.personalizationPrice > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>Personalização</span>
                          <span className="tabular-nums">{formatCurrency(kitState.personalizationPrice)}</span>
                        </div>
                      )}
                      <div className="border-t pt-1.5 flex justify-between font-semibold">
                        <span>Total/kit</span>
                        <span className="text-primary tabular-nums">{formatCurrency(kitState.totalPrice)}</span>
                      </div>
                      {kitState.totalWeight > 0 && (
                        <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                          <span>Peso estimado</span>
                          <span className="tabular-nums">
                            {kitState.totalWeight >= 1000 ? `${(kitState.totalWeight / 1000).toFixed(2)} kg` : `${kitState.totalWeight} g`}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Freight — compact, only when weight exists */}
              {kitState.totalWeight > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <FreightEstimator totalWeightGrams={kitState.totalWeight} kitQuantity={kitQuantity} />
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════
          BOTTOM NAV — Sticky navigation bar
         ═══════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur-md">
        <div className="container flex items-center justify-between py-3">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={prevStep}
            disabled={wizardState.currentStep === 'box'}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Button>

          {/* Center — Price summary */}
          <div className="hidden sm:flex items-center gap-4 text-xs">
            {kitState.box && (
              <Badge variant="outline" className="gap-1 text-[10px] font-normal">
                <Package className="h-3 w-3" />
                {kitState.box.name.length > 15 ? kitState.box.name.slice(0, 15) + '…' : kitState.box.name}
              </Badge>
            )}
            {kitState.items.length > 0 && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {kitState.items.length} {kitState.items.length === 1 ? 'item' : 'itens'}
              </Badge>
            )}
            {kitState.totalPrice > 0 && (
              <span className="font-semibold text-primary tabular-nums">
                {formatCurrency(kitState.totalPrice)}
              </span>
            )}
          </div>

          {/* Next / Finish */}
          {wizardState.currentStep !== 'summary' ? (
            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={nextStep}
              disabled={!wizardState.canProceed}
            >
              {nextStepLabel && (
                <span className="hidden sm:inline text-primary-foreground/70">{nextStepLabel}</span>
              )}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <div className="w-20" /> // spacer
          )}
        </div>
      </div>
    </div>
  );
}
