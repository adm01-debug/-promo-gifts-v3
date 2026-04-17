/**
 * Business Intelligence — Central de inteligência comercial 360° por cliente.
 * Dentro de Ferramentas. Combina dados reais (quando disponíveis) + mocks didáticos.
 */
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Brain, Building2, MapPin, Tag, FileText, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClientSelector } from "@/components/bi/ClientSelector";
import { ClientOverview360 } from "@/components/bi/ClientOverview360";
import { ClientVsIndustryComparison } from "@/components/bi/ClientVsIndustryComparison";
import { ClientAffinityProducts } from "@/components/bi/ClientAffinityProducts";
import { IndustryTrendingProducts } from "@/components/bi/IndustryTrendingProducts";
import { EmpiricalRecommendations } from "@/components/bi/EmpiricalRecommendations";
import { useCrmCompany } from "@/hooks/useCrmCompanies";
import { getCompanyDisplayName } from "@/types/crm";

export default function BusinessIntelligencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialClient = searchParams.get("clientId");
  const [clientId, setClientId] = useState<string | null>(initialClient);

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

  return (
    <MainLayout>
      <PageSEO
        title="Business Intelligence"
        description="Inteligência comercial 360° por cliente: histórico, afinidade, tendências do setor e recomendações."
        path="/ferramentas/bi"
        noIndex
      />
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Business Intelligence</h1>
              <p className="text-xs text-muted-foreground">
                Inteligência comercial 360° · histórico, afinidade, tendência setorial
              </p>
            </div>
          </div>
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
            <CardContent className="p-12 text-center space-y-3">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Info className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-lg">Selecione um cliente</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Escolha uma empresa da sua carteira acima para gerar inteligência comercial personalizada:
                histórico de compras, afinidade por categoria, tendências do setor e recomendações curadas.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Zonas de inteligência */}
        {clientId && (
          <div className="space-y-4">
            <ClientOverview360 clientId={clientId} />
            <ClientVsIndustryComparison clientId={clientId} ramoAtividade={ramoAtividade} />
            <ClientAffinityProducts clientId={clientId} />
            <IndustryTrendingProducts ramoAtividade={ramoAtividade} clientId={clientId} />
            <EmpiricalRecommendations ramoAtividade={ramoAtividade} clientId={clientId} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
