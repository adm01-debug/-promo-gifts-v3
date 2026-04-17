/**
 * Business Intelligence — Central de inteligência comercial 360° por cliente.
 * Pós-Sprint 1+2+3: Health Score Hero · ChurnRiskBanner · Briefing · Copilot · Lookalikes.
 */
import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Brain, Building2, MapPin, Tag, FileText, Info, Sparkles, MessageSquare, Bot, GitCompare, Share2, HelpCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientSelector } from "@/components/bi/ClientSelector";
import { DEMO_CLIENT_ID, isDemoClient } from "@/lib/bi/demoClient";
import { ClientOverview360 } from "@/components/bi/ClientOverview360";
import { ClientVsIndustryComparison } from "@/components/bi/ClientVsIndustryComparison";
import { ClientAffinityProducts } from "@/components/bi/ClientAffinityProducts";
import { IndustryTrendingProducts } from "@/components/bi/IndustryTrendingProducts";
import { ClientSeasonalityHeatmap } from "@/components/bi/ClientSeasonalityHeatmap";
import { EmpiricalRecommendations } from "@/components/bi/EmpiricalRecommendations";
import { ExportDossierButton } from "@/components/bi/ExportDossierButton";
import { ClientHealthHero } from "@/components/bi/ClientHealthHero";
import { ChurnRiskBanner } from "@/components/bi/ChurnRiskBanner";
import { EnrichedOrdersTimeline } from "@/components/bi/EnrichedOrdersTimeline";
import { BIBriefingMode } from "@/components/bi/BIBriefingMode";
import { BIAiCopilot } from "@/components/bi/BIAiCopilot";
import { ClientLookalikes } from "@/components/bi/ClientLookalikes";
import { BundleSuggestions } from "@/components/bi/BundleSuggestions";
import { ExecutiveSummaryButton } from "@/components/bi/ExecutiveSummaryButton";
import { BITourGuide } from "@/components/bi/BITourGuide";
import { useSeasonalPeakNotifications } from "@/hooks/bi/useSeasonalPeakNotifications";
import { useClientSeasonality } from "@/hooks/bi/useClientSeasonality";
import { useCrmCompany } from "@/hooks/useCrmCompanies";
import { getCompanyDisplayName } from "@/types/crm";

