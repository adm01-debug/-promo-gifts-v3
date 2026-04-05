/**
 * MagicUp — Gerador de Imagens Publicitárias com IA
 * 
 * v4: Refactored — logic extracted to useMagicUpState hook.
 * UI split into manageable sections.
 */

import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Upload, Loader2, MapPin, Paintbrush,
  ChevronRight, Wand2, Eye, EyeOff, Building2, Clock,
  Search, X, ChevronLeft,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProductSearchCombobox } from "@/components/mockup/ProductSearchCombobox";
import { PromptBank } from "@/components/magic-up/PromptBank";
import { PromptGenerator } from "@/components/magic-up/PromptGenerator";
import { AdImageResult } from "@/components/magic-up/AdImageResult";
import { cn } from "@/lib/utils";
import { getCompanyDisplayName } from "@/types/crm";
import { useMagicUpState } from "@/hooks/useMagicUpState";

// ─── Sub-components ──────────────────────────────────────────────────

function MagicUpSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-3 w-48 rounded bg-muted animate-pulse" />
          <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 w-16 rounded-lg bg-muted animate-pulse" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-24 w-full rounded-md bg-muted animate-pulse" />
          <div className="h-10 w-full rounded-md bg-muted animate-pulse" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        </div>
        <div className="aspect-square w-full rounded-lg bg-muted animate-pulse" />
        <div className="flex gap-2">
          <div className="h-9 flex-1 rounded-md bg-muted animate-pulse" />
          <div className="h-9 flex-1 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function MagicUpHeader({ variationsCount, historyCount }: { variationsCount: number; historyCount: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-accent/5 to-transparent p-6 border border-primary/20">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 ring-2 ring-primary/20">
            <Sparkles className="h-7 w-7 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Magic Up
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie imagens publicitárias profissionais com IA ✨
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {variationsCount > 1 && (
            <Badge variant="secondary" className="gap-1">
              {variationsCount} variações
            </Badge>
          )}
          {historyCount > 0 && (
            <Badge variant="outline" className="gap-1.5">
              <Clock className="h-3 w-3" />
              {historyCount} geradas
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function MagicUpProgress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {["Produto", "Logo", "Cenário", "Gerar"].map((label, i) => {
        const s = i + 1;
        const done = step > s;
        const active = step === s;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all flex-1",
              done ? "border-primary/30 bg-primary/5 text-primary" :
              active ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30" :
              "border-border bg-muted/30 text-muted-foreground"
            )}>
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                done ? "bg-primary text-primary-foreground" :
                active ? "bg-primary/20 text-primary" :
                "bg-muted text-muted-foreground"
              )}>
                {done ? "✓" : s}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < 3 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function MagicUp() {
  const m = useMagicUpState();

  return (
    <MainLayout>
      <PageSEO title="MagicUp — Gerador de Imagens IA" description="Crie imagens publicitárias profissionais com inteligência artificial." path="/magic-up" />
      <div className="space-y-6">
        <MagicUpHeader variationsCount={m.variations.length} historyCount={m.history.length} />
        <MagicUpProgress step={m.step} />

        {m.loadingProducts && <MagicUpSkeleton />}

        {!m.loadingProducts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Configuration */}
          <div className="space-y-4">
            {/* Client (CRM) */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Empresa
                  <Badge variant="outline" className="text-[9px] ml-1">Opcional</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Busque na base de 51k+ empresas do CRM
                </CardDescription>
              </CardHeader>
              <CardContent>
                {m.selectedClient ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                    {m.selectedClient.logo_url && (
                      
<img src={m.selectedClient.logo_url} alt="" className="w-8 h-8 rounded object-contain bg-background border" loading="lazy" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.selectedClient.name}</p>
                      {m.selectedClient.ramo_atividade && (
                        <p className="text-[10px] text-muted-foreground">{m.selectedClient.ramo_atividade}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={m.handleClearClient} aria-label="Fechar"><X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar empresa por nome..."
                      value={m.clientSearch}
                      onChange={(e) => { m.setClientSearch(e.target.value); m.setShowClientResults(true); }}
                      onFocus={() => m.setShowClientResults(true)}
                      className="pl-9 h-9"
                    />
                    {m.showClientResults && m.clientSearch.length >= 3 && (
                      <div className="absolute z-20 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {m.loadingClients ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Buscando...
                          </div>
                        ) : m.clientResults.length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada</div>
                        ) : (
                          m.clientResults.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent/50 flex items-center gap-2 text-sm"
                              onClick={() => m.handleSelectClient(c)}
                            >
                              {c.logo_url && (
                                
<img src={c.logo_url} alt="" className="w-6 h-6 rounded object-contain border bg-background" loading="lazy" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{getCompanyDisplayName(c)}</p>
                                {c.ramo_atividade && (
                                  <p className="text-[10px] text-muted-foreground">{c.ramo_atividade}</p>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 1: Product */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                  Produto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProductSearchCombobox
                  products={m.products}
                  selectedProduct={m.selectedProduct}
                  onSelect={(p) => m.handleSelectProduct(p)}
                  placeholder="Buscar produto por nome ou SKU..."
                />

                {m.selectedProduct && (
                  <div className="flex gap-4">
                    {m.currentImage && (
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-background border shrink-0">
                        
<img src={m.currentImage} alt={m.selectedProduct.name} className="w-full h-full object-contain" loading="lazy" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm font-medium truncate">{m.selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {m.selectedProduct.sku}</p>
                      {!m.loadingColors && m.colors.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.colors.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => m.setSelectedColor(m.selectedColor?.name === c.name ? null : c)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                                m.selectedColor?.name === c.name
                                  ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/30"
                                  : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                              )}
                              title={c.name}
                            >
                              <span className="w-2.5 h-2.5 rounded-full border border-border/30" style={{ backgroundColor: c.hex }} />
                              {c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {m.selectedProduct && m.sceneTab !== "ai" && !m.loadingPrintAreas && m.printAreas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> Local de Personalização
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {m.printAreas.map((area) => {
                        const label = [area.component_name, area.location_name].filter(Boolean).join(" — ") || area.area_code;
                        const isSelected = m.selectedLocationId === area.area_id;
                        return (
                          <button
                            key={area.area_id}
                            type="button"
                            onClick={() => m.setSelectedLocationId(isSelected ? null : area.area_id)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                              isSelected
                                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                                : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            <MapPin className="h-3 w-3" />
                            {label}
                            {area.max_width > 0 && (
                              <span className="text-[9px] opacity-60">{area.max_width}×{area.max_height}{area.unit}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {m.selectedProduct && m.sceneTab !== "ai" && m.availableTechniques.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Paintbrush className="h-3 w-3" /> Técnica
                    </Label>
                    <Select
                      value={m.selectedTechnique?.id || ""}
                      onValueChange={(v) => m.setSelectedTechnique(m.availableTechniques.find(t => t.id === v) || null)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {m.availableTechniques.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Logo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                  Logo do Cliente
                </CardTitle>
                {m.selectedClient?.logo_url && m.logoPreview === m.selectedClient.logo_url && (
                  <CardDescription className="text-xs">
                    ✓ Logo carregado automaticamente da empresa
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  m.logoPreview ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/50"
                )}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={m.handleLogoUpload}
                    disabled={m.logoUploading}
                    className="hidden"
                    id="magic-logo-upload"
                  />
                  <label htmlFor="magic-logo-upload" className="cursor-pointer flex flex-col items-center gap-2">
                    {m.logoUploading ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    ) : m.logoPreview ? (
                      <>
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-background border">
                          
<img src={m.logoPreview} alt="Logo" className="w-full h-full object-contain" loading="lazy" />
                        </div>
                        <Button variant="outline" size="sm" type="button">Trocar logo</Button>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <p className="text-sm font-medium">Clique para enviar o logo</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Máx. 10MB</p>
                      </>
                    )}
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Scene */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                  Cenário Publicitário
                </CardTitle>
                <CardDescription className="text-xs">
                  Use a IA para gerar cenários personalizados ou escolha do banco de prompts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg">
                  <button
                    type="button"
                    onClick={() => m.setSceneTab("ai")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                      m.sceneTab === "ai"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Gerar com IA
                  </button>
                  <button
                    type="button"
                    onClick={() => m.setSceneTab("bank")}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all",
                      m.sceneTab === "bank"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Banco de Prompts
                  </button>
                </div>

                {m.sceneTab === "ai" ? (
                  <PromptGenerator
                    productName={m.selectedProduct?.name}
                    productColor={m.selectedColor?.name}
                    clientName={m.selectedClient?.name}
                    clientSegment={m.selectedClient?.ramo_atividade}
                    brandColorName={m.selectedClient?.cor_primaria_nome}
                    printAreas={m.printAreas || []}
                    onSelectPrompt={(p) => m.setSelectedScene(p)}
                    selectedPrompt={m.selectedScene}
                    initialLocationId={m.selectedLocationId}
                    initialTechniqueId={m.selectedTechnique?.id || null}
                    onCustomizationChange={(info) => {
                      m.setSelectedLocationId(info.locationId);
                      if (info.techniqueId && info.techniqueName) {
                        const tech = m.availableTechniques.find(t => t.id === info.techniqueId);
                        m.setSelectedTechnique({ id: info.techniqueId, name: info.techniqueName, code: tech?.code || "" });
                      } else {
                        m.setSelectedTechnique(null);
                      }
                    }}
                  />
                ) : (
                  <PromptBank
                    selectedPrompt={m.selectedScene}
                    onSelect={(p) => m.setSelectedScene(p)}
                    productName={m.selectedProduct?.name}
                    clientSegment={m.selectedClient?.ramo_atividade}
                  />
                )}

                <div className="relative">
                  <Label className="text-xs text-muted-foreground mb-1 block">
                    Detalhes adicionais (complementa o cenário acima):
                  </Label>
                  <Textarea
                    value={m.additionalDetails}
                    onChange={(e) => m.setAdditionalDetails(e.target.value)}
                    placeholder="Ex: A pessoa deve estar sorrindo, ambiente com tons quentes, foco no produto..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                  {!m.selectedScene && m.additionalDetails.trim() && (
                    <p className="text-[10px] text-warning mt-1">
                      💡 Dica: selecione também um cenário acima para melhores resultados
                    </p>
                  )}
                </div>

                {(m.selectedScene || m.additionalDetails.trim()) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-muted-foreground">
                        {m.selectedScene && m.additionalDetails.trim()
                          ? `${m.selectedScene.title} + detalhes extras`
                          : m.selectedScene
                          ? m.selectedScene.title
                          : "Cenário personalizado"}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 gap-1 text-[10px]"
                        onClick={() => m.setShowPromptPreview(!m.showPromptPreview)}
                      >
                        {m.showPromptPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {m.showPromptPreview ? "Ocultar" : "Ver prompt completo"}
                      </Button>
                    </div>
                    {m.showPromptPreview && m.fullPromptPreview && (
                      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono bg-muted/50 rounded p-2.5 border">
                        {m.fullPromptPreview}
                      </pre>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={m.handleGenerate}
              disabled={!m.canGenerate || m.generating}
              className="w-full h-12 text-base gap-2"
              size="lg"
            >
              {m.generating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gerando com modelo Pro...
                </>
              ) : (
                <>
                  <Wand2 className="h-5 w-5" />
                  {m.variations.length > 0 ? "Gerar Nova Variação" : "Gerar Imagem Publicitária"}
                  {!m.canGenerate && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      {!m.selectedProduct ? "Selecione um produto" :
                       !m.logoPreview ? "Envie o logo" :
                       !m.effectivePrompt ? "Escolha um cenário" : ""}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>

          {/* Right: Result */}
          <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
            {m.variations.length > 1 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline" size="icon" aria-label="Voltar" className="h-8 w-8"
                  disabled={m.activeVariation === 0}
                  onClick={() => m.setActiveVariation(m.activeVariation - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1.5">
                  {m.variations.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => m.setActiveVariation(i)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        i === m.activeVariation ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>
                <Button
                  variant="outline" size="icon" aria-label="Avançar" className="h-8 w-8"
                  disabled={m.activeVariation === m.variations.length - 1}
                  onClick={() => m.setActiveVariation(m.activeVariation + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            <AdImageResult
              imageUrl={m.currentVariation?.imageUrl || null}
              isLoading={m.generating}
              productName={m.selectedProduct?.name}
              sceneName={m.selectedScene?.title}
              onDownload={m.handleDownload}
              onShare={m.handleShare}
              onRegenerate={m.handleGenerate}
              onToggleFavorite={m.currentVariation?.id ? m.handleToggleFavorite : undefined}
              isFavorite={m.currentVariation?.isFavorite}
              history={m.history}
              onSelectHistory={m.handleSelectHistory}
              onDeleteHistory={m.handleDeleteHistory}
              onToggleHistoryFavorite={m.handleToggleHistoryFavorite}
            />

            {m.variations.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {m.variations.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => m.setActiveVariation(i)}
                    className={cn(
                      "w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all",
                      i === m.activeVariation
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    
<img src={v.imageUrl} alt={`Variação ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </MainLayout>
  );
}
