import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserCog, Loader2, KeyRound, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasswordResetApproval } from "@/components/admin/PasswordResetApproval";
import { usePasswordResetRequests } from "@/hooks/usePasswordResetRequests";

import { useUserManagement } from "@/components/admin/users/useUserManagement";
import { UserStatsCards } from "@/components/admin/users/UserStatsCards";
import { UserTable } from "@/components/admin/users/UserTable";
import { RoleChangeDialog } from "@/components/admin/users/RoleChangeDialog";
import { EditUserDialog } from "@/components/admin/users/EditUserDialog";
import { CreateUserDialog } from "@/components/admin/users/CreateUserDialog";
import { DeleteUserDialog } from "@/components/admin/users/DeleteUserDialog";
import { type UserWithRole } from "@/components/admin/users/types";

export default function AdminUsuariosPage() {
  const { user } = useAuth();
  const { pendingCount } = usePasswordResetRequests();
  const {
    users, isLoading, updatingUserId,
    fetchUsers, handleRoleChange, handleCreateUser, handleDeleteUser, handleSaveEdit,
    handleAvatarUpload, handleRemoveAvatar,
  } = useUserManagement();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roleDialogUser, setRoleDialogUser] = useState<UserWithRole | null>(null);
  const [editDialogUser, setEditDialogUser] = useState<UserWithRole | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<UserWithRole | null>(null);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const managerCount = users.filter((u) => u.role === "manager").length;
  const vendedorCount = users.filter((u) => u.role === "vendedor").length;

  const filteredUsers = users
    .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "pt-BR", { sensitivity: "base" }))
    .filter((u) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (u.full_name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
    });

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

        <UserStatsCards
          total={users.length}
          adminCount={adminCount}
          managerCount={managerCount}
          vendedorCount={vendedorCount}
          pendingCount={pendingCount}
        />

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
              <CardContent className="space-y-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? "Nenhum usuário encontrado para esta busca" : "Nenhum usuário encontrado"}
                  </div>
                ) : (
                  <UserTable
                    users={filteredUsers}
                    currentUserId={user?.id}
                    updatingUserId={updatingUserId}
                    onEditUser={setEditDialogUser}
                    onChangeRole={setRoleDialogUser}
                    onDeleteUser={setDeleteDialogUser}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password-reset">
            <PasswordResetApproval />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <RoleChangeDialog
          user={roleDialogUser}
          onClose={() => setRoleDialogUser(null)}
          onConfirm={handleRoleChange}
        />
        <EditUserDialog
          user={editDialogUser}
          onClose={() => setEditDialogUser(null)}
          onSave={handleSaveEdit}
          onUploadAvatar={handleAvatarUpload}
          onRemoveAvatar={handleRemoveAvatar}
        />
        <CreateUserDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreate={handleCreateUser}
        />
        <DeleteUserDialog
          user={deleteDialogUser}
          onClose={() => setDeleteDialogUser(null)}
          onConfirm={handleDeleteUser}
        />
      </div>
    </MainLayout>
  );
}
