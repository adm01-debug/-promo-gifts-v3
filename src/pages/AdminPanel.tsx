import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ShieldCheck, ShieldAlert, Users, UserCog, Loader2, KeyRound, Package, Crown, Pencil, Brain, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordResetApproval } from "@/components/admin/PasswordResetApproval";
import { usePasswordResetRequests } from "@/hooks/usePasswordResetRequests";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { AccessSecurityManager } from "@/components/admin/AccessSecurityManager";
import { MockupPromptManager } from "@/components/admin/MockupPromptManager";
import { EngravingRegistrationContent } from "@/pages/EngravingRegistrationPage";
import { useSearchParams } from "react-router-dom";

type AppRole = "admin" | "manager" | "vendedor";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  created_at: string;
  is_active: boolean | null;
}

const roleConfig: Record<AppRole, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline"; color: string }> = {
  admin: {
    label: "Administrador",
    icon: <Crown className="h-3 w-3" />,
    variant: "default",
    color: "bg-primary text-primary-foreground",
  },
  manager: {
    label: "Gerente",
    icon: <ShieldCheck className="h-3 w-3" />,
    variant: "default",
    color: "bg-blue-500 text-white",
  },
  vendedor: {
    label: "Vendedor",
    icon: <Shield className="h-3 w-3" />,
    variant: "secondary",
    color: "",
  },
};

export default function AdminPanel() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "users";
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [dialogUser, setDialogUser] = useState<UserWithRole | null>(null);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", is_active: true });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { pendingCount } = usePasswordResetRequests();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, is_active, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          role: (userRole?.role as AppRole) || "vendedor",
          created_at: profile.created_at,
          is_active: profile.is_active,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u))
      );

      const roleLabel = roleConfig[newRole].label;
      toast.success(`Usuário alterado para ${roleLabel}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar permissão");
    } finally {
      setUpdatingUserId(null);
      setDialogUser(null);
      setSelectedRole(null);
    }
  };

  const openRoleDialog = (userItem: UserWithRole) => {
    setDialogUser(userItem);
    setSelectedRole(userItem.role);
  };

  const openEditDialog = (userItem: UserWithRole) => {
    setEditUser(userItem);
    setEditForm({
      full_name: userItem.full_name || "",
      email: userItem.email || "",
      is_active: userItem.is_active !== false,
    });
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setIsSavingEdit(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name.trim() || null,
          email: editForm.email.trim() || null,
          is_active: editForm.is_active,
        })
        .eq("user_id", editUser.user_id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editUser.user_id
            ? { ...u, full_name: editForm.full_name.trim() || null, email: editForm.email.trim() || null, is_active: editForm.is_active }
            : u
        )
      );
      toast.success("Usuário atualizado com sucesso");
      setEditUser(null);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar usuário", { description: error.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const managerCount = users.filter((u) => u.role === "manager").length;
  const vendedorCount = users.filter((u) => u.role === "vendedor").length;

  return (
    <MainLayout>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <UserCog className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, roles e permissões do sistema</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Crown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{adminCount}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{managerCount}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vendedorCount}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Reset Pendentes</CardTitle>
              <KeyRound className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs organized in logical groups */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <div className="space-y-3">
            {/* Group 1: Usuários & Segurança */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Usuários & Segurança</p>
              <TabsList className="w-auto">
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="password-reset" className="gap-2">
                  <KeyRound className="h-4 w-4" />
                  Reset de Senha
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {pendingCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="access-security" className="gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  Segurança de Acesso
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Group 2: Cadastros */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Cadastros</p>
              <TabsList className="w-auto">
                <TabsTrigger value="products" className="gap-2">
                  <Package className="h-4 w-4" />
                  Produtos
                </TabsTrigger>
                <TabsTrigger value="personalizacao" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Personalização
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Group 3: IA & Automação */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">IA & Automação</p>
              <TabsList className="w-auto">
                <TabsTrigger value="prompts-ia" className="gap-2">
                  <Brain className="h-4 w-4" />
                  Prompts IA
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="users">
            {/* Users Table */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Gerenciamento de Usuários e Roles</CardTitle>
                <CardDescription>
                  Atribua roles aos usuários: Admin (acesso total), Gerente (acesso intermediário) ou Vendedor (acesso básico)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((userItem) => {
                        const config = roleConfig[userItem.role];
                        return (
                          <TableRow key={userItem.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {userItem.role === "admin" && (
                                  <Crown className="h-4 w-4 text-primary" />
                                )}
                                {userItem.role === "manager" && (
                                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                                )}
                                {userItem.full_name || "Sem nome"}
                                {userItem.user_id === user?.id && (
                                  <Badge variant="outline" className="text-xs">Você</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {userItem.email || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={config.variant}
                                className={`gap-1 ${config.color}`}
                              >
                                {config.icon}
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={userItem.is_active !== false ? "outline" : "secondary"}>
                                {userItem.is_active !== false ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(userItem.created_at).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditDialog(userItem)}
                                  title="Editar usuário"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {userItem.user_id !== user?.id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openRoleDialog(userItem)}
                                    disabled={updatingUserId === userItem.user_id}
                                  >
                                    {updatingUserId === userItem.user_id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Alterar Role"
                                    )}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="password-reset">
            <PasswordResetApproval />
          </TabsContent>

          <TabsContent value="access-security">
            <AccessSecurityManager />
          </TabsContent>

          <TabsContent value="personalizacao">
            <EngravingRegistrationContent />
          </TabsContent>

          <TabsContent value="prompts-ia">
            <MockupPromptManager />
          </TabsContent>
        </Tabs>

        {/* Role Change Dialog */}
        <AlertDialog open={!!dialogUser} onOpenChange={(open) => !open && setDialogUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alterar Role do Usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Selecione o novo role para <span className="font-semibold">{dialogUser?.full_name || "este usuário"}</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <Select
                value={selectedRole || undefined}
                onValueChange={(value) => setSelectedRole(value as AppRole)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">Administrador</div>
                        <div className="text-xs text-muted-foreground">Acesso total ao sistema</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Gerente</div>
                        <div className="text-xs text-muted-foreground">Gerencia equipes e relatórios</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="vendedor">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Vendedor</div>
                        <div className="text-xs text-muted-foreground">Acesso às funcionalidades de vendas</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!selectedRole || selectedRole === dialogUser?.role}
                onClick={() => {
                  if (dialogUser && selectedRole) {
                    handleRoleChange(dialogUser.user_id, selectedRole);
                  }
                }}
              >
                Confirmar Alteração
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Altere as informações de <span className="font-semibold">{editUser?.full_name || "este usuário"}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input
                  id="edit-name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Status Ativo</Label>
                <Switch
                  id="edit-active"
                  checked={editForm.is_active}
                  onCheckedChange={(checked) => setEditForm((f) => ({ ...f, is_active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}