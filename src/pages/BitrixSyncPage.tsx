import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useBitrixSync } from "@/hooks/useBitrixSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  Cloud,
  CloudOff,
  Users,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  DollarSign,
  Calendar,
  Database,
  Clock,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SyncLog {
  id: string;
  status: string;
  clients_synced: number;
  deals_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export default function BitrixSyncPage() {
  const { syncAll, fetchStoredClients, fetchSyncLogs, isSyncing, syncResult, error } = useBitrixSync();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [storedClients, setStoredClients] = useState<any[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoadingStored, setIsLoadingStored] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    setIsLoadingStored(true);
    const [clients, logs] = await Promise.all([
      fetchStoredClients(0, 20),
      fetchSyncLogs(),
    ]);
    setStoredClients(clients);
    setSyncLogs(logs);
    setIsLoadingStored(false);
  };

  const handleSync = async () => {
    const result = await syncAll();
    if (result) {
      setLastSync(new Date());
      await loadStoredData();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Cloud className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Sincronização CRM</h1>
              <p className="text-muted-foreground">
                Importe clientes e histórico de compras do seu CRM
              </p>
            </div>
          </div>

          <Button onClick={handleSync} disabled={isSyncing} size="lg" className="gap-2">
            {isSyncing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Sincronizar Agora
              </>
            )}
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Status da Conexão</CardTitle>
              {error ? (
                <CloudOff className="h-5 w-5 text-destructive" />
              ) : (
                <Cloud className="h-5 w-5 text-green-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {error ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">Erro na conexão</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Conectado</span>
                  </>
                )}
              </div>
              {lastSync && (
                <p className="text-xs text-muted-foreground mt-2">
                  Última sync: {lastSync.toLocaleString("pt-BR")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Empresas no Banco</CardTitle>
              <Database className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {storedClients.length || syncResult?.totalCompanies || 0}
              </div>
              <p className="text-xs text-muted-foreground">clientes salvos localmente</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sincronizações</CardTitle>
              <History className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {syncLogs.length}
              </div>
              <p className="text-xs text-muted-foreground">no histórico</p>
            </CardContent>
          </Card>
        </div>

        {/* Sync Progress */}
        {isSyncing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Sincronizando dados...</p>
                  <p className="text-sm text-muted-foreground">
                    Buscando empresas e negócios do CRM
                  </p>
                  <Progress value={undefined} className="mt-2 h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="py-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Erro na sincronização</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        {syncResult && syncResult.clients.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Clientes Sincronizados</CardTitle>
              <CardDescription>
                Dados importados do CRM em {formatDate(syncResult.syncedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Segmento</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead className="text-right">Total em Negócios</TableHead>
                    <TableHead className="text-right">Última Compra</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncResult.clients.slice(0, 20).map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: client.primaryColor?.hex || "#6B7280" }}
                          >
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.nicho}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{client.ramo}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.email && <p>{client.email}</p>}
                          {client.phone && (
                            <p className="text-muted-foreground">{client.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatCurrency(client.totalSpent || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {client.deals?.length || 0} negócio(s)
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{formatDate(client.lastPurchase || null)}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {syncResult.clients.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Mostrando 20 de {syncResult.clients.length} clientes
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sync History Logs */}
        {syncLogs.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Sincronizações
              </CardTitle>
              <CardDescription>
                Últimas sincronizações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Empresas</TableHead>
                    <TableHead className="text-right">Negócios</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncLogs.map((log) => {
                    const duration = log.completed_at && log.started_at
                      ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                      : null;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {new Date(log.started_at).toLocaleString("pt-BR")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.status === "completed" ? "default" : log.status === "failed" ? "destructive" : "secondary"}
                            className={log.status === "completed" ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {log.status === "completed" ? "Concluído" : log.status === "failed" ? "Falhou" : "Em progresso"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {log.clients_synced}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {log.deals_synced}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {duration !== null ? `${duration}s` : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isSyncing && !syncResult && storedClients.length === 0 && !error && (
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Database className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum dado no banco</h3>
              <p className="text-muted-foreground mb-4">
                Clique em "Sincronizar Agora" para importar e salvar dados do CRM
              </p>
              <Button onClick={handleSync} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Iniciar Sincronização
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
