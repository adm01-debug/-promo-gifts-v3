import { type MockupTechnique } from '@/types/external-db';
/**
 * MockupGenerator — Refactored v5.2
 *
 * Business logic in useMockupGenerator hook.
 * Progressive Preview + Enhanced Header + Sticky Navigator.
 */

import { useMemo, useCallback, useState, Suspense } from 'react';
import { useProductsContext } from '@/contexts/ProductsContext';
import { deleteMockupFromDb } from '@/hooks/mockup/mockupGenerationService';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2, History, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LogoPositionEditor } from '@/components/mockup/LogoPositionEditor';
import { MockupWizard } from '@/components/mockup/MockupWizard';
import { MockupResultCard } from '@/components/mockup/MockupResultCard';
import { MockupConfigPanel } from '@/components/mockup/MockupConfigPanel';
import { MockupHistoryPanel } from '@/components/mockup/MockupHistoryPanel';
import { TechniqueChangeDialog, DeleteMockupDialog } from './mockup-generator/MockupDialogs';
import { MockupToolbar } from './mockup-generator/MockupToolbar';
import { MockupEmptyState } from './mockup-generator/MockupEmptyState';
import { useKeyboardShortcuts } from '@/components/mockup/KeyboardShortcuts';
import { GeneratingOverlay } from '@/components/mockup/GeneratingOverlay';
import { TechniqueColorConfigDialog } from '@/components/mockup/TechniqueColorConfigDialog';
import { MockupLayoutButtons } from '@/components/mockup/approval/MockupLayoutButtons';
import { OffscreenLayoutCapture } from '@/components/mockup/approval/OffscreenLayoutCapture';
import { AIMockupAssistant } from '@/components/ai';
import { useMockupGenerator } from '@/hooks/useMockupGenerator';
import { useAuth } from '@/contexts/AuthContext';
import { useTechniqueHandlers } from './mockup-generator/MockupTechniqueHandlers';
import type { MockupApprovalData } from '@/types/mockup-approval';
import { DiagnosticProfiler } from '@/components/dev/DiagnosticProfiler';
import type { LayoutCaptureRequest } from '@/components/mockup/approval/OffscreenLayoutCapture';

// ─── Sub-components ──────────────────────────────────────────────────

