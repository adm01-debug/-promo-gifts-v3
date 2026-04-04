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
  product: { label: "Produto", color: "bg-blue-500", icon: Package },
  client: { label: "Cliente", color: "bg-green-500", icon: Users },
  quote: { label: "Orçamento", color: "bg-orange-500", icon: FileText },
  order: { label: "Pedido", color: "bg-purple-500", icon: ShoppingCart },
};
