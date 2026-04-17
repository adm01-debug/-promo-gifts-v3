/**
 * ClientCategoryRadar — Zona PROTAGONISTA do BI.
 *
 * Compara lado a lado:
 *  - "O que [Cliente] compra"  → top categorias por receita do cliente
 *  - "O que o setor compra"    → top categorias do ramo
 *
 * Destaca:
 *  - Categorias super-índex (cliente compra muito mais que o setor)
 *  - Categorias gap (setor compra muito, cliente nada/quase nada) → oportunidades
 *
 * Cada categoria expansível mostra produtos reais já comprados + sugestões.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Radar,
  TrendingUp,
  Target,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Package,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useClientCategoryAffinity, type CategoryAggregate } from "@/hooks/bi/useClientCategoryAffinity";
import {
  useIndustryCategoryTrends,
  type IndustryCategoryAggregate,
} from "@/hooks/bi/useIndustryCategoryTrends";
import type { BICategorySlug } from "@/lib/bi/categoryResolver";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
  clientName?: string;
}

interface MergedRow {
  slug: BICategorySlug | "outros";
  label: string;
  clientShare: number;
  industryShare: number;
  ratio: number; // clientShare / industryShare
  status: "super" | "aligned" | "underindex" | "gap" | "client-only";
  clientCat?: CategoryAggregate;
  industryCat?: IndustryCategoryAggregate;
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v.toFixed(0)}%`;

function classify(clientShare: number, industryShare: number): MergedRow["status"] {
  if (industryShare === 0 && clientShare > 0) return "client-only";
  if (clientShare === 0 && industryShare >= 8) return "gap";
  if (industryShare === 0) return "aligned";
  const ratio = clientShare / industryShare;
  if (ratio >= 1.8) return "super";
  if (ratio <= 0.4) return "underindex";
  return "aligned";
}

const STATUS_META: Record<MergedRow["status"], { label: string; chip: string; bar: string }> = {
  super: {
    label: "Super-índex",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    bar: "[&>div]:bg-emerald-500",
  },
  aligned: {
    label: "Alinhado",
    chip: "bg-muted text-muted-foreground border-border",
    bar: "[&>div]:bg-primary",
  },
  underindex: {
    label: "Sub-índex",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    bar: "[&>div]:bg-amber-500",
  },
  gap: {
    label: "GAP — Oportunidade",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
    bar: "[&>div]:bg-violet-500",
  },
  "client-only": {
    label: "Exclusivo do cliente",
    chip: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    bar: "[&>div]:bg-blue-500",
  },
};

export function ClientCategoryRadar({ clientId, ramoAtividade, clientName }: Props) {
  const navigate = useNavigate();
  const client = useClientCategoryAffinity(clientId);
  const industry = useIndustryCategoryTrends(ramoAtividade);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo<MergedRow[]>(() => {
    const map = new Map<string, MergedRow>();

    for (const c of client.categories) {
      map.set(c.slug, {
        slug: c.slug,
        label: c.label,
        clientShare: c.revenueSharePct,
        industryShare: 0,
        ratio: 0,
        status: "client-only",
        clientCat: c,
      });
    }
    for (const ind of industry.categories) {
      const cur = map.get(ind.slug);
      if (cur) {
        cur.industryShare = ind.revenueSharePct;
        cur.industryCat = ind;
      } else {
        map.set(ind.slug, {
          slug: ind.slug,
          label: ind.label,
          clientShare: 0,
          industryShare: ind.revenueSharePct,
          ratio: 0,
          status: "gap",
          industryCat: ind,
        });
      }
    }

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        ratio: r.industryShare > 0 ? r.clientShare / r.industryShare : 0,
        status: classify(r.clientShare, r.industryShare),
      }))
      .sort((a, b) => {
        // Ordem: gap primeiro (oportunidade), depois super-índex, depois por share total
        const score = (r: MergedRow) =>
          (r.status === "gap" ? 1000 : 0) +
          (r.status === "super" ? 500 : 0) +
          r.clientShare +
          r.industryShare;
        return score(b) - score(a);
      })
      .slice(0, 8);
  }, [client.categories, industry.categories]);

  const isLoading = client.isLoading || industry.isLoading;
  const isMock = client.isMock || industry.isMock;
  const opportunities = rows.filter((r) => r.status === "gap").length;
  const superIndex = rows.filter((r) => r.status === "super").length;

  const handleDrillDown = (row: MergedRow) => {
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", clientId);
    if (row.label) params.set("category", row.label);
    navigate(`/orcamentos/novo?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <Card className="border-[1.5px]">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-72" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[1.5px] ring-1 ring-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5 overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Radar className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base sm:text-lg leading-tight">
                Categorias que importam para {clientName || "este cliente"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparação direta: o que o cliente compra × o que o setor{" "}
                {ramoAtividade && <span className="font-medium">({ramoAtividade}) </span>}
                costuma comprar
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {opportunities > 0 && (
              <Badge className="gap-1 bg-violet-500 text-white text-[10px] hover:bg-violet-600">
                <Target className="h-3 w-3" />
                {opportunities} GAP
              </Badge>
            )}
            {superIndex > 0 && (
              <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]">
                <TrendingUp className="h-3 w-3" />
                {superIndex} super-índex
              </Badge>
            )}
            {isMock ? (
              <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-700 dark:text-amber-300 text-[10px]">
                <Sparkles className="h-3 w-3" /> Simulado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> Dados reais
              </Badge>
            )}
          </div>
        </div>

        {/* Lista comparativa */}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Sem histórico suficiente para comparar categorias.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const meta = STATUS_META[row.status];
              const isOpen = expanded === row.slug;
              const max = Math.max(row.clientShare, row.industryShare, 1);
              return (
                <Collapsible
                  key={row.slug}
                  open={isOpen}
                  onOpenChange={(o) => setExpanded(o ? row.slug : null)}
                >
                  <div
                    className={cn(
                      "rounded-xl border-[1.5px] bg-background/70 backdrop-blur transition-all",
                      isOpen ? "border-primary/40 shadow-sm" : "border-border hover:border-primary/30",
                    )}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full p-3 sm:p-4 text-left flex flex-col gap-2.5 group"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-display font-semibold text-sm sm:text-base truncate">
                              {row.label}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] gap-1 shrink-0", meta.chip)}>
                              {meta.label}
                            </Badge>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                              isOpen && "rotate-180",
                            )}
                          />
                        </div>

                        {/* Barras comparativas */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
                              <span className="uppercase tracking-wider font-medium">Cliente</span>
                              <span className="font-bold tabular-nums text-foreground">
                                {fmtPct(row.clientShare)}
                              </span>
                            </div>
                            <Progress
                              value={(row.clientShare / max) * 100}
                              className={cn("h-2", meta.bar)}
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
                              <span className="uppercase tracking-wider font-medium">Setor</span>
                              <span className="font-bold tabular-nums text-foreground">
                                {fmtPct(row.industryShare)}
                              </span>
                            </div>
                            <Progress
                              value={(row.industryShare / max) * 100}
                              className="h-2 [&>div]:bg-muted-foreground/60"
                            />
                          </div>
                        </div>

                        {/* Insight inline */}
                        {row.status === "gap" && (
                          <p className="text-xs text-violet-700 dark:text-violet-300 font-medium">
                            ⚡ O setor investe {fmtPct(row.industryShare)} aqui — este cliente, nada.
                          </p>
                        )}
                        {row.status === "super" && (
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                            🔥 Cliente compra {row.ratio.toFixed(1)}× mais que a média do setor.
                          </p>
                        )}
                        {row.status === "underindex" && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                            ↘ Cliente compra abaixo do padrão do setor — espaço para crescer.
                          </p>
                        )}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 border-t pt-3">
                        {/* Produtos reais do cliente nesta categoria */}
                        {row.clientCat && row.clientCat.topProducts.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              <Package className="h-3 w-3" />
                              Já comprados pelo cliente
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {row.clientCat.topProducts.slice(0, 3).map((p, i) => (
                                <div
                                  key={`${p.productId ?? i}`}
                                  className="p-2 rounded-md bg-muted/40 border text-xs"
                                >
                                  <div className="font-medium line-clamp-2 leading-tight min-h-[2rem]">
                                    {p.productName}
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                                    <span>{p.quantity.toLocaleString("pt-BR")} un</span>
                                    <span className="font-semibold text-foreground">
                                      {fmtBRL(p.revenue)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Produtos do setor (sugestões) */}
                        {row.industryCat && row.industryCat.topProducts.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                              <Users className="h-3 w-3" />
                              Top do setor nesta categoria
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              {row.industryCat.topProducts.slice(0, 3).map((p, i) => (
                                <div
                                  key={`${p.productId ?? i}-ind`}
                                  className="p-2 rounded-md bg-violet-500/5 border border-violet-500/20 text-xs"
                                >
                                  <div className="font-medium line-clamp-2 leading-tight min-h-[2rem]">
                                    {p.productName}
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                                    <span>{p.quantity.toLocaleString("pt-BR")} un</span>
                                    <span className="font-semibold text-foreground">
                                      {fmtBRL(p.avgPrice)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant={row.status === "gap" ? "default" : "outline"}
                          className="w-full gap-1.5"
                          onClick={() => handleDrillDown(row)}
                        >
                          {row.status === "gap"
                            ? `Criar orçamento explorando ${row.label}`
                            : `Reabrir ${row.label} no orçamento`}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
