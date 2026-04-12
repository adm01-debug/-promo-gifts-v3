import { MockupTechnique } from "@/types/external-db";
/**
 * MockupGenerator — Refactored v4
 * 
 * Business logic extracted to useMockupGenerator hook.
 * This page component is now purely presentational.
 * Heavy sub-components are lazy-loaded for optimal bundle splitting.
 */

import { useState, useCallback, useMemo, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Wand2, History, Cloud, CloudOff, AlertCircle, CheckCircle2, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TechniqueChangeDialog, DeleteMockupDialog } from "./mockup-generator/MockupDialogs";
import { MockupToolbar } from "./mockup-generator/MockupToolbar";
import { MockupEmptyState } from "./mockup-generator/MockupEmptyState";
import { useKeyboardShortcuts } from "@/components/mockup/KeyboardShortcuts";
import { GeneratingOverlay } from "@/components/mockup/GeneratingOverlay";
import { useMockupGenerator } from "@/hooks/useMockupGenerator";
import { useAuth } from "@/contexts/AuthContext";
import type { MockupApprovalData } from "@/types/mockup-approval";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

// Lazy load heavy sub-components
const LogoPositionEditor = lazyWithRetry(() => import("@/components/mockup/LogoPositionEditor").then(m => ({ default: m.LogoPositionEditor })));
const MockupWizard = lazyWithRetry(() => import("@/components/mockup/MockupWizard").then(m => ({ default: m.MockupWizard })));
const MockupResultCard = lazyWithRetry(() => import("@/components/mockup/MockupResultCard").then(m => ({ default: m.MockupResultCard })));
const MockupConfigPanel = lazyWithRetry(() => import("@/components/mockup/MockupConfigPanel").then(m => ({ default: m.MockupConfigPanel })));
const MockupHistoryPanel = lazyWithRetry(() => import("@/components/mockup/MockupHistoryPanel").then(m => ({ default: m.MockupHistoryPanel })));
const MockupLayoutButtons = lazyWithRetry(() => import("@/components/mockup/approval/MockupLayoutButtons").then(m => ({ default: m.MockupLayoutButtons })));
const OffscreenLayoutCapture = lazyWithRetry(() => import("@/components/mockup/approval/OffscreenLayoutCapture").then(m => ({ default: m.OffscreenLayoutCapture })));
const TechniqueColorConfigDialog = lazyWithRetry(() => import("@/components/mockup/TechniqueColorConfigDialog").then(m => ({ default: m.TechniqueColorConfigDialog })));
const AIMockupAssistant = lazyWithRetry(() => import("@/components/ai").then(m => ({ default: m.AIMockupAssistant })));

// These small utility functions are extracted to avoid pulling the full TechniqueColorConfigDialog into this chunk
// They're re-exported from the dialog module but are tiny — we import them statically since they're used in callbacks
// The dialog component itself is lazy-loaded above
import { techniqueNeedsColorConfig, classifyTechnique } from "@/components/mockup/techniqueColorUtils";
import type { LayoutCaptureRequest } from "@/components/mockup/approval/OffscreenLayoutCapture";

// ─── Component ───────────────────────────────────────────────────────

