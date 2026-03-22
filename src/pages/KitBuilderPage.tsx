/**
 * Kit Builder Page
 * Página principal do montador de kits
 */

import { useState, useEffect, useRef } from 'react';
import { Package, ArrowLeft, ArrowRight, RotateCcw, Save, Loader2 } from 'lucide-react';
import { downloadKitPDF } from '@/utils/kitPdfGenerator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatCurrency } from '@/lib/kit-builder';
import { Card, CardContent } from '@/components/ui/card';
import { useKitBuilder } from '@/hooks/useKitBuilder';
import { useCustomKitPersistence } from '@/hooks/useCustomKitPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  WizardSteps,
  BoxSelector,
  ItemSelector,
  VolumeIndicator,
  PersonalizationConfig,
  KitSummary,
} from '@/components/kit-builder';
import { toast } from 'sonner';

export default function KitBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const kitIdParam = searchParams.get('kit');
  const [currentKitId, setCurrentKitId] = useState<string | undefined>(kitIdParam || undefined);
  const hasLoadedRef = useRef(false);
  
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

  const handleSaveKit = async () => {
    try {
      const result = await saveKit(kitState, kitQuantity, currentKitId);
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
      // 1. Create the quote
      const kitLabel = kitState.name || 'Kit sem nome';
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          seller_id: user.id,
          status: 'draft',
          subtotal: kitState.totalPrice * kitQuantity,
          total: kitState.totalPrice * kitQuantity,
          notes: `Kit "${kitLabel}" (${kitQuantity}x) — tipo: ${kitState.kitType}`,
          internal_notes: kitState.box
            ? `Caixa: ${kitState.box.name} | Volume: ${kitState.volumeUsagePercent.toFixed(0)}%`
            : undefined,
        })
        .select('id, quote_number')
        .single();

      if (quoteError) throw quoteError;

      // 2. Build quote_items from kit items (+ box as first item)
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
          notes: `Dimensões internas: ${kitState.box.internalWidth}×${kitState.box.internalHeight}×${kitState.box.internalDepth}mm`,
          color_name: null,
          color_hex: null,
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
        });
      });

      if (quoteItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems);
        if (itemsError) throw itemsError;
      }

      toast.success(`Orçamento ${quote.quote_number} criado!`, {
        description: `${quoteItems.length} itens adicionados ao rascunho.`,
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Montador de Kits</h1>
                <p className="text-muted-foreground">
                  Monte kits personalizados com validação automática de volume
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
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
                {currentKitId ? 'Atualizar' : 'Salvar'} Kit
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
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="montado" id="kit-montado" />
                          <Label htmlFor="kit-montado" className="cursor-pointer text-sm">Montado</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="original" id="kit-original" />
                          <Label htmlFor="kit-original" className="cursor-pointer text-sm">Original</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="simples" id="kit-simples" />
                          <Label htmlFor="kit-simples" className="cursor-pointer text-sm">Simples</Label>
                        </div>
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
                      boxSelected={kitState.box !== null}
                    />
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
          </div>
        </div>
      </div>
    </div>
  );
}
