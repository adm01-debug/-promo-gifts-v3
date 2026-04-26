import React from "react";
import { Code2, ShieldCheck, Shield } from "lucide-react";

/**
 * Hierarquia oficial: dev > supervisor > vendedor (=agente no UI).
 * Mantemos 'admin' e 'manager' como aliases legados para evitar quebras
 * em dados antigos — o backend já normaliza ambos para supervisor.
 */
export type AppRole = "dev" | "supervisor" | "vendedor" | "admin" | "manager";

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

type RoleMeta = {
  label: string;
  icon: React.ReactNode;
  variant: "default" | "secondary" | "outline";
  color: string;
};

export const roleConfig: Record<AppRole, RoleMeta> = {
  dev: {
    label: "Dev",
    icon: <Code2 className="h-3 w-3" />,
    variant: "default",
    color: "bg-purple-600 text-white",
  },
  supervisor: {
    label: "Supervisor",
    icon: <ShieldCheck className="h-3 w-3" />,
    variant: "default",
    color: "bg-primary text-primary-foreground",
  },
  vendedor: {
    label: "Agente",
    icon: <Shield className="h-3 w-3" />,
    variant: "secondary",
    color: "",
  },
  // Aliases legados — exibidos como Supervisor por compatibilidade
  admin: {
    label: "Supervisor",
    icon: <ShieldCheck className="h-3 w-3" />,
    variant: "default",
    color: "bg-primary text-primary-foreground",
  },
  manager: {
    label: "Supervisor",
    icon: <ShieldCheck className="h-3 w-3" />,
    variant: "default",
    color: "bg-primary text-primary-foreground",
  },
};
