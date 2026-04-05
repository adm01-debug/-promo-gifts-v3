import React from "react";
import { Crown, ShieldCheck, Shield } from "lucide-react";

export type AppRole = "admin" | "manager" | "vendedor";

export interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
  is_active: boolean | null;
}

export const roleConfig: Record<AppRole, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline"; color: string }> = {
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
    color: "bg-primary text-primary-foreground",
  },
  vendedor: {
    label: "Vendedor",
    icon: <Shield className="h-3 w-3" />,
    variant: "secondary",
    color: "",
  },
};
