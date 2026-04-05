import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, ShieldCheck, Loader2, Pencil, Trash2 } from "lucide-react";
import { type UserWithRole, roleConfig } from "./types";

interface UserTableProps {
  users: UserWithRole[];
  currentUserId: string | undefined;
  updatingUserId: string | null;
  onEditUser: (user: UserWithRole) => void;
  onChangeRole: (user: UserWithRole) => void;
  onDeleteUser: (user: UserWithRole) => void;
}

export function UserTable({ users, currentUserId, updatingUserId, onEditUser, onChangeRole, onDeleteUser }: UserTableProps) {
  return (
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
                    {userItem.user_id === currentUserId && (
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
                  <Button variant="ghost" size="icon" aria-label="Editar" className="h-8 w-8" onClick={() => onEditUser(userItem)} title="Editar usuário">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {userItem.user_id !== currentUserId && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => onChangeRole(userItem)} disabled={updatingUserId === userItem.user_id}>
                        {updatingUserId === userItem.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar Role"}
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Excluir" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteUser(userItem)} title="Excluir usuário">
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
  );
}
