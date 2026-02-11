import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { useClientFuzzySearch } from "@/hooks/useGenericFuzzySearch";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Building2,
  DollarSign,
  Calendar,
  ChevronRight,
  RefreshCw,
  Filter,
  X,
  BarChart3,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClientRFMSegmentation } from "@/components/clients/ClientRFMSegmentation";
import { DynamicBreadcrumbs } from "@/components/navigation/DynamicBreadcrumbs";
import { EmptyState } from "@/components/common/EmptyState";
import { ClientCardSkeleton } from "@/components/common/ContextualSkeleton";
import { FadeInView, HoverCard, AnimatedCounter } from "@/components/common/MicroInteractions";
import { GlassCard } from "@/components/common/GlassElements";

interface BitrixClient {
  id: string;
  bitrix_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  ramo: string | null;
  nicho: string | null;
  primary_color_name: string | null;
  primary_color_hex: string | null;
  total_spent: number | null;
  last_purchase_date: string | null;
  synced_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function ClientList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("list");
  const [clients, setClients] = useState<BitrixClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [ramoFilter, setRamoFilter] = useState<string>("all");
  const [nichoFilter, setNichoFilter] = useState<string>("all");

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bitrix_clients")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar clientes";
      toast.error("Erro ao carregar clientes", { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  // Extrair ramos e nichos únicos para os filtros
  const { uniqueRamos, uniqueNichos } = useMemo(() => {
    const ramos = new Set<string>();
    const nichos = new Set<string>();

    clients.forEach((client) => {
      if (client.ramo) ramos.add(client.ramo);
      if (client.nicho) nichos.add(client.nicho);
    });

    return {
      uniqueRamos: Array.from(ramos).sort(),
      uniqueNichos: Array.from(nichos).sort(),
    };
  }, [clients]);

  // Busca fuzzy de clientes - tolerante a erros de digitação
  const { results: fuzzyResults, hasSearch } = useClientFuzzySearch(clients, searchQuery);

  // Filtrar clientes (aplicar filtros de ramo/nicho sobre resultados fuzzy)
  const filteredClients = useMemo(() => {
    const baseList = hasSearch ? fuzzyResults : clients;
    
    return baseList.filter((client) => {
      const matchesRamo = ramoFilter === "all" || client.ramo === ramoFilter;
      const matchesNicho = nichoFilter === "all" || client.nicho === nichoFilter;

      return matchesRamo && matchesNicho;
    });
  }, [clients, fuzzyResults, hasSearch, ramoFilter, nichoFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredClients, currentPage]);

  // Reset page quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, ramoFilter, nichoFilter]);

  const formatCurrency = (value: number | null) => {
    if (value === null) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setRamoFilter("all");
    setNichoFilter("all");
  };

  const hasActiveFilters = searchQuery || ramoFilter !== "all" || nichoFilter !== "all";

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Dynamic Breadcrumbs */}
        <DynamicBreadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <FadeInView>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-foreground">
                Clientes
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                {isLoading ? "Carregando..." : <><AnimatedCounter value={filteredClients.length} /> cliente(s) encontrado(s)</>}
              </p>
            </div>
          </FadeInView>
          <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={loadClients} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <Users className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="rfm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Análise RFM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
            {/* Search & Filters */}
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="search-bar flex-1">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  type="search"
                  placeholder="Buscar clientes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={ramoFilter} onValueChange={setRamoFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <Filter className="h-4 w-4 mr-2 shrink-0" />
                    <SelectValue placeholder="Ramo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os ramos</SelectItem>
                    {uniqueRamos.map((ramo) => (
                      <SelectItem key={ramo} value={ramo}>
                        {ramo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={nichoFilter} onValueChange={setNichoFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Nicho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os nichos</SelectItem>
                    {uniqueNichos.map((nicho) => (
                      <SelectItem key={nicho} value={nicho}>
                        {nicho}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Client list */}
            {isLoading ? (
              <div className="grid gap-3 sm:gap-4">
                {[...Array(5)].map((_, i) => (
                  <ClientCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {paginatedClients.map((client, index) => (
                  <FadeInView key={client.id} delay={index * 0.05}>
                    <HoverCard liftAmount={4}>
                      <div
                        className="card-interactive p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-pointer"
                        onClick={() => navigate(`/clientes/${client.id}`)}
                      >
                    {/* Logo */}
                    <div
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-white font-display font-bold text-base sm:text-xl shrink-0"
                      style={{ backgroundColor: client.primary_color_hex || "hsl(var(--primary))" }}
                    >
                      {client.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-sm sm:text-base text-foreground truncate">
                        {client.name}
                      </h3>
                      <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                        {client.ramo && (
                          <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2">
                            {client.ramo}
                          </Badge>
                        )}
                        {client.nicho && (
                          <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 hidden sm:inline-flex">
                            {client.nicho}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Stats - Show price on mobile, full stats on desktop */}
                    <div className="flex items-center gap-2 sm:hidden">
                      <span className="text-xs font-semibold text-success">
                        {formatCurrency(client.total_spent)}
                      </span>
                    </div>
                    
                    <div className="hidden sm:flex items-center gap-4 lg:gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-success">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold text-sm lg:text-base">{formatCurrency(client.total_spent)}</span>
                        </div>
                        <p className="text-[10px] lg:text-xs text-muted-foreground">Total gasto</p>
                      </div>

                      {client.last_purchase_date && (
                        <div className="text-right hidden lg:block">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">
                              {format(new Date(client.last_purchase_date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Última compra</p>
                        </div>
                      )}

                      {/* Color swatch */}
                      {client.primary_color_hex && (
                        <div
                          className="w-5 h-5 lg:w-6 lg:h-6 rounded-full border border-border hidden md:block"
                          style={{ backgroundColor: client.primary_color_hex }}
                          title={client.primary_color_name || "Cor principal"}
                        />
                      )}
                    </div>

                        <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                      </div>
                    </HoverCard>
                  </FadeInView>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && filteredClients.length === 0 && (
              <EmptyState
                variant="clients"
                title="Nenhum cliente encontrado"
                description={
                  clients.length === 0
                    ? "Importe os dados do CRM para ver os clientes"
                    : "Tente ajustar sua busca ou filtros"
                }
                action={
                  clients.length === 0
                    ? { label: "Ir para Sincronização", onClick: () => navigate("/bitrix-sync") }
                    : undefined
                }
              />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={
                        currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </TabsContent>

          <TabsContent value="rfm" className="mt-6">
            <ClientRFMSegmentation />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
