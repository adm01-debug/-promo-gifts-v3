/**
 * Kit Builder Page — Refactored
 * Orquestrador leve usando sub-componentes (SRP)
 * Header, Sidebar e BottomNav extraídos
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { useKitBuilder } from '@/hooks/useKitBuilder';
import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';
import { useKitAutoSave } from '@/hooks/useKitAutoSave';
import { useKitUndoRedo } from '@/hooks/useKitUndoRedo';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { invokeExternalDb } from '@/lib/external-db';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BoxSelector,
  ItemSelector,
  PersonalizationConfig,
  KitSummary,
} from '@/components/kit-builder';
import { KitSmartSuggestions } from '@/components/kit-builder/KitSmartSuggestions';
import { KitTemplates } from '@/components/kit-builder/KitTemplates';
import { KitTypeCards } from '@/components/kit-builder/KitTypeCards';
import { KitBuilderHeader } from '@/components/kit-builder/KitBuilderHeader';
import { KitBuilderSidebar } from '@/components/kit-builder/KitBuilderSidebar';
import { KitBuilderBottomNav } from '@/components/kit-builder/KitBuilderBottomNav';
import type { KitTemplate } from '@/components/kit-builder/KitTemplates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transformToKitItem } from '@/hooks/useKitBuilderTransformers';
import { calculateTotalKitPrice, formatCurrency } from '@/lib/kit-builder';
import { downloadKitPDF } from '@/utils/kitPdfGenerator';

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
  const { lastSavedAt, isSaving: isAutoSaving, autoSavedKitId } = useKitAutoSave(
    kitState, kitQuantity, currentKitId,
    (id) => setCurrentKitId(id),
  );
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

  // ─── Handlers ────────────────────────────────────────

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
      const { total: kitTotal } = calculateTotalKitPrice(kitState.box, kitState.items, kitState.personalization, kitQuantity);

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
      downloadKitPDF({ kitState, kitQuantity, kitName: kitState.name });
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

  // ─── Computed ────────────────────────────────────────

  const stepCounts = {
    items: kitState.items.length,
    personalization: Object.values(kitState.personalization.items).filter((p: any) => p?.enabled).length + (kitState.personalization.box.enabled ? 1 : 0),
  };

  const currentStepIdx = STEPS_ORDER.indexOf(wizardState.currentStep);
  const nextStepLabel = currentStepIdx < STEPS_ORDER.length - 1
    ? STEP_LABELS[STEPS_ORDER[currentStepIdx + 1]]
    : null;

  const showSidebar = wizardState.currentStep !== 'summary';

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* HEADER */}
      <KitBuilderHeader
        isAutoSaving={isAutoSaving}
        lastSavedAt={lastSavedAt}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => undo()}
        onRedo={() => redo()}
        isSaving={isSaving}
        hasContent={!!(kitState.box || kitState.items.length > 0)}
        hasExistingKit={!!(currentKitId || autoSavedKitId)}
        onSave={handleSaveKit}
        onReset={handleResetKit}
        currentStep={wizardState.currentStep}
        completedSteps={wizardState.completedSteps}
        onStepClick={goToStep}
        stepCounts={stepCounts}
      />

      {/* CONTENT */}
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
                          <h2 className="text-lg font-display font-semibold">Selecione a Embalagem</h2>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Escolha a caixa que será a base do seu kit
                          </p>
                        </div>

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
                          <h2 className="text-lg font-display font-semibold">Adicione os Itens</h2>
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

          {/* SIDEBAR */}
          {showSidebar && (
            <KitBuilderSidebar kitState={kitState} kitQuantity={kitQuantity} />
          )}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <KitBuilderBottomNav
        kitState={kitState}
        currentStep={wizardState.currentStep}
        canProceed={wizardState.canProceed}
        nextStepLabel={nextStepLabel}
        onPrevStep={prevStep}
        onNextStep={nextStep}
      />
    </div>
  );
}
