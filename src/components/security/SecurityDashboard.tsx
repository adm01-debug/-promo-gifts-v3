import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { use2FA } from '@/hooks/use2FA';
import { useAuth } from '@/contexts/AuthContext';
import { useAllowedIPs } from '@/hooks/useAllowedIPs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Key, 
  Smartphone, 
  Monitor,
  Globe,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Eye,
  Settings,
  Bell,
  History,
  MapPin,
  Fingerprint,
  Users
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TwoFactorSetup } from './TwoFactorSetup';
import { IPRestrictionManager } from './IPRestrictionManager';
import { GeoBlockingManager } from './GeoBlockingManager';
import { KnownDevicesManager } from '@/components/auth/KnownDevicesManager';
import { PasskeyManager } from './PasskeyManager';
import { PushNotificationSettings } from './PushNotificationSettings';

interface SecurityMetrics {
  score: number;
  mfaEnabled: boolean;
  ipRestrictionsActive: boolean;
  knownDevicesCount: number;
  recentLoginAttempts: number;
  failedLoginAttempts: number;
  securityAlerts: number;
}

interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  success: boolean;
  failure_reason: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SecurityNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export function SecurityDashboard() {
  const { user, isAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  const effectiveUserId = selectedUserId || user?.id;
  const isManagingOther = !!selectedUserId && selectedUserId !== user?.id;
  const selectedUser = users.find(u => u.user_id === selectedUserId);
  
  const { is2FAEnabled, isLoading: is2FALoading } = use2FA(isManagingOther ? selectedUserId! : undefined);
  const { allowedIPs } = useAllowedIPs();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    score: 0,
    mfaEnabled: false,
    ipRestrictionsActive: false,
    knownDevicesCount: 0,
    recentLoginAttempts: 0,
    failedLoginAttempts: 0,
    securityAlerts: 0,
  });
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt[]>([]);
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load users list for admin
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .eq('is_active', true)
      .order('full_name');
    
    if (data) setUsers(data);
  };

  useEffect(() => {
    if (effectiveUserId) {
      loadSecurityData();
    }
  }, [effectiveUserId, is2FAEnabled, allowedIPs]);

  const loadSecurityData = async () => {
    if (!effectiveUserId) return;
    setIsLoading(true);

    try {
      // Load login attempts
      const { data: attempts } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      setLoginAttempts((attempts as LoginAttempt[]) || []);

      // Load known devices count
      const { count: devicesCount } = await supabase
        .from('user_known_devices')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', effectiveUserId);

      // Load security notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', effectiveUserId)
        .eq('type', 'security')
        .order('created_at', { ascending: false })
        .limit(10);

      setNotifications((notifs as SecurityNotification[]) || []);

      // Calculate metrics
      const failedAttempts = attempts?.filter(a => !a.success).length || 0;
      const unreadAlerts = notifs?.filter(n => !n.is_read).length || 0;
      
      // Calculate security score (0-100)
      let score = 40; // Base score
      if (is2FAEnabled) score += 30;
      if (allowedIPs.length > 0) score += 20;
      if (devicesCount && devicesCount > 0) score += 10;
      if (failedAttempts > 5) score -= 10;

      setMetrics({
        score: Math.min(100, Math.max(0, score)),
        mfaEnabled: is2FAEnabled,
        ipRestrictionsActive: allowedIPs.length > 0,
        knownDevicesCount: devicesCount || 0,
        recentLoginAttempts: attempts?.length || 0,
        failedLoginAttempts: failedAttempts,
        securityAlerts: unreadAlerts,
      });
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-warning';
    if (score >= 40) return 'bg-orange';
    return 'bg-destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <ShieldCheck className="h-8 w-8 text-success" />;
    if (score >= 60) return <Shield className="h-8 w-8 text-warning" />;
    if (score >= 40) return <ShieldAlert className="h-8 w-8 text-orange" />;
    return <ShieldX className="h-8 w-8 text-destructive" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Crítico';
  };

  const recommendations = [];
  if (!is2FAEnabled) {
    recommendations.push({
      icon: <Key className="h-4 w-4" />,
      title: 'Ativar autenticação de dois fatores',
      description: isManagingOther 
        ? 'Este usuário não possui 2FA ativado'
        : 'Adiciona uma camada extra de segurança à sua conta',
      priority: 'high',
    });
  }
  if (allowedIPs.length === 0) {
    recommendations.push({
      icon: <Globe className="h-4 w-4" />,
      title: 'Configurar restrição de IP',
      description: 'Limite o acesso por endereços IP específicos',
      priority: 'medium',
    });
  }
  if (metrics.failedLoginAttempts > 3) {
    recommendations.push({
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'Revisar tentativas de login falhas',
      description: 'Foram detectadas várias tentativas de login sem sucesso',
      priority: 'high',
    });
  }

  return (
    <div className="space-y-6">
      {/* Admin User Selector */}
      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                <span className="font-medium text-sm">Gerenciar segurança de:</span>
              </div>
              <Select
                value={selectedUserId || user?.id || ''}
                onValueChange={(value) => setSelectedUserId(value === user?.id ? null : value)}
              >
                <SelectTrigger className="w-[500px] bg-background">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{u.full_name || 'Sem nome'}</span>
                        <span className="text-muted-foreground text-xs">({u.email})</span>
                        {u.user_id === user?.id && (
                          <Badge variant="secondary" className="text-xs ml-1">Você</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isManagingOther && (
                <Badge variant="outline" className="border-primary text-primary">
                  Gerenciando: {selectedUser?.full_name || selectedUser?.email}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Score Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Main Score Card */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Pontuação de Segurança
            </CardTitle>
            <CardDescription>
              {isManagingOther 
                ? `Avaliação de segurança de ${selectedUser?.full_name || selectedUser?.email}`
                : 'Avaliação geral da segurança da sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                {getScoreIcon(metrics.score)}
                <span className={`text-3xl font-bold mt-2 ${getScoreColor(metrics.score)}`}>
                  {metrics.score}%
                </span>
                <Badge 
                  variant={metrics.score >= 60 ? 'default' : 'destructive'}
                  className="mt-1"
                >
                  {getScoreLabel(metrics.score)}
                </Badge>
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso da segurança</span>
                    <span className={getScoreColor(metrics.score)}>{metrics.score}%</span>
                  </div>
                  <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${getScoreProgressColor(metrics.score)}`}
                      style={{ width: `${metrics.score}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    {is2FAEnabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>MFA {is2FAEnabled ? 'ativo' : 'inativo'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {allowedIPs.length > 0 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{allowedIPs.length} IPs permitidos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span>{metrics.knownDevicesCount} dispositivos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span>{metrics.recentLoginAttempts} logins recentes</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="h-4 w-4" />
              MFA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {is2FAEnabled ? (
                <>
                  <Lock className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold text-green-500">Ativo</span>
                </>
              ) : (
                <>
                  <Unlock className="h-5 w-5 text-red-500" />
                  <span className="text-lg font-semibold text-red-500">Inativo</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {is2FAEnabled ? 'Proteção extra ativada' : 'Recomendado ativar'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.securityAlerts > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-lg font-semibold text-orange-500">{metrics.securityAlerts}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="text-lg font-semibold text-green-500">0</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.securityAlerts > 0 ? 'Alertas não lidos' : 'Nenhum alerta pendente'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Recomendações de Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background">
                  <div className={`p-2 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'
                  }`}>
                    {rec.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{rec.title}</h4>
                    <p className="text-xs text-muted-foreground">{rec.description}</p>
                  </div>
                  <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                    {rec.priority === 'high' ? 'Alta' : 'Média'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="mfa" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">MFA</span>
          </TabsTrigger>
          <TabsTrigger value="passkeys" className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            <span className="hidden sm:inline">Passkeys</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Dispositivos</span>
          </TabsTrigger>
          <TabsTrigger value="ips" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">IPs</span>
          </TabsTrigger>
          <TabsTrigger value="geo" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Geo</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Push</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Login Attempts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Logins Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {loginAttempts.slice(0, 10).map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {attempt.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{attempt.ip_address}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(attempt.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                        <Badge variant={attempt.success ? 'default' : 'destructive'}>
                          {attempt.success ? 'Sucesso' : 'Falha'}
                        </Badge>
                      </div>
                    ))}
                    {loginAttempts.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum login registrado
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Security Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Alertas de Segurança
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-3 rounded-lg border ${!notif.is_read ? 'bg-primary/5 border-primary/20' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notif.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                          {!notif.is_read && (
                            <Badge variant="secondary" className="text-xs">Novo</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium">Tudo seguro!</p>
                        <p className="text-xs text-muted-foreground">
                          Nenhum alerta de segurança pendente
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mfa">
          <TwoFactorSetup 
            targetUserId={isManagingOther ? selectedUserId! : undefined}
            targetUserEmail={isManagingOther ? selectedUser?.email || undefined : undefined}
          />
        </TabsContent>

        <TabsContent value="passkeys">
          <PasskeyManager targetUserId={isManagingOther ? selectedUserId! : undefined} />
        </TabsContent>

        <TabsContent value="devices">
          <KnownDevicesManager targetUserId={isManagingOther ? selectedUserId! : undefined} />
        </TabsContent>

        <TabsContent value="ips">
          <IPRestrictionManager />
        </TabsContent>

        <TabsContent value="geo">
          <GeoBlockingManager />
        </TabsContent>

        <TabsContent value="notifications">
          <PushNotificationSettings />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Logins
              </CardTitle>
              <CardDescription>
                {isManagingOther 
                  ? `Tentativas de login de ${selectedUser?.full_name || selectedUser?.email}`
                  : 'Todas as tentativas de login na sua conta'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {loginAttempts.map((attempt) => (
                    <div 
                      key={attempt.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        !attempt.success ? 'border-red-500/20 bg-red-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {attempt.success ? (
                          <div className="p-2 rounded-full bg-green-500/10">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-full bg-red-500/10">
                            <XCircle className="h-4 w-4 text-red-500" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {attempt.success ? 'Login bem-sucedido' : 'Tentativa falha'}
                            </span>
                            <Badge variant={attempt.success ? 'default' : 'destructive'} className="text-xs">
                              {attempt.success ? 'OK' : 'Falha'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {attempt.ip_address}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(attempt.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {attempt.failure_reason && (
                            <p className="text-xs text-red-500 mt-1">
                              Motivo: {attempt.failure_reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loginAttempts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum login registrado ainda
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
