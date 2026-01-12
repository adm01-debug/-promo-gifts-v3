import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Database, 
  Server, 
  Code, 
  Clock,
  Wifi
} from "lucide-react";

interface StatusItem {
  name: string;
  status: "ok" | "error" | "loading";
  message: string;
  icon: React.ReactNode;
}

export default function SystemStatusPage() {
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const appVersion = "2.0.0";
  const buildDate = "2026-01-05";

  const runHealthCheck = async () => {
    setIsChecking(true);
    const results: StatusItem[] = [];

    // 1. Check Frontend Build
    results.push({
      name: "Frontend Build",
      status: "ok",
      message: `React app carregado com sucesso`,
      icon: <Code className="h-5 w-5" />
    });

    // 2. Check Environment Variables
    const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    results.push({
      name: "Variáveis de Ambiente",
      status: hasSupabaseUrl && hasSupabaseKey ? "ok" : "error",
      message: hasSupabaseUrl && hasSupabaseKey 
        ? "Configuradas corretamente" 
        : `Faltando: ${!hasSupabaseUrl ? 'SUPABASE_URL ' : ''}${!hasSupabaseKey ? 'SUPABASE_KEY' : ''}`,
      icon: <Server className="h-5 w-5" />
    });

    // 3. Check Supabase Connection (usando profiles como tabela de teste)
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      results.push({
        name: "Conexão com Database",
        status: error ? "error" : "ok",
        message: error ? error.message : "Conectado ao Lovable Cloud",
        icon: <Database className="h-5 w-5" />
      });
    } catch (err) {
      results.push({
        name: "Conexão com Database",
        status: "error",
        message: err instanceof Error ? err.message : "Erro de conexão",
        icon: <Database className="h-5 w-5" />
      });
    }

    // 4. Check Auth Service
    try {
      const { data: { session } } = await supabase.auth.getSession();
      results.push({
        name: "Serviço de Autenticação",
        status: "ok",
        message: session ? `Usuário logado` : "Serviço disponível (não autenticado)",
        icon: <Wifi className="h-5 w-5" />
      });
    } catch (err) {
      results.push({
        name: "Serviço de Autenticação",
        status: "error",
        message: err instanceof Error ? err.message : "Erro no auth",
        icon: <Wifi className="h-5 w-5" />
      });
    }

    // 5. Check Network
    results.push({
      name: "Conexão de Rede",
      status: navigator.onLine ? "ok" : "error",
      message: navigator.onLine ? "Online" : "Offline",
      icon: <Wifi className="h-5 w-5" />
    });

    setStatuses(results);
    setLastCheck(new Date());
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  const getStatusIcon = (status: "ok" | "error" | "loading") => {
    switch (status) {
      case "ok":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "loading":
        return <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusBadge = (status: "ok" | "error" | "loading") => {
    switch (status) {
      case "ok":
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">OK</Badge>;
      case "error":
        return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Erro</Badge>;
      case "loading":
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Verificando</Badge>;
    }
  };

  const overallStatus = statuses.every(s => s.status === "ok") ? "ok" : "error";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Status do Sistema</h1>
          <p className="text-muted-foreground">Diagnóstico de saúde da aplicação</p>
        </div>

        {/* Overall Status */}
        <Card className={`border-2 ${overallStatus === "ok" ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {overallStatus === "ok" ? (
                  <CheckCircle className="h-10 w-10 text-green-500" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-500" />
                )}
                <div>
                  <h2 className="text-xl font-semibold">
                    {overallStatus === "ok" ? "Sistema Operacional" : "Problemas Detectados"}
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    {statuses.filter(s => s.status === "ok").length}/{statuses.length} serviços funcionando
                  </p>
                </div>
              </div>
              <Button 
                onClick={runHealthCheck} 
                disabled={isChecking}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
                Verificar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Version Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Code className="h-5 w-5" />
              Informações da Build
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Versão do App</span>
              <Badge variant="secondary">{appVersion}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Data da Build</span>
              <span className="font-mono text-sm">{buildDate}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Ambiente</span>
              <Badge variant="outline">{import.meta.env.MODE}</Badge>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">React Version</span>
              <span className="font-mono text-sm">18.3.1</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5" />
              Status dos Serviços
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {statuses.map((item, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">{item.icon}</div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(item.status)}
                  {getStatusIcon(item.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Last Check */}
        {lastCheck && (
          <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            Última verificação: {lastCheck.toLocaleTimeString('pt-BR')}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={() => window.history.back()}>
            ← Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
