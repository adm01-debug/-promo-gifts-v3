import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreVertical,
  Eye,
  Trash2,
  Search,
  Filter,
  BookTemplate,
  Copy,
  Edit,
  ArrowUpDown,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import Fuse from "fuse.js";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DynamicBreadcrumbs } from "@/components/navigation/DynamicBreadcrumbs";
import { EmptyState } from "@/components/common/EmptyState";
import { QuoteCardSkeleton } from "@/components/common/ContextualSkeleton";
import { FadeInView, AnimatedCounter } from "@/components/common/MicroInteractions";

// ── Status config with semantic colors ──
const statusConfig: Record<
  Quote["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  draft: { label: "Rascunho", variant: "secondary", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  pending: { label: "Pendente", variant: "outline", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  sent: { label: "Enviado", variant: "default", className: "bg-primary/15 text-primary border-primary/30" },
  approved: { label: "Aprovado", variant: "default", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rejected: { label: "Rejeitado", variant: "destructive", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  expired: { label: "Expirado", variant: "secondary", className: "bg-muted text-muted-foreground border-muted" },
};

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "expiring";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "highest", label: "Maior valor" },
  { value: "lowest", label: "Menor valor" },
  { value: "expiring", label: "Vencimento próximo" },
];

// ── Validity urgency helper ──
function getValidityInfo(validUntil: string | undefined | null) {
  if (!validUntil) return null;
  const date = new Date(validUntil);
  const days = differenceInDays(date, new Date());
  const expired = isPast(date);

  if (expired) return { label: "Vencido", color: "text-red-400", bgColor: "bg-red-500/10", urgent: true };
  if (days <= 3) return { label: `${days}d restante(s)`, color: "text-red-400", bgColor: "bg-red-500/10", urgent: true };
  if (days <= 7) return { label: `${days}d restantes`, color: "text-yellow-400", bgColor: "bg-yellow-500/10", urgent: true };
  return { label: format(date, "dd/MM/yyyy", { locale: ptBR }), color: "text-muted-foreground", bgColor: "", urgent: false };
}

export default function QuotesListPage() {
  const navigate = useNavigate();
  const { quotes, isLoading, deleteQuote, duplicateQuote } = useQuotes();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = quotes.length;
    const approved = quotes.filter(q => q.status === "approved").length;
    const pending = quotes.filter(q => ["pending", "sent"].includes(q.status)).length;
    const totalValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);
    const approvedValue = quotes.filter(q => q.status === "approved").reduce((sum, q) => sum + (q.total || 0), 0);
    const conversionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return { total, approved, pending, totalValue, approvedValue, conversionRate };
  }, [quotes]);

  // ── Fuse.js fuzzy search ──
  const quoteFuse = useMemo(() => {
    return new Fuse(quotes, {
      keys: [
        { name: "quote_number", weight: 0.4 },
        { name: "client_name", weight: 0.3 },
        { name: "client_company", weight: 0.2 },
        { name: "notes", weight: 0.1 },
      ],
      threshold: 0.4,
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    let results = quotes;

    if (searchTerm && searchTerm.length >= 2) {
      const fuseResults = quoteFuse.search(searchTerm);
      results = fuseResults.map((r) => r.item);
    }

    if (statusFilter !== "all") {
      results = results.filter((quote) => quote.status === statusFilter);
    }

    // Sort
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "oldest":
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case "highest":
          return (b.total || 0) - (a.total || 0);
        case "lowest":
          return (a.total || 0) - (b.total || 0);
        case "expiring": {
          const aDate = a.valid_until ? new Date(a.valid_until).getTime() : Infinity;
          const bDate = b.valid_until ? new Date(b.valid_until).getTime() : Infinity;
          return aDate - bDate;
        }
        default:
          return 0;
      }
    });

    return results;
  }, [quotes, searchTerm, statusFilter, quoteFuse, sortBy]);

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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <DynamicBreadcrumbs />
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-10 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <QuoteCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <TooltipProvider>
        <div className="space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <FadeInView>
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
                  <FileText className="h-7 w-7" />
                  Orçamentos
                </h1>
                <p className="text-muted-foreground mt-1">
                  <AnimatedCounter value={filteredQuotes.length} /> orçamento(s) encontrado(s)
                </p>
              </div>
            </FadeInView>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={() => navigate("/orcamentos/templates")}>
                    <BookTemplate className="h-4 w-4 mr-2" />
                    Templates
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Modelos pré-configurados para agilizar orçamentos</p>
                </TooltipContent>
              </Tooltip>
              <Button onClick={() => navigate("/orcamentos/novo")}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total em Aberto</p>
                  <p className="text-sm font-bold text-foreground truncate">{formatCurrency(kpis.totalValue)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                  <p className="text-sm font-bold text-foreground">{kpis.approved} <span className="text-xs font-normal text-muted-foreground">({formatCurrency(kpis.approvedValue)})</span></p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-sm font-bold text-foreground">{kpis.pending}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Conversão</p>
                  <p className="text-sm font-bold text-foreground">{kpis.conversionRate}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters + Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[170px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Quotes List — Compact */}
          <div className="grid gap-2">
            {filteredQuotes.length === 0 ? (
              <EmptyState
                variant="quotes"
                title="Nenhum orçamento encontrado"
                description={
                  searchTerm || statusFilter !== "all"
                    ? "Tente ajustar seus filtros"
                    : "Crie seu primeiro orçamento"
                }
                action={
                  !searchTerm && statusFilter === "all"
                    ? {
                        label: "Criar Orçamento",
                        onClick: () => navigate("/orcamentos/novo"),
                      }
                    : undefined
                }
              />
            ) : (
              filteredQuotes.map((quote, index) => {
                const validity = getValidityInfo(quote.valid_until);
                const hasClient = !!quote.client_name || !!quote.client_company;

                return (
                  <FadeInView key={quote.id} delay={index * 0.03}>
                    <Card
                      className="card-interactive cursor-pointer hover:border-primary/30 transition-all duration-200"
                      onClick={() => navigate(`/orcamentos/${quote.id}`)}
                    >
                      <CardContent className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          {/* Left: number + status + client */}
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm text-foreground whitespace-nowrap">
                                  #{quote.quote_number}
                                </h3>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 h-5 ${statusConfig[quote.status]?.className || ""}`}
                                >
                                  {statusConfig[quote.status]?.label}
                                </Badge>
                                {validity?.urgent && (
                                  <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${validity.bgColor} ${validity.color}`}>
                                    <AlertTriangle className="h-3 w-3" />
                                    {validity.label}
                                  </span>
                                )}
                              </div>
                              {hasClient ? (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {quote.client_company || quote.client_name}
                                </p>
                              ) : (
                                <button
                                  className="text-xs text-primary/70 hover:text-primary mt-0.5 flex items-center gap-1 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/orcamentos/${quote.id}/editar`);
                                  }}
                                >
                                  <UserPlus className="h-3 w-3" />
                                  Vincular cliente
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Right: value + validity + actions */}
                          <div className="flex items-center gap-4">
                            <div className="hidden sm:block text-right">
                              <p className="font-bold text-sm text-foreground">
                                {formatCurrency(quote.total || 0)}
                              </p>
                              {validity && !validity.urgent && (
                                <p className={`text-[10px] ${validity.color}`}>
                                  {validity.label}
                                </p>
                              )}
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/orcamentos/${quote.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/orcamentos/${quote.id}/editar`)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => duplicateQuote(quote.id!)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmId(quote.id!)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeInView>
                );
              })
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
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
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </MainLayout>
  );
}
