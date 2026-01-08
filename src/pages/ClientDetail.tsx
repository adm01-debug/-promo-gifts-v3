import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  DollarSign,
  Calendar,
  TrendingUp,
  Clock,
  FileText,
  RefreshCw,
  History
} from "lucide-react";

import { ClientInteractionsTimeline } from "@/components/clients/ClientInteractionsTimeline";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BitrixClient {
  id: string;
  bitrix_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ramo: string | null;
  nicho: string | null;
  primary_color_name: string | null;
  primary_color_hex: string | null;
  total_spent: number | null;
  last_purchase_date: string | null;
  synced_at: string;
}

interface BitrixDeal {
  id: string;
  bitrix_id: string;
  title: string;
  value: number | null;
  currency: string | null;
  stage: string | null;
  close_date: string | null;
  created_at_bitrix: string | null;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<BitrixClient | null>(null);
  const [deals, setDeals] = useState<BitrixDeal[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDeals, setIsLoadingDeals] = useState(true);

  useEffect(() => {
    if (id) {
      loadClientData();
    }
  }, [id]);

  const loadClientData = async () => {
    setIsLoading(true);
    setIsLoadingDeals(true);
    
    try {
      // Carregar cliente pelo bitrix_id
      const { data: clientData, error: clientError } = await supabase
        .from("bitrix_clients")
        .select("*")
        .eq("bitrix_id", id)
        .maybeSingle();

      if (clientError) throw clientError;
      
      if (!clientData) {
        setClient(null);
        setIsLoading(false);
        setIsLoadingDeals(false);
        return;
      }

      setClient(clientData);
      setIsLoading(false);

      // Carregar deals do cliente
      const { data: dealsData, error: dealsError } = await supabase
        .from("bitrix_deals")
        .select("*")
        .eq("bitrix_client_id", id)
        .order("created_at_bitrix", { ascending: false });

      if (dealsError) throw dealsError;
      setDeals(dealsData || []);

      // Carregar orçamentos do cliente
      const { data: quotesData } = await supabase
        .from("quotes")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });
      setQuotes(quotesData || []);

      // Carregar pedidos do cliente
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });
      setOrders(ordersData || []);

      // Carregar conversas do cliente
      const { data: conversationsData } = await supabase
        .from("expert_conversations")
        .select("*")
        .eq("client_id", clientData.id)
        .order("created_at", { ascending: false });
      setConversations(conversationsData || []);

      // Carregar lembretes do cliente
      const { data: remindersData } = await supabase
        .from("follow_up_reminders")
        .select("*")
        .eq("client_id", clientData.id)
        .order("reminder_date", { ascending: false });
      setReminders(remindersData || []);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados";
      toast.error("Erro ao carregar cliente", { description: message });
    } finally {
      setIsLoading(false);
      setIsLoadingDeals(false);
    }
  };

  const formatCurrency = (value: number | null, currency: string = "BRL") => {
    if (value === null) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const getStageColor = (stage: string | null) => {
    if (!stage) return "secondary";
    const stageLower = stage.toLowerCase();
    if (stageLower.includes("ganho") || stageLower.includes("won")) return "default";
    if (stageLower.includes("perdido") || stageLower.includes("lost")) return "destructive";
    if (stageLower.includes("andamento") || stageLower.includes("progress")) return "outline";
    return "secondary";
  };

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-fade-in">
          <Skeleton className="h-8 w-64" />
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  // Not found state
  if (!client) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Building2 className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-display font-bold text-foreground">
            Cliente não encontrado
          </h1>
          <p className="text-muted-foreground">
            O cliente com ID "{id}" não existe no banco de dados.
          </p>
          <Button onClick={() => navigate("/clientes")}>Voltar para clientes</Button>
        </div>
      </MainLayout>
    );
  }

  // Calcular estatísticas dos deals
  const totalDealsValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const wonDeals = deals.filter(d => d.stage?.toLowerCase().includes("ganho") || d.stage?.toLowerCase().includes("won"));
  const totalWonValue = wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

  // Build timeline events
  const timelineEvents = useMemo(() => {
    const events: any[] = [];
    deals.forEach((deal) => {
      events.push({ id: `deal-${deal.id}`, type: "deal", title: deal.title, status: deal.stage, value: deal.value || 0, date: deal.created_at_bitrix || new Date().toISOString() });
    });
    quotes.forEach((quote) => {
      events.push({ id: `quote-${quote.id}`, type: "quote", title: `Orçamento ${quote.quote_number}`, status: quote.status, value: quote.total || 0, date: quote.created_at, metadata: { quoteId: quote.id } });
    });
    orders.forEach((order) => {
      events.push({ id: `order-${order.id}`, type: "order", title: `Pedido ${order.order_number}`, status: order.status, value: order.total || 0, date: order.created_at, metadata: { orderId: order.id } });
    });
    conversations.forEach((conv) => {
      events.push({ id: `conv-${conv.id}`, type: "conversation", title: conv.title, date: conv.created_at });
    });
    reminders.forEach((reminder) => {
      events.push({ id: `reminder-${reminder.id}`, type: "reminder", title: reminder.title, description: reminder.description, status: reminder.is_completed ? "completed" : "pending", date: reminder.reminder_date });
    });
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [deals, quotes, orders, conversations, reminders]);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Início</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/clientes">Clientes</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{client.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="mt-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-4">
              {/* Logo/Avatar do cliente */}
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl"
                style={{ backgroundColor: client.primary_color_hex || 'hsl(var(--primary))' }}
              >
                {client.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
                  {client.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {client.ramo && <Badge variant="outline">{client.ramo}</Badge>}
                  {client.nicho && <Badge variant="secondary">{client.nicho}</Badge>}
                </div>
              </div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={loadClientData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Informações de contato */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {client.email && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-sm font-medium text-foreground">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium text-foreground">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="text-sm font-medium text-foreground line-clamp-1">{client.address}</p>
                  </div>
                </div>
              )}
              {client.primary_color_hex && (
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg border border-border"
                    style={{ backgroundColor: client.primary_color_hex }}
                  />
                  <div>
                    <p className="text-xs text-muted-foreground">Cor Principal</p>
                    <p className="text-sm font-medium text-foreground">{client.primary_color_name || client.primary_color_hex}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Gasto</p>
                  <p className="text-xl font-display font-bold text-foreground">
                    {formatCurrency(client.total_spent)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total de Negócios</p>
                  <p className="text-xl font-display font-bold text-foreground">
                    {deals.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor em Negócios</p>
                  <p className="text-xl font-display font-bold text-foreground">
                    {formatCurrency(totalDealsValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Última Compra</p>
                  <p className="text-xl font-display font-bold text-foreground">
                    {client.last_purchase_date 
                      ? format(new Date(client.last_purchase_date), "dd/MM/yy", { locale: ptBR })
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline de Interações */}
        <ClientInteractionsTimeline events={timelineEvents} isLoading={isLoadingDeals} />

        {/* Histórico de Negócios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Negócios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingDeals ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : deals.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum negócio encontrado para este cliente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Criação</TableHead>
                      <TableHead>Data Fechamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell className="font-medium">{deal.title}</TableCell>
                        <TableCell className="text-success font-semibold">
                          {formatCurrency(deal.value, deal.currency || "BRL")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStageColor(deal.stage)}>
                            {deal.stage || "Sem status"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {deal.created_at_bitrix 
                            ? format(new Date(deal.created_at_bitrix), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {deal.close_date 
                            ? format(new Date(deal.close_date), "dd/MM/yyyy", { locale: ptBR })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            Última sincronização: {format(new Date(client.synced_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    </MainLayout>
  );
}
