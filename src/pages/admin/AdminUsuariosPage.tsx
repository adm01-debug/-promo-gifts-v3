import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, ShieldCheck, Users, UserCog, Loader2, KeyRound, Crown, Pencil, Camera, X, Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PasswordResetApproval } from "@/components/admin/PasswordResetApproval";
import { usePasswordResetRequests } from "@/hooks/usePasswordResetRequests";

type AppRole = "admin" | "manager" | "vendedor";

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
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

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [dialogUser, setDialogUser] = useState<UserWithRole | null>(null);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", is_active: true, avatar_url: "" });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { pendingCount } = usePasswordResetRequests();

  // Create user state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "", role: "vendedor" as AppRole });

  // Delete user state
  const [deleteUser, setDeleteUser] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, email, avatar_url, is_active, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
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
      avatar_url: userItem.avatar_url || "",
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editUser || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${editUser.user_id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", editUser.user_id);

      setEditForm((f) => ({ ...f, avatar_url: publicUrl }));
      setUsers((prev) =>
        prev.map((u) => u.user_id === editUser.user_id ? { ...u, avatar_url: publicUrl } : u)
      );
      toast.success("Foto atualizada com sucesso");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao enviar foto", { description: error.message });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!editUser) return;
    setIsUploadingAvatar(true);
    try {
      await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", editUser.user_id);

      setEditForm((f) => ({ ...f, avatar_url: "" }));
      setUsers((prev) =>
        prev.map((u) => u.user_id === editUser.user_id ? { ...u, avatar_url: null } : u)
      );
      toast.success("Foto removida");
    } catch (error: any) {
      toast.error("Erro ao remover foto");
    } finally {
      setIsUploadingAvatar(false);
    }
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

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      toast.error("Email e senha são obrigatórios");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: {
          action: "create",
          email: createForm.email.trim(),
          password: createForm.password,
          full_name: createForm.full_name.trim(),
          role: createForm.role,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário criado com sucesso");
      setIsCreateOpen(false);
      setCreateForm({ full_name: "", email: "", password: "", role: "vendedor" });
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error("Erro ao criar usuário", { description: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-users", {
        body: { action: "delete", user_id: deleteUser.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Usuário excluído com sucesso");
      setUsers((prev) => prev.filter((u) => u.user_id !== deleteUser.user_id));
      setDeleteUser(null);
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao excluir usuário", { description: error.message });
    } finally {
      setIsDeleting(false);
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
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">Gerencie usuários, roles e aprovações de reset de senha</p>
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
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{managerCount}</div>
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

        {/* Tabs: Usuários + Reset de Senha */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários & Roles
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
          </TabsList>

          <TabsContent value="users">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Gerenciamento de Usuários e Roles</CardTitle>
                  <CardDescription>
                    Atribua roles aos usuários: Admin (acesso total), Gerente (acesso intermediário) ou Vendedor (acesso básico)
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Usuário
                </Button>
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
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={userItem.avatar_url || undefined} alt={userItem.full_name || ""} />
                                  <AvatarFallback className="text-xs bg-muted">
                                    {(userItem.full_name || "?").charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex items-center gap-2">
                                  {userItem.role === "admin" && <Crown className="h-4 w-4 text-primary" />}
                                  {userItem.role === "manager" && <ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                                  {userItem.full_name || "Sem nome"}
                                  {userItem.user_id === user?.id && (
                                    <Badge variant="outline" className="text-xs">Você</Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{userItem.email || "-"}</TableCell>
                            <TableCell>
                              <Badge variant={config.variant} className={`gap-1 ${config.color}`}>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(userItem)} title="Editar usuário">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {userItem.user_id !== user?.id && (
                                  <>
                                    <Button variant="outline" size="sm" onClick={() => openRoleDialog(userItem)} disabled={updatingUserId === userItem.user_id}>
                                      {updatingUserId === userItem.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar Role"}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteUser(userItem)} title="Excluir usuário">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
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

          <TabsContent value="password-reset">
            <PasswordResetApproval />
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
              <Select value={selectedRole || undefined} onValueChange={(value) => setSelectedRole(value as AppRole)}>
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
                      <ShieldCheck className="h-4 w-4 text-muted-foreground" />
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
                  if (dialogUser && selectedRole) handleRoleChange(dialogUser.user_id, selectedRole);
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
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={editForm.avatar_url || undefined} alt={editForm.full_name} />
                    <AvatarFallback className="text-xl bg-muted">
                      {(editForm.full_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Foto do Usuário</Label>
                  {editForm.avatar_url && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:text-destructive" onClick={handleRemoveAvatar} disabled={isUploadingAvatar}>
                      <X className="h-3 w-3 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome Completo</Label>
                <Input id="edit-name" value={editForm.full_name} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-active">Status Ativo</Label>
                <Switch id="edit-active" checked={editForm.is_active} onCheckedChange={(checked) => setEditForm((f) => ({ ...f, is_active: checked }))} />
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

        {/* Create User Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuário</DialogTitle>
              <DialogDescription>Crie um novo usuário para o sistema</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Nome Completo</Label>
                <Input id="create-name" value={createForm.full_name} onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input id="create-email" type="email" value={createForm.email} onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Senha *</Label>
                <Input id="create-password" type="password" value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role">Role</Label>
                <Select value={createForm.role} onValueChange={(value) => setCreateForm((f) => ({ ...f, role: value as AppRole }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateUser} disabled={isCreating}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation */}
        <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <span className="font-semibold">{deleteUser?.full_name || deleteUser?.email}</span>?
                Esta ação é irreversível e removerá todos os dados associados a este usuário.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
