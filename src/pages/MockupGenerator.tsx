/**
 * MockupGenerator — Refactored v4
 * 
 * Business logic extracted to useMockupGenerator hook.
 * This page component is now purely presentational.
 */

import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, Wand2, History, Sparkles, Cloud, CloudOff, AlertCircle, CheckCircle2, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LogoPositionEditor } from "@/components/mockup/LogoPositionEditor";
import { AIMockupAssistant } from "@/components/ai";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MockupWizard } from "@/components/mockup/MockupWizard";
import { MockupResultCard } from "@/components/mockup/MockupResultCard";
import { MockupConfigPanel } from "@/components/mockup/MockupConfigPanel";
import { MockupHistoryPanel } from "@/components/mockup/MockupHistoryPanel";
import { useKeyboardShortcuts } from "@/components/mockup/KeyboardShortcuts";
import { GenerateFAB } from "@/components/mockup/GenerateButton";
import { GeneratingOverlay } from "@/components/mockup/GeneratingOverlay";
import { useMockupGenerator } from "@/hooks/useMockupGenerator";

// ─── Component ───────────────────────────────────────────────────────

export default function MockupGenerator() {
  const mg = useMockupGenerator();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onGenerate: mg.generateMockup,
    onReset: mg.resetForm,
    onDownload: () => mg.downloadMockup(),
    canGenerate: !!(mg.selectedProduct && mg.selectedTechnique && mg.hasLogo),
    canDownload: !!mg.generatedMockup,
    isLoading: mg.isLoading,
  });

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <GeneratingOverlay
        isVisible={mg.isLoading}
        productName={mg.selectedProduct?.name}
        techniqueName={mg.selectedTechnique?.name}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border border-primary/20">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                <Sparkles className="h-7 w-7 text-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Gerador de Mockups
                </h1>
                <p className="text-muted-foreground mt-1">
                  Crie visualizações de produtos personalizados com IA
                </p>
              </div>
            </div>

            {/* Auto-save indicator + Undo/Redo */}
            <div className="flex items-center gap-2">
              {/* Undo/Redo buttons */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!mg.positionHistory.canUndo}
                        onClick={() => {
                          const state = mg.positionHistory.undo();
                          if (state) mg.updateActiveArea(state);
                        }}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Desfazer (Ctrl+Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!mg.positionHistory.canRedo}
                        onClick={() => {
                          const state = mg.positionHistory.redo();
                          if (state) mg.updateActiveArea(state);
                        }}
                      >
                        <Redo2 className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Refazer (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>
              </div>

              {mg.isDraftSaving ? (
                <Badge variant="secondary" className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Salvando...
                </Badge>
              ) : mg.lastSaved ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Badge variant="outline" className="flex items-center gap-1.5 cursor-default">
                        <Cloud className="h-3 w-3 text-green-500" />
                        Salvo
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Último salvamento: {format(mg.lastSaved, "HH:mm:ss", { locale: ptBR })}
                  </TooltipContent>
                </Tooltip>
              ) : mg.draftError ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Badge variant="destructive" className="flex items-center gap-1.5 cursor-default">
                        <CloudOff className="h-3 w-3" />
                        Erro ao salvar
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{mg.draftError}</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
          </div>
        </div>

        {/* Wizard Progress */}
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

        {/* Notices */}
        {mg.showDraftRestoredNotice && (
          <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">Rascunho restaurado</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
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

        {/* Tabs */}
        <Tabs value={mg.activeTab} onValueChange={mg.setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> Gerar Mockup
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico ({mg.mockupHistory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Config Panel */}
              <MockupConfigPanel
                techniques={mg.techniques}
                productSelection={mg.productSelection}
                selectedTechnique={mg.selectedTechnique}
                selectedClient={mg.selectedClient}
                isLoadingData={mg.isLoadingData}
                isLoading={mg.isLoading}
                personalizationAreas={mg.personalizationAreas}
                filteredTechniques={mg.filteredTechniques}
                onProductSelect={(sel) => {
                  mg.setProductSelection(sel);
                  mg.setGeneratedMockup(null);
                }}
                onTechniqueSelect={(t) => {
                  mg.setSelectedTechnique(t);
                  mg.setGeneratedMockup(null);
                }}
                onClientSelect={mg.setSelectedClient}
                onGenerate={mg.generateMockup}
                onReset={mg.resetForm}
                activeAreaId={mg.activeAreaId}
                onAreasChange={mg.setPersonalizationAreas}
                onActiveAreaChange={mg.setActiveAreaId}
                onLogoUpload={mg.handleAreaLogoUpload}
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
                    techniqueCode={mg.selectedTechnique?.code}
                    techniqueName={mg.selectedTechnique?.name}
                    maxWidth={'maxWidth' in (mg.selectedTechnique || {}) ? (mg.selectedTechnique as any).maxWidth : null}
                    maxHeight={'maxHeight' in (mg.selectedTechnique || {}) ? (mg.selectedTechnique as any).maxHeight : null}
                    onPositionChange={(x, y) => mg.updateActiveArea({ positionX: x, positionY: y })}
                    onSizeChange={(w, h) => mg.updateActiveArea({ logoWidth: w, logoHeight: h })}
                  />
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex items-center justify-center py-16">
                      <div className="text-center text-muted-foreground max-w-xs">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-primary/50" />
                        </div>
                        <p className="font-medium text-foreground mb-1">Selecione um produto</p>
                        <p className="text-sm mb-3">
                          Comece escolhendo uma empresa e produto no painel ao lado para posicionar o logo
                        </p>
                        <div className="flex flex-col gap-1.5 text-xs text-left mx-auto max-w-[200px]">
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">1</span>
                            Selecione a empresa
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">2</span>
                            Escolha o produto
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">3</span>
                            Defina a técnica
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">4</span>
                            Faça upload do logo
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                        <div key={idx} className="border rounded-lg overflow-hidden bg-card">
                          <img src={batch.url} alt={batch.areaName} className="w-full aspect-square object-contain" />
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
          </TabsContent>

          <TabsContent value="history">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={mg.deleteDialogOpen} onOpenChange={mg.setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mockup?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={mg.deleteMockup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile FAB */}
      <GenerateFAB
        onClick={mg.generateMockup}
        isLoading={mg.isLoading}
        isReady={!!(mg.selectedProduct && mg.selectedTechnique && mg.hasLogo)}
        disabled={!mg.selectedProduct || !mg.selectedTechnique || !mg.hasLogo || mg.isLoading}
      />

      {/* AI Assistant */}
      <AIMockupAssistant
        productName={mg.selectedProduct?.name}
        techniqueName={mg.selectedTechnique?.name}
      />
    </MainLayout>
  );
}
