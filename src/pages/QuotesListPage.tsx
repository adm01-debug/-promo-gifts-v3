import { useState, useMemo, useEffect } from "react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Plus,
  Search,
  BookTemplate,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { format } from "date-fns";
import { EmptyState } from "@/components/common/EmptyState";
import { QuoteCardSkeleton } from "@/components/common/ContextualSkeleton";
import { FadeInView, AnimatedCounter } from "@/components/common/MicroInteractions";
import { QuotesConfigurableList } from "@/components/quotes/QuotesConfigurableList";
import { QuotesStatusChips } from "@/components/quotes/QuotesStatusChips";
import { QuotesFunnelChart } from "@/components/quotes/QuotesFunnelChart";
import { useQuoteFunnel } from "@/hooks/useQuoteFunnel";
import { useQuoteViewedMap } from "@/hooks/useQuoteViewedMap";
import { cn } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "expiring";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "highest", label: "Maior valor" },
  { value: "lowest", label: "Menor valor" },
  { value: "expiring", label: "Vencimento próximo" },
];

export default function QuotesListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const { 
    quotes, totalCount, isLoading, error, deleteQuote, duplicateQuote, updateQuoteStatus, 
    bulkUpdateStatus, bulkDeleteQuotes 
  } = useQuotes({
    search: searchTerm,
    status: statusFilter,
    page,
    pageSize
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = totalCount;
    const approved = quotes.filter(q => q.status === "approved").length;
    const pending = quotes.filter(q => ["pending", "sent"].includes(q.status)).length;
    const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const approvedValue = quotes.filter(q => q.status === "approved").reduce((sum, q) => sum + (q.total || 0), 0);
    const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, approved, pending, totalValue, approvedValue, conversionRate };
  }, [quotes, totalCount]);

  // ── Funil + ciclo médio ──
  const allQuoteIds = useMemo(() => quotes.map((q) => q.id!).filter(Boolean), [quotes]);
  const allViewedMap = useQuoteViewedMap(allQuoteIds);
  const funnelData = useQuoteFunnel(quotes, allViewedMap);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteQuote(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteIds.length > 0) {
      await bulkDeleteQuotes(bulkDeleteIds);
      setBulkDeleteIds([]);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-4 pb-24 md:pb-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <FileText className="h-7 w-7 text-primary" />
              Orçamentos
            </h1>
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Sincronizando orçamentos...</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 mt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <QuoteCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const hasActiveFilters = !!searchTerm || statusFilter !== "all";
  const handleClearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSortBy("newest");
    setPage(1);
  };

  return (
    <>
      <PageSEO title="Orçamentos" description="Gerencie seus orçamentos. Crie, edite e acompanhe propostas comerciais." path="/orcamentos" />
      <TooltipProvider>
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <FadeInView>
              <div>
                <h1 data-testid="page-title-orcamentos" className="text-xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-7 w-7" />
                  Orçamentos
                </h1>
                <p className="text-muted-foreground mt-1">
                  <AnimatedCounter value={totalCount} /> orçamento(s) encontrado(s)
                </p>
              </div>
            </FadeInView>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/orcamentos/templates")}>
                <BookTemplate className="h-4 w-4 mr-2" />
                Templates
              </Button>
              <Button data-testid="quote-new-button" onClick={() => navigate("/orcamentos/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="sm:col-span-2 md:col-span-1 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-11 w-11 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 ring-1 ring-primary/30">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Página</p>
                  <p className="text-lg font-display font-extrabold text-foreground truncate">{formatCurrency(kpis.totalValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Aprovados (Pg)</p>
                  <p className="text-sm font-bold text-foreground">{kpis.approved} <span className="text-xs font-normal text-muted-foreground">({formatCurrency(kpis.approvedValue)})</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pendentes (Pg)</p>
                  <p className="text-sm font-bold text-foreground">{kpis.pending}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-info/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-info" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground">{kpis.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {quotes.length > 0 && <QuotesFunnelChart data={funnelData} />}

          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-destructive">Módulo de orçamentos indisponível</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente ou empresa..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <QuotesStatusChips quotes={quotes} value={statusFilter} onChange={handleStatusChange} />

          <div className="space-y-4">
            <ScrollArea className="h-[calc(100vh-380px)] min-h-[400px]">
              {quotes.length === 0 && !isLoading ? (
                <EmptyState
                  variant="quotes"
                  title={hasActiveFilters ? "Nenhum resultado para esses filtros" : "Nenhum orçamento encontrado"}
                  description={
                    hasActiveFilters
                      ? "Ajuste a busca ou os chips de status, ou limpe todos os filtros."
                      : "Crie seu primeiro orçamento e comece a vender."
                  }
                  action={
                    hasActiveFilters
                      ? { label: "Limpar filtros", onClick: handleClearFilters }
                      : { label: "Criar Orçamento", onClick: () => navigate("/orcamentos/novo") }
                  }
                />
              ) : (
                <div className={cn("transition-opacity duration-200", isLoading && "opacity-50")}>
                  <QuotesConfigurableList
                    quotes={quotes}
                    onDelete={(id) => setDeleteConfirmId(id)}
                    onBulkDelete={(ids) => setBulkDeleteIds(ids)}
                    onBulkStatusChange={async (ids, status) => {
                      const ok = await bulkUpdateStatus(ids, status as any);
                      if (ok && status === "approved") {
                        confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ["hsl(25,100%,50%)", "hsl(142,71%,45%)", "hsl(217,91%,60%)"] });
                      }
                    }}
                    onBulkExport={(ids) => {
                      const selected = quotes.filter((q) => ids.includes(q.id!));
                      import("@/utils/excelExport").then(({ exportToExcel }) => {
                        exportToExcel(
                          selected.map((q) => ({
                            Número: q.quote_number,
                            Empresa: q.client_company || "",
                            Contato: q.client_name || "",
                            Status: q.status,
                            Valor: q.total || 0,
                            Data: q.created_at ? format(new Date(q.created_at), "dd/MM/yyyy") : "",
                          })),
                          "orcamentos_selecionados"
                        );
                        toast.success(`${ids.length} orçamento(s) exportado(s)`);
                      });
                    }}
                    onDuplicate={(id) => duplicateQuote(id)}
                    onMarkApproved={async (id) => {
                      const ok = await updateQuoteStatus(id, "approved");
                      if (ok) {
                        confetti({
                          particleCount: 80,
                          spread: 60,
                          origin: { y: 0.7 },
                          colors: ["hsl(25,100%,50%)", "hsl(142,71%,45%)", "hsl(217,91%,60%)"],
                        });
                      }
                    }}
                  />
                </div>
              )}
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Mostrando <span className="font-medium">{(page - 1) * pageSize + 1}</span> a <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> de <span className="font-medium">{totalCount}</span> orçamentos
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || isLoading}
                  >
                    Próximo <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={bulkDeleteIds.length > 0} onOpenChange={() => setBulkDeleteIds([])}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Selecionados</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja excluir os {bulkDeleteIds.length} orçamentos selecionados?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir todos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </>
  );
}
