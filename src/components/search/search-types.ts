import { Package, Users, FileText, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  shortcut?: string;
}

export const typeConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  product: { label: "Produto", color: "bg-primary", icon: Package },
  client: { label: "Cliente", color: "bg-success", icon: Users },
  quote: { label: "Orçamento", color: "bg-orange", icon: FileText },
  order: { label: "Pedido", color: "bg-info", icon: ShoppingCart },
};
