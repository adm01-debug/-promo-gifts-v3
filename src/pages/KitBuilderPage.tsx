/**
 * Kit Builder Page
 * Página principal do montador de kits
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Package, ArrowLeft, ArrowRight, RotateCcw, Save, Loader2, Undo2, Redo2, CloudOff, Cloud } from 'lucide-react';
import { downloadKitPDF } from '@/utils/kitPdfGenerator';
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import type { KitTemplate } from '@/components/kit-builder/KitTemplates';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { transformToKitItem } from '@/hooks/useKitBuilderTransformers';

export default function KitBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kitIdParam = searchParams.get('kit');
  const productIdParam = searchParams.get('product');
  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const hasLoadedRef = useRef(false);
  const hasLoadedProductRef = useRef(false);
  
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

  // P0 FIX: Load product from ?product= param
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

      // Calculate correct totals including personalization
      const { total: kitTotal, personalizationPrice } = await import('@/lib/kit-builder').then(m =>
        m.calculateTotalKitPrice(kitState.box, kitState.items, kitState.personalization, kitQuantity)
      );

      // 1. Create the quote with correct totals
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

      // 2. Build quote_items with kit_group_id and kit_name
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

      // Add box as first item
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

      // Add kit items
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

        // 3. Create quote_item_personalizations for personalized items
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

          // Box personalization
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

          // Item personalizations
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

  // Weight warning
  const itemsWeight = kitState.items.reduce((sum, item) => sum + ((item.weight || 0) * item.quantity), 0);
  const weightExceeded = kitState.box?.maxWeight ? itemsWeight > kitState.box.maxWeight : false;
  const weightPercent = kitState.box?.maxWeight ? (itemsWeight / kitState.box.maxWeight) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
         <div className="container py-6">
           <BackButton fallbackPath="/meus-kits" className="mb-3" />
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                 <Package className="h-6 w-6 text-primary" />
               </div>
              <div>
                <h1 className="text-2xl font-bold">Montador de Kits</h1>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <span>Monte kits personalizados com validação automática</span>
                  {/* Auto-save indicator */}
                  {lastSavedAt && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Cloud className="h-3 w-3 text-green-500" />
                      Salvo {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Badge>
                  )}
                  {isAutoSaving && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Salvando...
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Undo/Redo */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={!canUndo} onClick={() => undo()}>
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={!canRedo} onClick={() => redo()}>
                      <Redo2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refazer (Ctrl+Y)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button
                variant="default"
                onClick={handleSaveKit}
                disabled={isSaving || (!kitState.box && kitState.items.length === 0)}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {currentKitId || autoSavedKitId ? 'Atualizar' : 'Salvar'} Kit
              </Button>
              <Button variant="outline" onClick={handleResetKit}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Novo Kit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Steps */}
      <div className="border-b bg-card/50">
        <div className="container py-6">
          <WizardSteps
            currentStep={wizardState.currentStep}
            completedSteps={wizardState.completedSteps}
            onStepClick={goToStep}
          />
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {/* Templates */}
                {wizardState.currentStep === 'box' && !kitState.box && kitState.items.length === 0 && (
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

                {/* Step: Box Selection */}
                {wizardState.currentStep === 'box' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold">1. Selecione a Embalagem</h2>
                      <p className="text-muted-foreground">
                        Escolha a caixa ou embalagem que será a base do seu kit
                      </p>
                    </div>

                    {/* Kit Type Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tipo de Kit</Label>
                      <RadioGroup
                        value={kitState.kitType}
                        onValueChange={(v) => setKitType(v as 'montado' | 'original' | 'simples')}
                        className="flex gap-4"
                      >
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="montado" id="kit-montado" />
                                <Label htmlFor="kit-montado" className="cursor-pointer text-sm">Montado</Label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs max-w-[200px]">Kit montado dentro da caixa, itens arrumados e prontos para presentear.</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="original" id="kit-original" />
                                <Label htmlFor="kit-original" className="cursor-pointer text-sm">Original</Label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs max-w-[200px]">Kit com embalagem original do fornecedor, sem remontagem.</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="simples" id="kit-simples" />
                                <Label htmlFor="kit-simples" className="cursor-pointer text-sm">Simples</Label>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs max-w-[200px]">Agrupamento de itens sem embalagem especial — apenas os produtos.</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </RadioGroup>
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
                    <h2 className="text-xl font-semibold">2. Adicione os Itens</h2>
                    <p className="text-muted-foreground">
                      Selecione os produtos que farão parte do kit
                    </p>
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

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={wizardState.currentStep === 'box'}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              
              {wizardState.currentStep !== 'summary' && (
                <Button
                  onClick={nextStep}
                  disabled={!wizardState.canProceed}
                >
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Volume Indicator */}
            {kitState.box && (
              <VolumeIndicator
                usedVolume={kitState.totalItemsVolume}
                totalVolume={kitState.box.internalVolume}
                usagePercent={kitState.volumeUsagePercent}
              />
            )}

            {/* Weight Indicator */}
            {kitState.box && kitState.box.maxWeight && (
              <Card className={cn(weightExceeded && "border-destructive")}>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm flex items-center justify-between">
                    <span>⚖️ Peso</span>
                    <span className={cn(
                      "text-xs",
                      weightExceeded ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {(itemsWeight / 1000).toFixed(1)}kg / {(kitState.box.maxWeight / 1000).toFixed(1)}kg
                    </span>
                  </h3>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        weightExceeded ? "bg-destructive" : weightPercent > 80 ? "bg-warning" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(weightPercent, 100)}%` }}
                    />
                  </div>
                  {weightExceeded && (
                    <p className="text-xs text-destructive font-medium">
                      ⚠ Peso excede o limite da caixa em {((itemsWeight - kitState.box.maxWeight) / 1000).toFixed(1)}kg
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Price Preview */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold">Prévia de Preços</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caixa</span>
                    <span>{formatCurrency(kitState.boxPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Itens</span>
                    <span>{formatCurrency(kitState.itemsPrice)}</span>
                  </div>
                  {kitState.personalizationPrice > 0 && (
                    <div className="flex justify-between text-primary">
                      <span>Personalização</span>
                      <span>{formatCurrency(kitState.personalizationPrice)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total/kit</span>
                    <span className="text-primary">{formatCurrency(kitState.totalPrice)}</span>
                  </div>
                  {kitState.totalWeight > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Peso estimado</span>
                      <span>{kitState.totalWeight >= 1000 ? `${(kitState.totalWeight / 1000).toFixed(2)} kg` : `${kitState.totalWeight} g`}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Freight preview in sidebar */}
            {kitState.totalWeight > 0 && (
              <div className="scale-[0.92] origin-top">
                <FreightEstimator totalWeightGrams={kitState.totalWeight} kitQuantity={kitQuantity} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