export default function BusinessIntelligencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialClient = searchParams.get("clientId");
  const [clientId, setClientId] = useState<string | null>(initialClient);
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [tourForce, setTourForce] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleSelect = (id: string | null) => {
    setClientId(id);
    if (id) {
      setSearchParams({ clientId: id });
    } else {
      setSearchParams({});
    }
  };

  const { data: company } = useCrmCompany(clientId);
  const ramoAtividade = useMemo(() => company?.ramo_atividade ?? null, [company]);
  const clientName = useMemo(
    () => (company ? getCompanyDisplayName(company) : isDemoClient(clientId) ? "Acme Brindes (Demo)" : ""),
    [company, clientId],
  );
  const clientPhone = useMemo(() => {
    const c = company as { _deprecated_phone?: string | null; phones?: Array<{ phone_number?: string | null }> } | undefined;
    return c?.phones?.[0]?.phone_number ?? c?._deprecated_phone ?? null;
  }, [company]);

  const seas = useClientSeasonality(clientId, ramoAtividade);
  useSeasonalPeakNotifications({
    clientId,
    clientName,
    daysToNextPeak: seas.daysToNextPeak,
    nextPeakMonth: seas.nextPeakMonth,
  });

  const handleShare = async () => {
    if (!clientId) return;
    setSharing(true);
    try {
      const { data, error } = await supabase.functions.invoke("bi-share-dossier", {
        body: { clientId, clientName, ramoAtividade, expiresInDays: 7 },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!", { description: "Válido por 7 dias · read-only." });
      }
    } catch (err) {
      toast.error("Falha ao gerar link", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <MainLayout>
      <PageSEO
        title="Business Analytic"
        description="Inteligência comercial 360° por cliente: histórico, afinidade, tendências do setor e recomendações."
        path="/ferramentas/bi"
        noIndex
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header compacto */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Business Analytic</h1>
              <p className="text-xs text-muted-foreground">
                Inteligência comercial 360° · histórico, afinidade, tendência setorial
              </p>
            </div>
          </div>
          {clientId && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setTourForce(true)} title="Tour guiado">
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/ferramentas/bi/comparar?ids=${clientId}`)}>
                <GitCompare className="h-4 w-4" />
                Comparar
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleShare} disabled={sharing}>
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                Compartilhar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setBriefingOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                Briefing
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-violet-500/30 hover:bg-violet-500/10"
                onClick={() => setCopilotOpen(true)}
                data-tour="copilot"
              >
                <Bot className="h-4 w-4 text-violet-500" />
                Pergunte ao BI
              </Button>
              <ExecutiveSummaryButton clientId={clientId} clientName={clientName} ramoAtividade={ramoAtividade} />
              <ExportDossierButton clientId={clientId} />
            </div>
          )}
        </div>

        {/* Seletor de cliente */}
        <Card className="border-[1.5px]">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
              Cliente da carteira
            </label>
            <ClientSelector value={clientId} onChange={handleSelect} />

            {company && (
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{getCompanyDisplayName(company)}</span>
                </div>
                {company.cnpj && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-xs">{company.cnpj}</span>
                  </div>
                )}
                {ramoAtividade && (
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <Badge variant="secondary" className="text-xs">{ramoAtividade}</Badge>
                  </div>
                )}
                {company.cidade && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="text-xs">{company.cidade}{company.estado ? `/${company.estado}` : ""}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Empty state */}
        {!clientId && (
          <Card className="border-[1.5px] border-dashed">
            <CardContent className="p-12 text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg">Selecione um cliente</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Escolha uma empresa da sua carteira acima para gerar inteligência comercial personalizada:
                Health Score, próxima ação sugerida, afinidade, tendências do setor, lookalikes e recomendações curadas.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => handleSelect(DEMO_CLIENT_ID)}
                  variant="outline"
                  className="gap-2 border-[1.5px] border-violet-500/40 hover:bg-violet-500/10"
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Visualizar com dados demo
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Cliente fictício "Acme Brindes" para preview completo
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Demo banner */}
        {isDemoClient(clientId) && (
          <Card className="border-[1.5px] border-violet-500/40 bg-violet-500/5">
            <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="font-medium">Modo Demonstração</span>
                <span className="text-muted-foreground">
                  · Cliente fictício com dados simulados em todas as zonas
                </span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleSelect(null)}>
                Sair do modo demo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Zonas de inteligência */}
        {clientId && (
          <div className="space-y-4">
            {/* HERO — Health Score + insight cross-zona + CTA */}
            <ClientHealthHero
              clientId={clientId}
              ramoAtividade={ramoAtividade}
              clientName={clientName}
              data-tour="health-hero"
            />
            <div data-tour="health-hero" />

            <div data-tour="churn-banner">
              <ChurnRiskBanner
                clientId={clientId}
                clientName={clientName}
                clientPhone={clientPhone}
              />
            </div>

            <ClientOverview360 clientId={clientId} />
            <div data-tour="orders-timeline">
              <EnrichedOrdersTimeline clientId={clientId} />
            </div>

            <ClientVsIndustryComparison clientId={clientId} ramoAtividade={ramoAtividade} />
            <ClientAffinityProducts clientId={clientId} />
            <BundleSuggestions clientId={clientId} />
            <IndustryTrendingProducts ramoAtividade={ramoAtividade} clientId={clientId} />
            <div data-tour="seasonality">
              <ClientSeasonalityHeatmap clientId={clientId} ramoAtividade={ramoAtividade} />
            </div>
            <ClientLookalikes clientId={clientId} ramoAtividade={ramoAtividade} />
            <EmpiricalRecommendations ramoAtividade={ramoAtividade} clientId={clientId} />
          </div>
        )}
      </div>

      {clientId && <BITourGuide force={tourForce} onClose={() => setTourForce(false)} />}

            <ClientVsIndustryComparison clientId={clientId} ramoAtividade={ramoAtividade} />
            <ClientAffinityProducts clientId={clientId} />
            <BundleSuggestions clientId={clientId} />
            <IndustryTrendingProducts ramoAtividade={ramoAtividade} clientId={clientId} />
            <ClientSeasonalityHeatmap clientId={clientId} ramoAtividade={ramoAtividade} />
            <ClientLookalikes clientId={clientId} ramoAtividade={ramoAtividade} />
            <EmpiricalRecommendations ramoAtividade={ramoAtividade} clientId={clientId} />
          </div>
        )}
      </div>

      {/* Drawers globais */}
      {clientId && (
        <>
          <BIBriefingMode
            open={briefingOpen}
            onOpenChange={setBriefingOpen}
            clientId={clientId}
            clientName={clientName}
            ramoAtividade={ramoAtividade}
          />
          <BIAiCopilot
            open={copilotOpen}
            onOpenChange={setCopilotOpen}
            clientId={clientId}
            clientName={clientName}
            ramoAtividade={ramoAtividade}
          />
        </>
      )}
    </MainLayout>
  );
}
