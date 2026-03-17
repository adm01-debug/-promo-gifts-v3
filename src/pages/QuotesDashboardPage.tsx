import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  Calendar,
  Users,
  Target,
  Hourglass,
  Building2,
  Eye,
  Link2,
  Send,
  Download,
} from "lucide-react";
import { useQuotes } from "@/hooks/useQuotes";
import { supabase } from "@/integrations/supabase/client";
import { selectCrm } from "@/lib/crm-db";
import { format, differenceInDays, differenceInHours, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Client {
  id: string;
  name: string;
}

const statusConfig = {
  draft: { label: "Rascunho", color: "hsl(var(--muted-foreground))" },
  pending: { label: "Pendente", color: "hsl(var(--warning))" },
  sent: { label: "Enviado", color: "hsl(var(--info))" },
  approved: { label: "Aprovado", color: "hsl(var(--success))" },
  rejected: { label: "Rejeitado", color: "hsl(var(--destructive))" },
  expired: { label: "Expirado", color: "hsl(var(--muted-foreground))" },
};

export default function QuotesDashboardPage() {
  const navigate = useNavigate();
  const { quotes, isLoading } = useQuotes();
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year">("month");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [tokenStats, setTokenStats] = useState<{
    total: number;
    viewed: number;
    responded: number;
  }>({ total: 0, viewed: 0, responded: 0 });

  // Fetch clients from CRM
  useEffect(() => {
    const fetchClients = async () => {
      setLoadingClients(true);
      try {
        const data = await selectCrm<Client>("companies", {
          select: "id,nome_fantasia",
          orderBy: "nome_fantasia",
          limit: 500,
        });
        setClients(data.map((c: any) => ({ id: c.id, name: c.nome_fantasia || c.id })));
      } catch (err) {
        console.error("Error fetching clients:", err);
      }
      setLoadingClients(false);
    };
    fetchClients();
  }, []);

  // Fetch approval token stats
  useEffect(() => {
    const fetchTokenStats = async () => {
      const { data } = await supabase
        .from("quote_approval_tokens")
        .select("id, viewed_at, responded_at");
      if (data) {
        setTokenStats({
          total: data.length,
          viewed: data.filter((t) => t.viewed_at).length,
          responded: data.filter((t) => t.responded_at).length,
        });
      }
    };
    fetchTokenStats();
  }, []);

  // Get unique clients from quotes for quick access
  const quotesClients = useMemo(() => {
    const clientMap = new Map<string, string>();
    quotes.forEach((q) => {
      if (q.client_id && q.client_name) {
        clientMap.set(q.client_id, q.client_name);
      }
    });
    return Array.from(clientMap, ([id, name]) => ({ id, name }));
  }, [quotes]);

  const selectedClientName = useMemo(() => {
    if (selectedClientId === "all") return null;
    return clients.find((c) => c.id === selectedClientId)?.name || 
           quotesClients.find((c) => c.id === selectedClientId)?.name || 
           null;
  }, [selectedClientId, clients, quotesClients]);

  const metrics = useMemo(() => {
    if (!quotes.length) {
      return {
        totalQuotes: 0,
        totalValue: 0,
        approvedValue: 0,
        approvalRate: 0,
        rejectionRate: 0,
        averageResponseTime: 0,
        averageValue: 0,
        pendingQuotes: 0,
        statusDistribution: [],
        monthlyData: [],
        conversionFunnel: [],
      };
    }

    // Filter by period
    const now = new Date();
    let startDate: Date;
    switch (selectedPeriod) {
      case "month":
        startDate = startOfMonth(now);
        break;
      case "quarter":
        startDate = subMonths(startOfMonth(now), 2);
        break;
      case "year":
        startDate = subMonths(startOfMonth(now), 11);
        break;
    }

    // Filter by period and client
    let filteredQuotes = quotes.filter((q) => new Date(q.created_at) >= startDate);
    
    // Filter by client if selected
    if (selectedClientId !== "all") {
      filteredQuotes = filteredQuotes.filter((q) => q.client_id === selectedClientId);
    }

    // Basic metrics
    const totalQuotes = filteredQuotes.length;
    const totalValue = filteredQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    
    const approvedQuotes = filteredQuotes.filter((q) => q.status === "approved");
    const rejectedQuotes = filteredQuotes.filter((q) => q.status === "rejected");
    const pendingQuotes = filteredQuotes.filter((q) => ["pending", "sent"].includes(q.status));
    
    const approvedValue = approvedQuotes.reduce((sum, q) => sum + (q.total || 0), 0);
    
    // Approval & rejection rates (only consider quotes that got a response)
    const respondedQuotes = [...approvedQuotes, ...rejectedQuotes];
    const approvalRate = respondedQuotes.length > 0 
      ? (approvedQuotes.length / respondedQuotes.length) * 100 
      : 0;
    const rejectionRate = respondedQuotes.length > 0 
      ? (rejectedQuotes.length / respondedQuotes.length) * 100 
      : 0;

    // Average response time (for quotes that got a response)
    const quotesWithResponse = filteredQuotes.filter(
      (q) => q.client_response_at && (q.status === "approved" || q.status === "rejected")
    );
    
    let averageResponseTime = 0;
    if (quotesWithResponse.length > 0) {
      const totalHours = quotesWithResponse.reduce((sum, q) => {
        const created = new Date(q.created_at);
        const responded = new Date(q.client_response_at!);
        return sum + differenceInHours(responded, created);
      }, 0);
      averageResponseTime = totalHours / quotesWithResponse.length;
    }

    // Average value
    const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

    // Status distribution for pie chart
    const statusCounts = filteredQuotes.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      name: statusConfig[status as keyof typeof statusConfig]?.label || status,
      value: count,
      color: statusConfig[status as keyof typeof statusConfig]?.color || "hsl(var(--muted))",
    }));

    // Monthly data for bar chart
    const monthlyGroups = filteredQuotes.reduce((acc, q) => {
      const month = format(new Date(q.created_at), "MMM", { locale: ptBR });
      if (!acc[month]) {
        acc[month] = { month, total: 0, approved: 0, rejected: 0, value: 0 };
      }
      acc[month].total++;
      if (q.status === "approved") {
        acc[month].approved++;
        acc[month].value += q.total || 0;
      }
      if (q.status === "rejected") acc[month].rejected++;
      return acc;
    }, {} as Record<string, { month: string; total: number; approved: number; rejected: number; value: number }>);

    const monthlyData = Object.values(monthlyGroups);

    // Conversion funnel
    const conversionFunnel = [
      { stage: "Criados", count: totalQuotes, fill: "hsl(var(--primary))" },
      { stage: "Enviados", count: filteredQuotes.filter((q) => ["sent", "approved", "rejected"].includes(q.status)).length, fill: "hsl(var(--info))" },
      { stage: "Respondidos", count: respondedQuotes.length, fill: "hsl(var(--warning))" },
      { stage: "Aprovados", count: approvedQuotes.length, fill: "hsl(var(--success))" },
    ];

    return {
      totalQuotes,
      totalValue,
      approvedValue,
      approvalRate,
      rejectionRate,
      averageResponseTime,
      averageValue,
      pendingQuotes: pendingQuotes.length,
      statusDistribution,
      monthlyData,
      conversionFunnel,
    };
  }, [quotes, selectedPeriod, selectedClientId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatResponseTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const exportToPdf = useCallback(() => {
    const doc = new jsPDF();
    const periodLabel = selectedPeriod === "month" ? "Mês Atual" : selectedPeriod === "quarter" ? "Trimestre" : "Ano";
    const now = new Date();

    // Title
    doc.setFontSize(18);
    doc.text("Dashboard de Conversão de Orçamentos", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Período: ${periodLabel} • Gerado em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 28);
    if (selectedClientName) {
      doc.text(`Cliente: ${selectedClientName}`, 14, 34);
    }

    // Metrics table
    doc.setTextColor(0);
    autoTable(doc, {
      startY: selectedClientName ? 40 : 34,
      head: [["Métrica", "Valor"]],
      body: [
        ["Total de Orçamentos", metrics.totalQuotes.toString()],
        ["Pendentes", metrics.pendingQuotes.toString()],
        ["Taxa de Aprovação", `${metrics.approvalRate.toFixed(1)}%`],
        ["Taxa de Rejeição", `${metrics.rejectionRate.toFixed(1)}%`],
        ["Tempo Médio de Resposta", formatResponseTime(metrics.averageResponseTime)],
        ["Valor Total Orçado", formatCurrency(metrics.totalValue)],
        ["Valor Total Aprovado", formatCurrency(metrics.approvedValue)],
        ["Ticket Médio", formatCurrency(metrics.averageValue)],
      ],
      theme: "grid",
      headStyles: { fillColor: [245, 158, 11] },
      styles: { fontSize: 10 },
    });

    // Status distribution table
    if (metrics.statusDistribution.length > 0) {
      const y = (doc as any).lastAutoTable?.finalY || 80;
      doc.setFontSize(13);
      doc.text("Distribuição por Status", 14, y + 12);
      autoTable(doc, {
        startY: y + 16,
        head: [["Status", "Quantidade"]],
        body: metrics.statusDistribution.map((s) => [s.name, s.value.toString()]),
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 10 },
      });
    }

    // Funnel table
    if (metrics.conversionFunnel.length > 0) {
      const y = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFontSize(13);
      doc.text("Funil de Conversão", 14, y + 12);
      autoTable(doc, {
        startY: y + 16,
        head: [["Etapa", "Quantidade"]],
        body: metrics.conversionFunnel.map((f) => [f.stage, f.count.toString()]),
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 10 },
      });
    }

    // Approval links stats
    if (tokenStats.total > 0) {
      const y = (doc as any).lastAutoTable?.finalY || 160;
      doc.setFontSize(13);
      doc.text("Links de Aprovação", 14, y + 12);
      autoTable(doc, {
        startY: y + 16,
        head: [["Métrica", "Valor"]],
        body: [
          ["Links Enviados", tokenStats.total.toString()],
          ["Visualizados", `${tokenStats.viewed} (${tokenStats.total > 0 ? ((tokenStats.viewed / tokenStats.total) * 100).toFixed(0) : 0}%)`],
          ["Respondidos", `${tokenStats.responded} (${tokenStats.viewed > 0 ? ((tokenStats.responded / tokenStats.viewed) * 100).toFixed(0) : 0}%)`],
        ],
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 10 },
      });
    }

    // Recent responses
    const recentResponses = quotes
      .filter((q) => q.client_response_at)
      .sort((a, b) => new Date(b.client_response_at!).getTime() - new Date(a.client_response_at!).getTime())
      .slice(0, 10);

    if (recentResponses.length > 0) {
      const y = (doc as any).lastAutoTable?.finalY || 200;
      if (y > 240) doc.addPage();
      const startY = y > 240 ? 20 : y + 12;
      doc.setFontSize(13);
      doc.text("Últimas Respostas de Clientes", 14, startY);
      autoTable(doc, {
        startY: startY + 4,
        head: [["Orçamento", "Status", "Data", "Valor"]],
        body: recentResponses.map((q) => [
          q.quote_number || q.id,
          statusConfig[q.status as keyof typeof statusConfig]?.label || q.status,
          q.client_response_at ? format(new Date(q.client_response_at), "dd/MM/yyyy HH:mm") : "-",
          formatCurrency(q.total || 0),
        ]),
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`dashboard-orcamentos-${format(now, "yyyy-MM-dd")}.pdf`);
  }, [metrics, tokenStats, quotes, selectedPeriod, selectedClientName]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/orcamentos")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard de Orçamentos</h1>
              <p className="text-muted-foreground">Métricas e análises de performance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Client Filter */}
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Todos os clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {(clients.length > 0 ? clients : quotesClients).map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Period Buttons */}
            <Button
              variant={selectedPeriod === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("month")}
            >
              Mês
            </Button>
            <Button
              variant={selectedPeriod === "quarter" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("quarter")}
            >
              Trimestre
            </Button>
            <Button
              variant={selectedPeriod === "year" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod("year")}
            >
              Ano
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPdf}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {/* Active Client Filter Badge */}
        {selectedClientName && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-2 py-1.5 px-3">
              <Building2 className="h-3.5 w-3.5" />
              Filtrando por: {selectedClientName}
              <button
                onClick={() => setSelectedClientId("all")}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total de Orçamentos"
            value={metrics.totalQuotes.toString()}
            icon={FileText}
            variant="info"
            subtitle={`${metrics.pendingQuotes} pendentes`}
          />
          <StatCard
            title="Taxa de Aprovação"
            value={`${metrics.approvalRate.toFixed(1)}%`}
            icon={Target}
            variant="success"
            trend={metrics.approvalRate >= 50 ? { value: metrics.approvalRate } : undefined}
          />
          <StatCard
            title="Tempo Médio de Resposta"
            value={formatResponseTime(metrics.averageResponseTime)}
            icon={Hourglass}
            variant="warning"
            subtitle="para aprovação/rejeição"
          />
          <StatCard
            title="Valor Total Aprovado"
            value={formatCurrency(metrics.approvedValue)}
            icon={DollarSign}
            variant="success"
            subtitle={`de ${formatCurrency(metrics.totalValue)} orçados`}
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.averageValue)}</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa de Rejeição</p>
                  <p className="text-2xl font-bold text-destructive">{metrics.rejectionRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-full bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aguardando Resposta</p>
                  <p className="text-2xl font-bold text-warning">{metrics.pendingQuotes}</p>
                </div>
                <div className="p-3 rounded-full bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval Link Metrics */}
        {tokenStats.total > 0 && (
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Links de Aprovação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Send className="h-4 w-4 text-info" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{tokenStats.total}</p>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <Eye className="h-4 w-4 text-warning" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{tokenStats.viewed}</p>
                  <p className="text-xs text-muted-foreground">Visualizados</p>
                  <p className="text-xs text-muted-foreground/70">
                    ({tokenStats.total > 0 ? ((tokenStats.viewed / tokenStats.total) * 100).toFixed(0) : 0}%)
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{tokenStats.responded}</p>
                  <p className="text-xs text-muted-foreground">Respondidos</p>
                  <p className="text-xs text-muted-foreground/70">
                    ({tokenStats.viewed > 0 ? ((tokenStats.responded / tokenStats.viewed) * 100).toFixed(0) : 0}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.statusDistribution.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {metrics.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.conversionFunnel.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.conversionFunnel}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <XAxis type="number" />
                      <YAxis dataKey="stage" type="category" width={100} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {metrics.conversionFunnel.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          {metrics.monthlyData.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.monthlyData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="approved" name="Aprovados" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="rejected" name="Rejeitados" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Activity */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Últimas Respostas de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quotes
                .filter((q) => q.client_response_at)
                .sort((a, b) => new Date(b.client_response_at!).getTime() - new Date(a.client_response_at!).getTime())
                .slice(0, 5)
                .map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/orcamentos/${quote.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {quote.status === "approved" ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{quote.quote_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {quote.client_response_at && format(new Date(quote.client_response_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={quote.status === "approved" ? "default" : "destructive"}>
                        {statusConfig[quote.status]?.label || quote.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatCurrency(quote.total || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              
              {quotes.filter((q) => q.client_response_at).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma resposta de cliente registrada ainda
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
