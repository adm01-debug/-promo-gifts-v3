import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Crown, ShieldCheck, Shield } from "lucide-react";
import { type AppRole, type UserWithRole } from "./types";

interface RoleChangeDialogProps {
  user: UserWithRole | null;
  onClose: () => void;
  onConfirm: (userId: string, newRole: AppRole) => void;
}

export function RoleChangeDialog({ user, onClose, onConfirm }: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(user?.role ?? null);

  // Sync when user changes
  if (user && selectedRole === null) {
    setSelectedRole(user.role);
  }

  const handleClose = () => {
    setSelectedRole(null);
    onClose();
  };

  return (
    <AlertDialog open={!!user} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterar Role do Usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Selecione o novo role para <span className="font-semibold">{user?.full_name || "este usuário"}</span>
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
          <AlertDialogCancel onClick={handleClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={!selectedRole || selectedRole === user?.role}
            onClick={() => {
              if (user && selectedRole) {
                onConfirm(user.user_id, selectedRole);
                handleClose();
              }
            }}
          >
            Confirmar Alteração
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
