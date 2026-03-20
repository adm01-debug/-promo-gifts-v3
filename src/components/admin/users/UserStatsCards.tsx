import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Crown, ShieldCheck, Shield, KeyRound } from "lucide-react";

interface UserStatsCardsProps {
  total: number;
  adminCount: number;
  managerCount: number;
  vendedorCount: number;
  pendingCount: number;
}

export function UserStatsCards({ total, adminCount, managerCount, vendedorCount, pendingCount }: UserStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-5">
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
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
  );
}
