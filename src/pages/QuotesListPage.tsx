import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Plus,
  MoreVertical,
  Eye,
  Trash2,
  Send,
  Search,
  Filter,
  RefreshCw,
  BookTemplate,
  Copy,
  Edit,
  BarChart3,
  LayoutGrid,
  List,
} from "lucide-react";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<
  Quote["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Rascunho", variant: "secondary" },
  pending: { label: "Pendente", variant: "outline" },
  sent: { label: "Enviado", variant: "default" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  expired: { label: "Expirado", variant: "secondary" },
};

export default function QuotesListPage() {
  const navigate = useNavigate();
  const { quotes, isLoading, deleteQuote, updateQuoteStatus, syncQuoteToBitrix, duplicateQuote } =
    useQuotes();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredQuotes = quotes.filter((quote) => {
    const matchesSearch =
      quote.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <FileText className="h-7 w-7" />
              Orçamentos
            </h1>
            <p className="text-muted-foreground mt-1">
              {filteredQuotes.length} orçamento(s) encontrado(s)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/orcamentos/templates")}>
              <BookTemplate className="h-4 w-4 mr-2" />
              Templates
            </Button>
            <Button onClick={() => navigate("/orcamentos/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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
        </div>

        {/* Quotes List */}
        <div className="grid gap-4">
          {filteredQuotes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum orçamento encontrado</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {searchTerm || statusFilter !== "all"
                    ? "Tente ajustar seus filtros"
                    : "Crie seu primeiro orçamento"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button className="mt-4" onClick={() => navigate("/orcamentos/novo")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Orçamento
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredQuotes.map((quote) => (
              <Card
                key={quote.id}
                className="card-interactive cursor-pointer"
                onClick={() => navigate(`/orcamentos/${quote.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          #{quote.quote_number}
                        </h3>
                        <Badge variant={statusConfig[quote.status].variant}>
                          {statusConfig[quote.status].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {quote.client_name || "Cliente não definido"}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatCurrency(quote.total || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      {quote.valid_until && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">Validade</p>
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/orcamentos/${quote.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/orcamentos/${quote.id}/editar`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateQuote(quote.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteConfirmId(quote.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
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
    </MainLayout>
  );
}
