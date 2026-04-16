import { Package, Users, FileText, ShoppingCart, FolderHeart, Boxes, Sparkles, Image as ImageIcon } from "lucide-react";
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
  collection: { label: "Coleção", color: "bg-pink-500", icon: FolderHeart },
  kit: { label: "Kit", color: "bg-violet-500", icon: Boxes },
  mockup: { label: "Mockup", color: "bg-fuchsia-500", icon: Sparkles },
  art_file: { label: "Arquivo", color: "bg-amber-500", icon: ImageIcon },
};