function MockupHeader({
  historyCount,
  summary,
  activeTab,
}: {
  historyCount: number;
  summary: string;
  activeTab: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-6">
      <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-primary/20">
            <Wand2 className="h-7 w-7 animate-pulse text-primary" />
          </div>
          <div className="min-w-0">
            <h1
              data-testid="page-title-mockup-generator"
              className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text font-display text-3xl font-bold"
            >
              Gerador de Mockups
            </h1>
            <p className="mt-1 truncate text-muted-foreground">
              Crie mockups profissionais de brindes personalizados ✨
            </p>
            {activeTab === 'generator' && summary && (
              <p className="mt-1 inline-block rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary/70">
                {summary}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {historyCount > 0 && (
            <Badge
              variant="outline"
              className="gap-1.5 border-primary/20 bg-background/50 px-3 py-1 backdrop-blur-sm"
            >
              <History className="h-3.5 w-3.5 text-primary" />
              {historyCount} no histórico
            </Badge>
          )}
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            V.5.2
          </Badge>
        </div>
      </div>
    </div>
  );
}

export default function MockupGenerator() {
  const mg = useMockupGenerator();
  const { profile } = useAuth();
  const user = mg.user;
  const { getProductById } = useProductsContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mockupToDelete, setMockupToDelete] = useState<string | null>(null);

  const summary = useMemo(() => {
    const parts = [];
    if (mg.selectedClient) parts.push(mg.selectedClient.name);
    if (mg.selectedProduct) parts.push(mg.selectedProduct.name);
    if (mg.selectedTechnique) parts.push(mg.selectedTechnique.name);
    return parts.join(' · ');
  }, [mg.selectedClient, mg.selectedProduct, mg.selectedTechnique]);

  const technique = useTechniqueHandlers({
    hasLogo: mg.hasLogo,
    selectedTechnique: mg.selectedTechnique,
    setSelectedTechnique: mg.setSelectedTechnique,
    setGeneratedMockup: mg.setGeneratedMockup,
    setTechniqueColorConfig: mg.setTechniqueColorConfig,
  });

  useKeyboardShortcuts({
    onGenerate: mg.generateMockup,
    onReset: mg.resetForm,
    onDownload: () => mg.downloadMockup(),
    canGenerate: !!(mg.selectedProduct && mg.selectedTechnique && mg.hasLogo),
    canDownload: !!mg.generatedMockup,
    isLoading: mg.isLoading,
    onStepChange: (step) => {
      mg.setActiveTab('generator');
      const sectionMap: Record<number, string> = {
        1: 'step-client',
        2: 'step-product',
        3: 'step-technique',
        4: 'step-logo',
        5: 'step-logo',
        6: 'step-logo',
      };
      const targetId = sectionMap[step];
      if (targetId) {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  });

  const layoutCaptureRequest = useMemo((): LayoutCaptureRequest | null => {
    if (!mg.lastSavedRecordId || !user?.id || !mg.selectedProduct || !mg.selectedTechnique)
      return null;
    const mockupUrl = mg.lastSavedMockupUrl || mg.generatedMockup || '';
    if (!mockupUrl) return null;

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const docNumber = `MK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    const approvalData: MockupApprovalData = {
      documentNumber: docNumber,
      date: dateStr,
      client: {
        name:
          mg.selectedClient?.nome_fantasia ||
          mg.selectedClient?.razao_social ||
          mg.selectedClient?.name ||
          '—',
        cnpj: mg.selectedClient?.cnpj,
        logoUrl: mg.selectedClient?.logo_url || undefined,
      },
      seller: { name: profile?.full_name || '—', email: profile?.email || undefined },
      product: {
        name: mg.selectedProduct.name,
        sku: mg.selectedProduct.sku,
        imageUrl: mg.getProductImage() || undefined,
        color: mg.productSelection?.selectedColor?.name,
        colorHex: mg.productSelection?.selectedColor?.hex,
        material: mg.selectedProduct.materials?.[0],
        heightCm: mg.selectedProduct.dimensions?.height_cm ?? null,
        widthCm: mg.selectedProduct.dimensions?.width_cm ?? null,
        diameterCm: mg.selectedProduct.dimensions?.diameter_cm ?? null,
        depthCm: mg.selectedProduct.dimensions?.length_cm ?? null,
        capacityMl: mg.selectedProduct.dimensions?.capacity_ml ?? null,
        weightG: mg.selectedProduct.dimensions?.weight_g ?? null,
      },
      personalization: {
        techniqueName: mg.selectedTechnique.name,
        techniqueCode: mg.selectedTechnique.code || undefined,
        locationName:
          ('locationName' in mg.selectedTechnique
            ? (mg.selectedTechnique as MockupTechnique).locationName
            : null) ||
          mg.activeArea?.name ||
          'Frente',
        widthCm: mg.activeArea?.logoWidth || 0,
        heightCm: mg.activeArea?.logoHeight || 0,
        colorsCount: mg.techniqueColorConfig?.colorCount,
      },
      pantoneColors: (mg.logoColorAnalysis.colors || []).map((c: any) => ({
        name: c.selectedPantone || c.pantoneMatch?.name || c.name,
        hex: c.hex,
      })),
      mockupImageUrl: mockupUrl,
      layoutMode: mg.lastSavedLayoutMode,
    };

    return { data: approvalData, recordId: mg.lastSavedRecordId, userId: user.id };
  }, [
    mg.lastSavedRecordId,
    mg.lastSavedMockupUrl,
    mg.lastSavedLayoutMode,
    user?.id,
    mg.selectedProduct,
    mg.selectedTechnique,
    mg.selectedClient,
    mg.activeArea,
    mg.generatedMockup,
    profile,
    mg.techniqueColorConfig,
    mg.logoColorAnalysis.colors,
    mg.productSelection,
  ]);

  const handleLayoutCaptured = useCallback(() => {
    mg.setLastSavedRecordId(null);
    mg.setLastSavedMockupUrl(null);
    mg.fetchHistory();
  }, [mg.setLastSavedRecordId, mg.setLastSavedMockupUrl, mg.fetchHistory]);

  return (
    <>
      <DiagnosticProfiler id="MockupGenerator">
        <PageSEO
          title="Gerador de Mockups"
          description="Crie mockups profissionais de brindes personalizados com sua logo."
          path="/ferramentas/mockup"
        />
        <Suspense fallback={null}>
          <OffscreenLayoutCapture
            request={layoutCaptureRequest}
            onCaptured={handleLayoutCaptured}
          />
        </Suspense>

        <GeneratingOverlay
          isVisible={mg.isLoading}
          productName={mg.selectedProduct?.name}
          techniqueName={mg.selectedTechnique?.name}
        />

        <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
          {mg.activeTab !== 'history' && (
            <div className="sticky top-0 z-[40] -mx-2 rounded-xl border border-transparent bg-background/80 px-2 py-2 backdrop-blur-md transition-all duration-300 hover:border-border/40">
              <Suspense fallback={null}>
                <MockupWizard
                  currentStep={mg.wizardStep}
                  hasClient={!!mg.selectedClient}
                  hasProduct={!!mg.selectedProduct}
                  hasTechnique={!!mg.selectedTechnique}
                  hasLogo={mg.hasLogo}
                  hasPositioned={mg.hasUserInteractedPosition}
                  hasGenerated={!!mg.generatedMockup}
                  onStepClick={(step) => {
                    mg.setActiveTab('generator');
                    const sectionMap: Record<number, string> = {
                      1: 'step-client',
                      2: 'step-product',
                      3: 'step-technique',
                      4: 'step-logo',
                      5: 'step-logo',
                      6: 'step-logo',
                    };
                    const targetId = sectionMap[step];
                    if (targetId) {
                      const el = document.getElementById(targetId);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        el.classList.add('ring-2', 'ring-primary/50', 'rounded-lg');
                        setTimeout(
                          () => el.classList.remove('ring-2', 'ring-primary/50', 'rounded-lg'),
                          2000,
                        );
                      }
                    }
                  }}
                />
              </Suspense>
            </div>
          )}

          {mg.showDraftRestoredNotice && (
            <Alert className="border-success/50 bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">Rascunho restaurado</AlertTitle>
              <AlertDescription className="text-success/80">
                Seu progresso anterior foi restaurado automaticamente.
              </AlertDescription>
            </Alert>
          )}

          {mg.generationError && !mg.isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na geração</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>{mg.generationError}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mg.setGenerationError(null)}
                      >
                        Dispensar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="border-none bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-xl">
                      Remover aviso de erro
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={mg.activeTab} onValueChange={mg.setActiveTab} className="w-full">
            <div className="mb-4 flex items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="generator" className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4" /> Gerar Mockup
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="h-4 w-4" /> Histórico ({mg.mockupHistory.length})
                </TabsTrigger>
              </TabsList>
              <MockupToolbar
                canUndo={mg.positionHistory.canUndo}
                canRedo={mg.positionHistory.canRedo}
                onUndo={() => {
                  const state = mg.positionHistory.undo();
                  if (state) mg.updateActiveArea(state);
                }}
                onRedo={() => {
                  const state = mg.positionHistory.redo();
                  if (state) mg.updateActiveArea(state);
                }}
                isDraftSaving={mg.isDraftSaving}
                lastSaved={mg.lastSaved}
                draftError={mg.draftError}
              />
            </div>

            <TabsContent value="generator">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <MockupConfigPanel
                    techniques={mg.techniques}
                    productSelection={mg.productSelection}
                    selectedTechnique={mg.selectedTechnique}
                    selectedClient={mg.selectedClient}
                    isLoadingData={mg.isLoadingData}
                    personalizationAreas={mg.personalizationAreas}
                    filteredTechniques={mg.filteredTechniques}
                    onProductSelect={(sel) => {
                      mg.setProductSelection(sel);
                      mg.setGeneratedMockup(null);
                    }}
                    onTechniqueSelect={technique.handleTechniqueChange}
                    onClientSelect={mg.setSelectedClient}
                    onReset={mg.resetForm}
                    activeAreaId={mg.activeAreaId}
                    onAreasChange={mg.setPersonalizationAreas}
                    onActiveAreaChange={mg.setActiveAreaId}
                    onLogoUpload={mg.handleAreaLogoUpload}
                    onLogoRemove={() => mg.logoColorAnalysis.clearAnalysis()}
                    productLocations={mg.productLocations}
                    logoColorAnalysis={mg.logoColorAnalysis}
                    artAttachments={mg.artAttachments}
                    onArtAttachmentsChange={mg.setArtAttachments}
                    userId={user?.id}
                  />

                  <div className="space-y-4 transition-all duration-300 lg:sticky lg:top-24 lg:self-start">
                    {mg.selectedProduct && mg.getProductImage() && mg.activeArea ? (
                      <LogoPositionEditor
                        productImageUrl={mg.getProductImage()!}
                        logoPreview={mg.activeArea.logoPreview}
                        positionX={mg.activeArea.positionX}
                        positionY={mg.activeArea.positionY}
                        logoWidth={mg.activeArea.logoWidth}
                        logoHeight={mg.activeArea.logoHeight}
                        logoRotation={mg.activeArea.logoRotation || 0}
                        logoScale={mg.activeArea.logoScale ?? 100}
                        techniqueCode={mg.selectedTechnique?.code}
                        techniqueName={mg.selectedTechnique?.name}
                        maxWidth={
                          'maxWidth' in (mg.selectedTechnique || {})
                            ? (mg.selectedTechnique as MockupTechnique).maxWidth
                            : null
                        }
                        maxHeight={
                          'maxHeight' in (mg.selectedTechnique || {})
                            ? (mg.selectedTechnique as MockupTechnique).maxHeight
                            : null
                        }
                        productHeightCm={
                          mg.selectedProduct?.dimensions?.height_cm ??
                          (mg.selectedProduct?.metadata?.height_mm
                            ? mg.selectedProduct.metadata.height_mm / 10
                            : null)
                        }
                        productWidthCm={
                          mg.selectedProduct?.dimensions?.width_cm ??
                          mg.selectedProduct?.dimensions?.diameter_cm ??
                          (mg.selectedProduct?.metadata?.width_mm
                            ? mg.selectedProduct.metadata.width_mm / 10
                            : null)
                        }
                        onPositionChange={(x, y) =>
                          mg.updateActiveArea({ positionX: x, positionY: y })
                        }
                        onSizeChange={(w, h) =>
                          mg.updateActiveArea({ logoWidth: w, logoHeight: h })
                        }
                        onRotationChange={(r) => mg.updateActiveArea({ logoRotation: r })}
                        onLogoScaleChange={(s) => mg.updateActiveArea({ logoScale: s })}
                        techniqueColorConfig={mg.techniqueColorConfig}
                        onColorConfigClick={() => technique.setColorConfigDialogOpen(true)}
                        headerActions={
                          <MockupLayoutButtons
                            generatedMockup={mg.generatedMockup}
                            product={
                              mg.selectedProduct
                                ? {
                                    name: mg.selectedProduct.name,
                                    sku: mg.selectedProduct.sku,
                                    imageUrl: mg.getProductImage() || undefined,
                                    color: mg.productSelection?.selectedColor?.name,
                                    colorHex: mg.productSelection?.selectedColor?.hex,
                                    material: mg.selectedProduct.materials?.[0],
                                    heightCm: mg.selectedProduct.dimensions?.height_cm ?? null,
                                    widthCm: mg.selectedProduct.dimensions?.width_cm ?? null,
                                    diameterCm: mg.selectedProduct.dimensions?.diameter_cm ?? null,
                                    depthCm: mg.selectedProduct.dimensions?.length_cm ?? null,
                                    capacityMl: mg.selectedProduct.dimensions?.capacity_ml ?? null,
                                    weightG: mg.selectedProduct.dimensions?.weight_g ?? null,
                                  }
                                : null
                            }
                            technique={
                              mg.selectedTechnique
                                ? {
                                    name: mg.selectedTechnique.name,
                                    code: mg.selectedTechnique.code,
                                    maxWidth:
                                      'maxWidth' in mg.selectedTechnique
                                        ? (mg.selectedTechnique as MockupTechnique).maxWidth
                                        : null,
                                    maxHeight:
                                      'maxHeight' in mg.selectedTechnique
                                        ? (mg.selectedTechnique as MockupTechnique).maxHeight
                                        : null,
                                    locationName:
                                      'locationName' in mg.selectedTechnique
                                        ? (mg.selectedTechnique as MockupTechnique).locationName
                                        : null,
                                  }
                                : null
                            }
                            client={mg.selectedClient}
                            seller={
                              profile
                                ? {
                                    name: profile.full_name || '—',
                                    email: profile.email || undefined,
                                  }
                                : null
                            }
                            activeArea={mg.activeArea || null}
                            productHeightCm={
                              mg.selectedProduct?.dimensions?.height_cm ??
                              (mg.selectedProduct?.metadata?.height_mm
                                ? mg.selectedProduct.metadata.height_mm / 10
                                : null)
                            }
                            productWidthCm={
                              mg.selectedProduct?.dimensions?.width_cm ??
                              mg.selectedProduct?.dimensions?.diameter_cm ??
                              (mg.selectedProduct?.metadata?.width_mm
                                ? mg.selectedProduct.metadata.width_mm / 10
                                : null)
                            }
                            pantoneColors={mg.logoColorAnalysis.colors}
                            colorsCount={mg.techniqueColorConfig?.colorCount}
                            onStaticGenerated={async (dataUrl, extra) => {
                              if (mg.activeArea) {
                                const recordId = await mg.saveMockupToHistory(
                                  dataUrl,
                                  mg.activeArea,
                                  extra,
                                );
                                if (recordId) {
                                  mg.setLastSavedMockupUrl(dataUrl);
                                  mg.setLastSavedLayoutMode('static');
                                  mg.setLastSavedRecordId(recordId);
                                }
                              }
                            }}
                            onGenerateMockup={mg.generateMockup}
                            isGeneratingMockup={mg.isLoading}
                          />
                        }
                      />
                    ) : (
                      <MockupEmptyState
                        currentStep={mg.wizardStep}
                        hasClient={!!mg.selectedClient}
                        hasProduct={!!mg.selectedProduct}
                        hasTechnique={!!mg.selectedTechnique}
                        hasLogo={mg.hasLogo}
                      />
                    )}

                    <MockupResultCard
                      generatedMockup={mg.generatedMockup}
                      isLoading={mg.isLoading}
                      onDownload={() => mg.downloadMockup()}
                      productName={mg.selectedProduct?.name}
                      techniqueName={mg.selectedTechnique?.name}
                      onReset={mg.resetForm}
                      beforeImage={mg.beforeImage}
                      annotations={mg.mockupAnnotations}
                      onAnnotationsChange={mg.setMockupAnnotations}
                    />

                    {mg.generatedBatchMockups.length > 1 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          Todas as áreas ({mg.generatedBatchMockups.length})
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {mg.generatedBatchMockups.map((batch, idx) => (
                            <div
                              key={idx}
                              className="overflow-hidden rounded-lg border border-border/30 bg-card"
                            >
                              <img
                                src={batch.url}
                                alt={batch.areaName}
                                className="aspect-square w-full object-contain"
                                loading="lazy"
                              />
                              <div className="p-2 text-center">
                                <p className="truncate text-[10px] font-medium">{batch.areaName}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <AIMockupAssistant
                      onSuggestionApply={(type, value) => {
                        if (type === 'suggestion' && value?.techniqueId) {
                          const tech = mg.techniques.find((t) => t.id === value.techniqueId);
                          if (tech) technique.handleTechniqueChange(tech);
                        }
                        if (type === 'suggestion' && value?.position) {
                          mg.updateActiveArea({
                            positionX: value.position.x,
                            positionY: value.position.y,
                          });
                        }
                      }}
                    />
                  </div>
                </div>
              </Suspense>
            </TabsContent>

            <TabsContent value="history">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <MockupHistoryPanel
                  mockupHistory={mg.mockupHistory}
                  isLoading={mg.isLoadingHistory}
                  clients={mg.historyClients}
                  techniques={mg.techniques}
                  onDelete={(id) => {
                    setMockupToDelete(id);
                    setDeleteDialogOpen(true);
                  }}
                  onDownload={(mockup) => mg.downloadMockup(mockup)}
                  onLoadFromHistory={(mockup) => {
                    const product = getProductById(mockup.product_id || '');
                    if (product) {
                      mg.setProductSelection({
                        product,
                        variant: null,
                        imageUrl: mockup.mockup_url,
                      });
                      mg.setActiveTab('generator');
                      toast.success('Produto restaurado do histórico');
                    }
                  }}
                />
              </Suspense>
            </TabsContent>
          </Tabs>

          <TechniqueChangeDialog
            open={technique.techniqueChangeDialogOpen}
            onOpenChange={technique.setTechniqueChangeDialogOpen}
            fromName={mg.selectedTechnique?.name}
            toName={technique.pendingTechnique?.name}
            hasGeneratedMockup={!!mg.generatedMockup}
            onConfirm={technique.confirmTechniqueChange}
            onCancel={() => technique.setTechniqueChangeDialogOpen(false)}
          />

          <DeleteMockupDialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open);
              if (!open) setMockupToDelete(null);
            }}
            onConfirm={async () => {
              if (mockupToDelete) {
                try {
                  await deleteMockupFromDb(mockupToDelete, user?.id);
                  toast.success('Mockup excluído com sucesso');
                  await mg.fetchHistory();
                } catch (error) {
                  console.error('Erro ao excluir mockup:', error);
                  toast.error('Não foi possível excluir o mockup. Tente novamente.');
                } finally {
                  setDeleteDialogOpen(false);
                  setMockupToDelete(null);
                }
              }
            }}
          />

          {technique.colorConfigDialogOpen && (
            <Suspense fallback={null}>
              <TechniqueColorConfigDialog
                open={technique.colorConfigDialogOpen}
                onOpenChange={technique.setColorConfigDialogOpen}
                currentConfig={mg.techniqueColorConfig}
                onConfirm={mg.setTechniqueColorConfig}
                techniqueName={mg.selectedTechnique?.name || ''}
                techniqueCode={mg.selectedTechnique?.code}
                detectedColors={mg.logoColorAnalysis.colors || []}
              />
            </Suspense>
          )}
        </div>
      </DiagnosticProfiler>
    </>
  );
}
