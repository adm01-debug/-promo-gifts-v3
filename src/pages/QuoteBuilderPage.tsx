/**
 * QuoteBuilderPage — Módulo de criação/edição de orçamentos
 * Refatorado: lógica em useQuoteBuilderState, UI em sub-componentes.
 */

import { PageSEO } from '@/components/seo/PageSEO';
import { Loader2, BookTemplate } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { QuoteAutoSave } from '@/components/quotes/QuoteAutoSave';
import { DraggableQuoteItems } from '@/components/quotes/DraggableQuoteItems';
import { QuoteBuilderStepper } from '@/components/quotes/QuoteBuilderStepper';
import { QuoteBuilderSummaryColumn } from '@/components/quotes/QuoteBuilderSummaryColumn';
import { QuoteBuilderProductSearch } from '@/components/quotes/QuoteBuilderProductSearch';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';

import { useQuoteBuilderState } from '@/hooks/useQuoteBuilderState';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';

import { QuoteBuilderHeader } from '@/components/quotes/builder/QuoteBuilderHeader';
import { QuoteConditionsPanel } from '@/components/quotes/builder/QuoteConditionsPanel';
import { QuoteFloatingActions } from '@/components/quotes/builder/QuoteFloatingActions';

export default function QuoteBuilderPage() {
  const s = useQuoteBuilderState();
  const { showDialog, guardNavigation, confirmLeave, cancelLeave, message } =
    useUnsavedChangesGuard({
      hasUnsavedChanges: s.items.length > 0 || s.clientId !== '',
    });

  if (s.loadingQuote) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageSEO
        title={s.quoteId ? 'Editar Orçamento' : 'Novo Orçamento'}
        description="Crie e edite orçamentos com seleção de produtos e personalização."
        path="/orcamentos/novo"
        noIndex
      />

      <QuoteAutoSave
        quoteId={s.quoteId}
        data={{
          clientId: s.clientId,
          validUntil: s.validUntil,
          discountType: s.discountType,
          discountValue: s.discountValue,
          notes: s.notes,
          internalNotes: s.internalNotes,
          items: s.items,
        }}
        onRestore={(data) => {
          s.setClientId(data.clientId || '');
          s.setItems(data.items || []);
          // ... restore other fields via facade
        }}
        className="fixed right-4 top-20 z-40"
      />

      <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
        <QuoteBuilderHeader
          isEditMode={s.isEditMode}
          quoteId={s.quoteId}
          quoteNumber={s.quoteNumber}
          templates={s.templates}
          items={s.items}
          discountType={s.discountType}
          discountValue={s.discountValue}
          notes={s.notes}
          internalNotes={s.internalNotes}
          applyTemplate={s.applyTemplate}
          getTemplateItems={s.getTemplateItems}
          navigate={s.navigate}
          guardNavigation={guardNavigation}
        />

        <QuoteBuilderStepper completedSteps={s.completedSteps} activeStep={s.activeStep} />

        {/* Template applied info */}
        {s.templateApplied && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <BookTemplate className="h-4 w-4 text-primary" />
                <span className="text-sm">Template <strong>"{s.templateApplied}"</strong> aplicado</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => s.setTemplateApplied(null)}>Fechar</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-12">
          {/* Left Column: Client + Conditions */}
          <div className="lg:col-span-3">
            <QuoteConditionsPanel s={s} />
          </div>

          {/* Middle Column: Items */}
          <div className="lg:col-span-6 space-y-4">
            <QuoteBuilderProductSearch
              productSearch={s.productSearch}
              setProductSearch={s.setProductSearch}
              productSearchOpen={s.productSearchOpen}
              setProductSearchOpen={s.setProductSearchOpen}
              filteredProducts={s.filteredProducts}
              selectedProductForColor={s.selectedProductForColor}
              handleProductClick={s.handleProductClick}
              addProductWithColor={s.addProductWithColor}
              setSelectedProductForColor={s.setSelectedProductForColor}
            />

            <DraggableQuoteItems
              items={s.items}
              setItems={s.setItems}
              activeItemIndex={s.activeItemIndex}
              setActiveItemIndex={s.setActiveItemIndex}
              expandedItems={s.expandedItems}
              toggleExpanded={s.toggleExpanded}
              updateItemQuantity={s.updateItemQuantity}
              updateItemPrice={s.updateItemPrice}
              removeItem={s.removeItem}
              handlePersonalizationsChange={s.handlePersonalizationsChange}
              confirmItemPrice={s.confirmItemPrice}
            />
          </div>

          {/* Right Column: Summary */}
          <div className="lg:col-span-3">
            <QuoteBuilderSummaryColumn s={s} />
          </div>
        </div>

        <QuoteFloatingActions
          isDraftValid={s.isDraftValid}
          isFormValid={s.isFormValid}
          isEditMode={s.isEditMode}
          quotesLoading={s.quotesLoading}
          isDiscountExceeded={s.isDiscountExceeded}
          handleSaveQuote={s.handleSaveQuote}
        />
      </div>

      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
        message={message}
      />
    </>
  );
}
