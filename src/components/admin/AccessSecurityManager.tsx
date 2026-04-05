import { useState } from "react";
import { useAccessSecurity } from "@/hooks/useAccessSecurity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Globe, Loader2, MapPin, Monitor, Plus, Shield, ShieldAlert, Trash2, Wifi } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function AccessSecurityManager() {
  const {
    settings,
    ips,
    cities,
    blockedLogs,
    isLoading,
    updateSettings,
    addIp,
    removeIp,
    toggleIp,
    addCity,
    removeCity,
    toggleCity,
  } = useAccessSecurity();

  const [newIp, setNewIp] = useState("");
  const [newIpLabel, setNewIpLabel] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [addingIp, setAddingIp] = useState(false);
  const [addingCity, setAddingCity] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAddIp = async () => {
    if (!newIp.trim()) return;
    setAddingIp(true);
    const ok = await addIp(newIp.trim(), newIpLabel.trim() || undefined);
    if (ok) { setNewIp(""); setNewIpLabel(""); }
    setAddingIp(false);
  };

  const handleAddCity = async () => {
    if (!newCity.trim()) return;
    setAddingCity(true);
    const ok = await addCity(newCity.trim(), newState.trim() || undefined);
    if (ok) { setNewCity(""); setNewState(""); }
    setAddingCity(false);
  };

  const blockReasonLabel: Record<string, string> = {
    ip_not_whitelisted: "IP não autorizado",
    city_not_whitelisted: "Cidade não autorizada",
    too_many_attempts: "Muitas tentativas",
  };

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Configurações de Segurança de Acesso
          </CardTitle>
          <CardDescription>
            Ative ou desative as restrições de acesso por IP e cidade
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
              <div className="space-y-1">
                <Label className="font-medium flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Whitelist de IPs
                </Label>
                <p className="text-xs text-muted-foreground">
                  Apenas IPs cadastrados podem acessar
                </p>
              </div>
              <Switch
                checked={settings?.ip_whitelist_enabled ?? false}
                onCheckedChange={(checked) => updateSettings({ ip_whitelist_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
              <div className="space-y-1">
                <Label className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Whitelist de Cidades
                </Label>
                <p className="text-xs text-muted-foreground">
                  Apenas cidades cadastradas podem acessar
                </p>
              </div>
              <Switch
                checked={settings?.city_whitelist_enabled ?? false}
                onCheckedChange={(checked) => updateSettings({ city_whitelist_enabled: checked })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máx. tentativas falhadas antes do bloqueio</Label>
              <Input
                type="number"
                min={0}
                value={settings?.max_failed_attempts ?? 5}
                onChange={(e) => updateSettings({ max_failed_attempts: parseInt(e.target.value) || 0 })}
                className="w-32"
              />
            </div>
            <div className="space-y-2">
              <Label>Duração do bloqueio (minutos)</Label>
              <Input
                type="number"
                min={1}
                value={settings?.lockout_duration_minutes ?? 15}
                onChange={(e) => updateSettings({ lockout_duration_minutes: parseInt(e.target.value) || 15 })}
                className="w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* IPs and Cities Tabs */}
      <Tabs defaultValue="ips" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ips" className="gap-2">
            <Wifi className="h-4 w-4" />
            IPs Permitidos
            <Badge variant="secondary" className="ml-1">{ips.filter(i => i.is_active).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="cities" className="gap-2">
            <MapPin className="h-4 w-4" />
            Cidades Permitidas
            <Badge variant="secondary" className="ml-1">{cities.filter(c => c.is_active).length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Acessos Bloqueados
            {blockedLogs.length > 0 && (
              <Badge variant="destructive" className="ml-1">{blockedLogs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* IPs Tab */}
        <TabsContent value="ips">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">IPs na Whitelist</CardTitle>
              <CardDescription>
                Adicione endereços IP que podem acessar o sistema. Suporta IPs individuais e ranges CIDR (/24, /16).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add IP form */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Endereço IP</Label>
                  <Input
                    placeholder="192.168.1.100 ou 10.0.0.0/24"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddIp()}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Rótulo (opcional)</Label>
                  <Input
                    placeholder="Ex: Escritório SP"
                    value={newIpLabel}
                    onChange={(e) => setNewIpLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddIp()}
                  />
                </div>
                <Button onClick={handleAddIp} disabled={addingIp || !newIp.trim()} className="gap-1">
                  {addingIp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar
                </Button>
              </div>

              {/* IP List */}
              {ips.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum IP cadastrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP</TableHead>
                      <TableHead>Rótulo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Adicionado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ips.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono text-sm">{ip.ip_address}</TableCell>
                        <TableCell>{ip.label || "—"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={ip.is_active}
                            onCheckedChange={(checked) => toggleIp(ip.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(ip.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Excluir"><Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover IP?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O IP <span className="font-mono font-bold">{ip.ip_address}</span> será removido da whitelist.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeIp(ip.id)} className="bg-destructive text-destructive-foreground">
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cities Tab */}
        <TabsContent value="cities">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Cidades na Whitelist</CardTitle>
              <CardDescription>
                Adicione cidades de onde é permitido acessar o sistema. A localização é detectada pelo IP do usuário.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add City form */}
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Cidade</Label>
                  <Input
                    placeholder="Ex: São Paulo"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCity()}
                  />
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <Input
                    placeholder="SP"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    maxLength={2}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCity()}
                  />
                </div>
                <Button onClick={handleAddCity} disabled={addingCity || !newCity.trim()} className="gap-1">
                  {addingCity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Adicionar
                </Button>
              </div>

              {/* City List */}
              {cities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhuma cidade cadastrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cidade</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Adicionado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cities.map((city) => (
                      <TableRow key={city.id}>
                        <TableCell className="font-medium">{city.city_name}</TableCell>
                        <TableCell>{city.state || "—"}</TableCell>
                        <TableCell>{city.country_code}</TableCell>
                        <TableCell>
                          <Switch
                            checked={city.is_active}
                            onCheckedChange={(checked) => toggleCity(city.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {format(new Date(city.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Excluir"><Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover cidade?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <span className="font-bold">{city.city_name}</span> será removida da whitelist.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => removeCity(city.id)} className="bg-destructive text-destructive-foreground">
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked Logs Tab */}
        <TabsContent value="logs">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Últimos Acessos Bloqueados</CardTitle>
              <CardDescription>
                Registro das últimas 50 tentativas de acesso bloqueadas pelo sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {blockedLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum acesso bloqueado registrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-sm">{log.email || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{log.ip_address}</TableCell>
                        <TableCell className="text-sm">
                          {log.city ? `${log.city}${log.state ? `, ${log.state}` : ""}${log.country ? ` (${log.country})` : ""}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.block_reason === "too_many_attempts" ? "destructive" : "outline"} className="text-xs">
                            {blockReasonLabel[log.block_reason] || log.block_reason}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
