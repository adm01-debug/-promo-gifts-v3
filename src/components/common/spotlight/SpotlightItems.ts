/**
 * Spotlight navigation items definition — extracted from EnhancedSpotlight
 */
import React from "react";
import {
  Package, FileText, Users, Settings, BarChart3, Wand2,
  Sparkles, Plus, Heart, Calculator, TrendingUp,
  FolderOpen, GitCompare, ShoppingCart,
} from "lucide-react";

export interface SpotlightItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  shortcut?: string;
  isQuickAction?: boolean;
}

export function buildSpotlightItems(navigate: (path: string) => void): SpotlightItem[] {
  return [
    // Quick Actions
    { id: "new-quote", title: "Novo Orçamento", description: "Criar orçamento rapidamente", icon: React.createElement(Plus, { className: "h-4 w-4" }), action: () => navigate("/orcamentos/novo"), category: "Ações Rápidas", shortcut: "N", isQuickAction: true },
    { id: "mockup-quick", title: "Gerar Mockup", description: "Criar mockup com logo", icon: React.createElement(Wand2, { className: "h-4 w-4" }), action: () => navigate("/mockup-generator"), category: "Ações Rápidas", shortcut: "M", isQuickAction: true },
    // Navigation
    { id: "products", title: "Catálogo de Produtos", description: "Navegar pelo catálogo completo", icon: React.createElement(Package, { className: "h-4 w-4" }), action: () => navigate("/"), category: "Navegação" },
    { id: "quotes", title: "Orçamentos", description: "Gerenciar todos os orçamentos", icon: React.createElement(FileText, { className: "h-4 w-4" }), action: () => navigate("/orcamentos"), category: "Navegação" },
    { id: "collections", title: "Coleções", description: "Ver suas coleções", icon: React.createElement(FolderOpen, { className: "h-4 w-4" }), action: () => navigate("/colecoes"), category: "Navegação" },
    { id: "favorites", title: "Favoritos", description: "Produtos favoritos", icon: React.createElement(Heart, { className: "h-4 w-4" }), action: () => navigate("/favoritos"), category: "Navegação" },
    { id: "seller-carts", title: "Carrinhos", description: "Gerenciar carrinhos de orçamento", icon: React.createElement(ShoppingCart, { className: "h-4 w-4" }), action: () => navigate("/carrinhos"), category: "Navegação" },
    { id: "compare", title: "Comparar Produtos", description: "Comparação lado a lado", icon: React.createElement(GitCompare, { className: "h-4 w-4" }), action: () => navigate("/comparar"), category: "Navegação" },
    // Tools
    { id: "simulator", title: "Simulador de Custos", description: "Calcular personalização", icon: React.createElement(Calculator, { className: "h-4 w-4" }), action: () => navigate("/simulador"), category: "Ferramentas" },
    { id: "mockup", title: "Gerador de Mockup", description: "Mockups profissionais", icon: React.createElement(Wand2, { className: "h-4 w-4" }), action: () => navigate("/mockup-generator"), category: "Ferramentas" },
    { id: "magic-up", title: "Magic Up", description: "IA para edição de imagens", icon: React.createElement(Sparkles, { className: "h-4 w-4" }), action: () => navigate("/magic-up"), category: "Ferramentas" },
    { id: "commercial-intelligence", title: "Inteligência Comercial", description: "Insights estratégicos de vendas", icon: React.createElement(BarChart3, { className: "h-4 w-4" }), action: () => navigate("/inteligencia-comercial"), category: "Ferramentas" },
    // Analytics
    { id: "dashboard", title: "Dashboard BI", description: "Métricas e análises", icon: React.createElement(BarChart3, { className: "h-4 w-4" }), action: () => navigate("/bi"), category: "Analytics" },
    { id: "trends", title: "Tendências", description: "Análise de tendências", icon: React.createElement(TrendingUp, { className: "h-4 w-4" }), action: () => navigate("/tendencias"), category: "Analytics" },
    // Admin
    { id: "users-admin", title: "Gestão de Usuários", description: "Gerenciar usuários e perfis", icon: React.createElement(Settings, { className: "h-4 w-4" }), action: () => navigate("/admin/usuarios"), category: "Admin" },
  ];
}