export default function MockupGenerator() {
  const mg = useMockupGenerator();
  const { profile } = useAuth();
  const user = mg.user;

  // Technique change confirmation
  const [pendingTechnique, setPendingTechnique] = useState<any>(null);
  const [techniqueChangeDialogOpen, setTechniqueChangeDialogOpen] = useState(false);
  // Color config dialog
  const [colorConfigDialogOpen, setColorConfigDialogOpen] = useState(false);

  const handleTechniqueChange = useCallback((technique: any) => {
    // If there's already a logo AND switching FROM one technique TO a DIFFERENT one, ask for confirmation
    if (mg.hasLogo && mg.selectedTechnique && technique && technique.id !== mg.selectedTechnique.id) {
      setPendingTechnique(technique);
      setTechniqueChangeDialogOpen(true);
      return;
    }
    // Apply technique and open color config if needed
    mg.setSelectedTechnique(technique);
    mg.setGeneratedMockup(null);
    if (technique && techniqueNeedsColorConfig(technique.name, technique.code)) {
      mg.setTechniqueColorConfig(null); // reset config for new technique
      setColorConfigDialogOpen(true);
    } else if (technique) {
      // Auto-set full color config for digital techniques
      mg.setTechniqueColorConfig({ category: classifyTechnique(technique.name, technique.code), isFullColor: true });
    } else {
      mg.setTechniqueColorConfig(null);
    }
  }, [mg.hasLogo, mg.selectedTechnique, mg.setSelectedTechnique, mg.setGeneratedMockup, mg.setTechniqueColorConfig]);

  const confirmTechniqueChange = useCallback(() => {
    mg.setSelectedTechnique(pendingTechnique);
    mg.setGeneratedMockup(null);
    setTechniqueChangeDialogOpen(false);
    setPendingTechnique(null);
    toast.info(`Técnica alterada para ${pendingTechnique?.name}. Dimensões ajustadas automaticamente.`, { duration: 3000 });
    // Open color config for the new technique
    if (pendingTechnique && techniqueNeedsColorConfig(pendingTechnique.name, pendingTechnique.code)) {
      mg.setTechniqueColorConfig(null);
      setTimeout(() => setColorConfigDialogOpen(true), 300); // slight delay after dialog closes
    } else if (pendingTechnique) {
      mg.setTechniqueColorConfig({ category: classifyTechnique(pendingTechnique.name, pendingTechnique.code), isFullColor: true });
    }
  }, [pendingTechnique, mg.setSelectedTechnique, mg.setGeneratedMockup, mg.setTechniqueColorConfig]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: mg.generateMockup,
    onReset: mg.resetForm,
    onDownload: () => mg.downloadMockup(),
    canGenerate: !!(mg.selectedProduct && mg.selectedTechnique && mg.hasLogo),
    canDownload: !!mg.generatedMockup,
    isLoading: mg.isLoading,
  });

  // Build layout capture request when a new mockup is saved to history
  const layoutCaptureRequest = useMemo((): LayoutCaptureRequest | null => {
    if (!mg.lastSavedRecordId || !user?.id || !mg.selectedProduct || !mg.selectedTechnique) return null;
    
    // Use the saved mockup URL (not current generatedMockup which may be stale/null for static mode)
    const mockupUrl = mg.lastSavedMockupUrl || mg.generatedMockup || "";
    if (!mockupUrl) return null;

    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const docNumber = `MK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

    const approvalData: MockupApprovalData = {
      documentNumber: docNumber,
      date: dateStr,
      client: {
        name: mg.selectedClient?.nome_fantasia || mg.selectedClient?.razao_social || mg.selectedClient?.name || "—",
        cnpj: mg.selectedClient?.cnpj,
        logoUrl: mg.selectedClient?.logo_url || undefined,
      },
      seller: {
        name: profile?.full_name || "—",
        email: profile?.email || undefined,
      },
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
        locationName: ('locationName' in mg.selectedTechnique ? (mg.selectedTechnique as MockupTechnique).locationName : null) || mg.activeArea?.name || "Frente",
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
  }, [mg.lastSavedRecordId, mg.lastSavedMockupUrl, mg.lastSavedLayoutMode, user?.id, mg.selectedProduct, mg.selectedTechnique, mg.selectedClient, mg.activeArea, mg.generatedMockup, profile, mg.techniqueColorConfig, mg.logoColorAnalysis.colors, mg.productSelection]);

  // Stable callback for layout capture completion
  const handleLayoutCaptured = useCallback(() => {
    mg.setLastSavedRecordId(null);
    mg.setLastSavedMockupUrl(null);
    mg.fetchHistory();
  }, [mg.setLastSavedRecordId, mg.setLastSavedMockupUrl, mg.fetchHistory]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <PageSEO title="Gerador de Mockups" description="Crie mockups profissionais de brindes personalizados com sua logo." path="/mockup-generator" />
      {/* Offscreen layout capture - auto-captures approval document after mockup generation */}
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

      <div className="space-y-6">
        {/* Wizard Progress — hidden on history tab */}
        {mg.activeTab !== "history" && (
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
                mg.setActiveTab("generator");
                const sectionMap: Record<number, string> = {
                  1: "Empresa",
                  2: "Produto",
                  3: "Técnica",
                  4: "Logo",
                  5: "Posição",
                  6: "Gerar",
                };
                const label = sectionMap[step];
                if (label) toast.info(`📍 ${label}`, { duration: 1500 });
              }}
            />
          </Suspense>
        )}

        {/* Notices */}
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
              <Button variant="outline" size="sm" onClick={() => mg.setGenerationError(null)}>
                Dispensar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs + Undo/Redo/Save inline */}
        <Tabs value={mg.activeTab} onValueChange={mg.setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between gap-2">
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
              onUndo={() => { const state = mg.positionHistory.undo(); if (state) mg.updateActiveArea(state); }}
              onRedo={() => { const state = mg.positionHistory.redo(); if (state) mg.updateActiveArea(state); }}
              isDraftSaving={mg.isDraftSaving}
              lastSaved={mg.lastSaved}
              draftError={mg.draftError}
            />
          </div>

          <TabsContent value="generator">
            <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Config Panel */}
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
                onTechniqueSelect={handleTechniqueChange}
                onClientSelect={mg.setSelectedClient}
                onReset={mg.resetForm}
                activeAreaId={mg.activeAreaId}
                onAreasChange={mg.setPersonalizationAreas}
                onActiveAreaChange={mg.setActiveAreaId}
                onLogoUpload={mg.handleAreaLogoUpload}
                onLogoRemove={() => mg.logoColorAnalysis.clearAnalysis()}
                productLocations={mg.productLocations}
                logoColorAnalysis={mg.logoColorAnalysis}
              />

              {/* Right panel: Position Editor + Result */}
              <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
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
                    maxWidth={'maxWidth' in (mg.selectedTechnique || {}) ? (mg.selectedTechnique as MockupTechnique).maxWidth : null}
                    maxHeight={'maxHeight' in (mg.selectedTechnique || {}) ? (mg.selectedTechnique as MockupTechnique).maxHeight : null}
                    // CRITICAL: Dimensões físicas vêm de dimensions.height_cm (mapeado do banco externo),
                    // NÃO de metadata.height_mm (campo legado, quase sempre null).
                    // Para garrafas cilíndricas, diameter_cm é usado como largura.
                    // Corrigido em 2026-02-17 — NÃO REVERTER.
                    productHeightCm={mg.selectedProduct?.dimensions?.height_cm ?? (mg.selectedProduct?.metadata?.height_mm ? mg.selectedProduct.metadata.height_mm / 10 : null)}
                    productWidthCm={mg.selectedProduct?.dimensions?.width_cm ?? mg.selectedProduct?.dimensions?.diameter_cm ?? (mg.selectedProduct?.metadata?.width_mm ? mg.selectedProduct.metadata.width_mm / 10 : null)}
                    onPositionChange={(x, y) => mg.updateActiveArea({ positionX: x, positionY: y })}
                    onSizeChange={(w, h) => mg.updateActiveArea({ logoWidth: w, logoHeight: h })}
                    onRotationChange={(r) => mg.updateActiveArea({ logoRotation: r })}
                    onLogoScaleChange={(s) => mg.updateActiveArea({ logoScale: s })}
                    techniqueColorConfig={mg.techniqueColorConfig}
                    onColorConfigClick={() => setColorConfigDialogOpen(true)}
                    headerActions={
                      <MockupLayoutButtons
                        generatedMockup={mg.generatedMockup}
                        product={mg.selectedProduct ? {
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
                        } : null}
                        technique={mg.selectedTechnique ? {
                          name: mg.selectedTechnique.name,
                          code: mg.selectedTechnique.code,
                          maxWidth: 'maxWidth' in mg.selectedTechnique ? (mg.selectedTechnique as MockupTechnique).maxWidth : null,
                          maxHeight: 'maxHeight' in mg.selectedTechnique ? (mg.selectedTechnique as MockupTechnique).maxHeight : null,
                          locationName: 'locationName' in mg.selectedTechnique ? (mg.selectedTechnique as MockupTechnique).locationName : null,
                        } : null}
                        client={mg.selectedClient}
                        seller={profile ? { name: profile.full_name || "—", email: profile.email || undefined } : null}
                        activeArea={mg.activeArea || null}
                        productHeightCm={mg.selectedProduct?.dimensions?.height_cm ?? (mg.selectedProduct?.metadata?.height_mm ? mg.selectedProduct.metadata.height_mm / 10 : null)}
                        productWidthCm={mg.selectedProduct?.dimensions?.width_cm ?? mg.selectedProduct?.dimensions?.diameter_cm ?? (mg.selectedProduct?.metadata?.width_mm ? mg.selectedProduct.metadata.width_mm / 10 : null)}
                        pantoneColors={mg.logoColorAnalysis.colors}
                        colorsCount={mg.techniqueColorConfig?.colorCount}
                        onStaticGenerated={async (dataUrl, extra) => {
                          if (mg.activeArea) {
                            const recordId = await mg.saveMockupToHistory(dataUrl, mg.activeArea, extra);
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
                  <MockupEmptyState />
                )}

                {/* Generated Result */}
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



                {/* Batch results */}
                {mg.generatedBatchMockups.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Todas as áreas ({mg.generatedBatchMockups.length})
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {mg.generatedBatchMockups.map((batch, idx) => (
                        <div key={idx} className="border border-border/30 rounded-lg overflow-hidden bg-card">
                          
<img src={batch.url} alt={batch.areaName} className="w-full aspect-square object-contain"  loading="lazy"/>
                          <div className="p-2 text-center">
                            <Badge variant="secondary" className="text-[10px]">{batch.areaName}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </Suspense>
          </TabsContent>

          <TabsContent value="history">
            <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}>
              <MockupHistoryPanel
                mockupHistory={mg.mockupHistory}
                isLoading={mg.isLoadingHistory}
                clients={mg.historyClients}
                techniques={mg.techniques}
                onLoadFromHistory={mg.loadFromHistory}
                onDownload={mg.downloadMockup}
                onDelete={(id) => {
                  mg.setMockupToDelete(id);
                  mg.setDeleteDialogOpen(true);
                }}
                onShare={mg.handleShareMockup}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>

      <TechniqueChangeDialog
        open={techniqueChangeDialogOpen}
        onOpenChange={setTechniqueChangeDialogOpen}
        fromName={mg.selectedTechnique?.name}
        toName={pendingTechnique?.name}
        hasGeneratedMockup={!!mg.generatedMockup}
        onConfirm={confirmTechniqueChange}
        onCancel={() => setPendingTechnique(null)}
      />

      <DeleteMockupDialog
        open={mg.deleteDialogOpen}
        onOpenChange={mg.setDeleteDialogOpen}
        onConfirm={mg.deleteMockup}
      />

      {/* Mobile FAB removed - only AI Assistant remains */}

      {/* Technique Color Configuration Dialog */}
      <Suspense fallback={null}>
        <TechniqueColorConfigDialog
          open={colorConfigDialogOpen}
          onOpenChange={setColorConfigDialogOpen}
          techniqueName={mg.selectedTechnique?.name || ""}
          techniqueCode={mg.selectedTechnique?.code}
          detectedColors={mg.logoColorAnalysis.colors}
          currentConfig={mg.techniqueColorConfig}
          onConfirm={(config) => {
            mg.setTechniqueColorConfig(config);
            toast.success(
              config.category === "laser"
                ? `Tom ${config.laserTone === "claro" ? "claro" : "escuro"} selecionado`
                : config.category === "serigrafia"
                  ? `${config.colorCount} cor${(config.colorCount || 1) > 1 ? "es" : ""} configurada${(config.colorCount || 1) > 1 ? "s" : ""}`
                  : "Policromia (Full Color)",
              { duration: 2000 }
            );
          }}
        />
      </Suspense>

      {/* AI Assistant */}
      <Suspense fallback={null}>
        <AIMockupAssistant
          productName={mg.selectedProduct?.name}
          techniqueName={mg.selectedTechnique?.name}
        />
      </Suspense>
    </MainLayout>
  );
}
