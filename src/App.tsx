import React, { type ReactNode, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-config";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { DevRoute } from "@/components/layout/DevRoute";
import { DeprecatedRoute } from "@/components/layout/DeprecatedRoute";
import { AppProviders } from "@/components/providers/AppProviders";
import { AccessibilityProvider, AriaLiveProvider } from "@/components/a11y";
import { getFallback } from "@/components/layout/SkeletonLoaders";
import { BridgeStatusBanner } from "@/components/BridgeStatusBanner";
import { CloudStatusBanner } from "@/components/system/CloudStatusBanner";
import { GlobalOfflineAlert } from "@/components/common/GlobalOfflineAlert";
import { DevOnlyBridgeOverlay } from "@/components/dev/DevOnlyBridgeOverlay";
import { RouteScrollReset } from "@/components/common/RouteScrollReset";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import "./App.css";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { prefetchRoute } from "@/lib/routePrefetch";
const queryClient = createQueryClient();

// Auth Pages
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Unauthorized = lazyWithRetry(() => import("@/components/access/UnauthorizedPage").then(m => ({ default: m.UnauthorizedPage })));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const PublicQuoteApproval = lazyWithRetry(() => import("./pages/PublicQuoteApprovalPage"));
const PublicKitView = lazyWithRetry(() => import("./pages/PublicKitViewPage"));
const PublicFavoriteList = lazyWithRetry(() => import("./pages/PublicFavoriteListPage"));
const PublicCollectionPage = lazyWithRetry(() => import("./pages/PublicCollectionPage"));
const PublicComparisonPage = lazyWithRetry(() => import("./pages/PublicComparisonPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Product Pages
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const FiltersPage = lazyWithRetry(() => import("./pages/FiltersPage"));
const NoveltiesPage = lazyWithRetry(() => import("./pages/NoveltiesPage"));
const ReplenishmentsPage = lazyWithRetry(() => import("./pages/ReplenishmentsPage"));
const FavoritesPage = lazyWithRetry(() => import("./pages/FavoritesPage"));
const SellerCartsPage = lazyWithRetry(() => import("./pages/SellerCartsPage"));
const ComparePage = lazyWithRetry(() => import("./pages/ComparePage"));
const CollectionsPage = lazyWithRetry(() => import("./pages/CollectionsPage"));
const PersonalizationSimulator = lazyWithRetry(() => import("./pages/PersonalizationSimulator"));
const CollectionDetailPage = lazyWithRetry(() => import("./pages/CollectionDetailPage"));

// Quote Pages
const QuoteTemplatesPage = lazyWithRetry(() => import("./pages/QuoteTemplatesPage"));
const QuotesListPage = lazyWithRetry(() => import("./pages/QuotesListPage"));
const QuotesDashboardPage = lazyWithRetry(() => import("./pages/QuotesDashboardPage"));
const QuoteBuilderPage = lazyWithRetry(() => import("./pages/QuoteBuilderPage"));
const QuoteViewPage = lazyWithRetry(() => import("./pages/QuoteViewPage"));
const QuotesKanbanPage = lazyWithRetry(() => import("./pages/QuotesKanbanPage"));

// Admin Pages
const AdminUsuariosPage = lazyWithRetry(() => import("./pages/admin/AdminUsuariosPage"));
const AdminPromoverUsuarioPage = lazyWithRetry(() => import("./pages/admin/AdminPromoverUsuarioPage"));
const AdminSegurancaPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaPage"));
const AdminCadastrosPage = lazyWithRetry(() => import("./pages/admin/AdminCadastrosPage"));
const AdminPromptsIAPage = lazyWithRetry(() => import("./pages/admin/AdminPromptsIAPage"));
const AdminProductFormPage = lazyWithRetry(() => import("./pages/admin/AdminProductFormPage"));
const AdminTelemetriaPage = lazyWithRetry(() => import("./pages/admin/AdminTelemetriaPage"));
const AdminDesignTokensPage = lazyWithRetry(() => import("./pages/admin/AdminDesignTokensPage"));
const AdminTemasPage = lazyWithRetry(() => import("./pages/admin/AdminTemasPage"));
const AdminWorkflowsPage = lazyWithRetry(() => import("./pages/admin/AdminWorkflowsPage"));
const AdminLoginAttemptsPage = lazyWithRetry(() => import("./pages/admin/AdminLoginAttemptsPage"));
const AdminExternalDbPage = lazyWithRetry(() => import("./pages/admin/AdminExternalDbPage"));
const AdminVideoVariantsPage = lazyWithRetry(() => import("./pages/admin/AdminVideoVariantsPage"));
const AdminAiUsagePage = lazyWithRetry(() => import("./pages/admin/AdminAiUsagePage"));
const KitTemplatesAdminPage = lazyWithRetry(() => import("./pages/admin/KitTemplatesAdminPage"));
const KitTemplatesMetricsPage = lazyWithRetry(() => import("./pages/admin/KitTemplatesMetricsPage"));
const PriceFreshnessSettingsPage = lazyWithRetry(() => import("./pages/admin/PriceFreshnessSettings"));

const AdminSegurancaAcessoPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaAcessoPage"));
const AdminSegurancaChavesPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaChavesPage"));
const DevChallengeExamplesPage = lazyWithRetry(() => import("./pages/admin/DevChallengeExamplesPage"));
const AdminMigracaoPapeisPage = lazyWithRetry(() => import("./pages/admin/AdminMigracaoPapeisPage"));
const AdminConexoesPage = lazyWithRetry(() => import("./pages/admin/AdminConexoesPage"));
const AdminConexoesStatusPage = lazyWithRetry(() => import("./pages/admin/AdminConexoesStatusPage"));
const AdminRbacRoutesPage = lazyWithRetry(() => import("./pages/admin/AdminRbacRoutesPage"));
const SellerDiscountLimitsAdminPage = lazyWithRetry(() => import("./pages/admin/SellerDiscountLimitsAdminPage"));
const RlsDenialsAdminPage = lazyWithRetry(() => import("./pages/admin/RlsDenialsAdminPage"));
const OwnershipAuditAdminPage = lazyWithRetry(() => import("./pages/admin/OwnershipAuditAdminPage"));
const ComplianceEvidencePage = lazyWithRetry(() => import("./pages/admin/ComplianceEvidencePage"));

// Tools Pages
const SimuladorWizard = lazyWithRetry(() => import("./pages/SimuladorWizard"));
const MockupGenerator = lazyWithRetry(() => import("./pages/MockupGenerator"));
const MagicUp = lazyWithRetry(() => import("./pages/MagicUp"));
const PriceSimulatorPage = lazyWithRetry(() => import("./pages/PriceSimulatorPage"));
const StockDashboardPage = lazyWithRetry(() => import("./pages/StockDashboardPage"));
const AdvancedPriceSearchPage = lazyWithRetry(() => import("./pages/AdvancedPriceSearchPage"));
const KitBuilderPage = lazyWithRetry(() => import("./pages/KitBuilderPage"));

const MeusKitsPage = lazyWithRetry(() => import("./pages/KitLibraryPage"));
const MockupHistoryPage = lazyWithRetry(() => import("./pages/MockupHistoryPage"));
const DropboxBrowserPage = lazyWithRetry(() => import("./pages/DropboxBrowserPage"));
const CommercialIntelligencePage = lazyWithRetry(() => import("./pages/CommercialIntelligencePage"));
const ProductMatchPage = lazyWithRetry(() => import("./pages/ProductMatchPage"));
const BusinessIntelligencePage = lazyWithRetry(() => import("./pages/BusinessIntelligencePage"));
const ClientComparatorPage = lazyWithRetry(() => import("./pages/ClientComparatorPage"));
const PublicDossierPage = lazyWithRetry(() => import("./pages/PublicDossierPage"));

// Orders Pages
const OrdersPage = lazyWithRetry(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazyWithRetry(() => import("./pages/OrderDetailPage"));

// Clients (CRM) Pages
const ClientsPage = lazyWithRetry(() => import("./pages/ClientsPage"));
const ClientDetailPage = lazyWithRetry(() => import("./pages/ClientDetailPage"));


// Analytics Pages
const TrendsPage = lazyWithRetry(() => import("./pages/TrendsPage"));


// System Pages
const SystemStatusPage = lazyWithRetry(() => import("./pages/SystemStatusPage"));
const RateLimitDashboard = lazyWithRetry(() => import("./pages/RateLimitDashboardPage"));
const ExternalDatabaseTest = lazyWithRetry(() => import("./pages/ExternalDatabaseTest"));

// Admin - Roles & Permissions
const PermissionsPage = lazyWithRetry(() => import("./pages/PermissionsPage"));
const RolesPage = lazyWithRetry(() => import("./pages/RolesPage"));
const RolePermissionsPage = lazyWithRetry(() => import("./pages/RolePermissionsPage"));

// Dashboard
const CustomizableDashboard = lazyWithRetry(() => import("./pages/CustomizableDashboard"));

// Auth Callbacks
const QAPage = lazyWithRetry(() => import("./pages/QAPage"));
const SidebarQAPage = lazyWithRetry(() => import("./pages/SidebarQAPage"));
const SSOCallbackPage = lazyWithRetry(() => import("./pages/SSOCallbackPage"));

/** Componente interno que roda hooks que dependem de AuthProvider */
function AppBootstrapContainer({ children }: { children: ReactNode }) {
  useAppBootstrap();
  return <>{children}</>;
}

/** Location-aware Suspense that renders route-specific skeletons */
function RouteSuspense({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Suspense fallback={getFallback(pathname)}>{children}</Suspense>;
}

/** 🚀 PREFETCH CORE CHUNKS: Warm up the next predicted routes for instant feel */
function RoutePrefetcher() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Check for save-data mode to avoid unnecessary data usage
    const conn = (navigator as any).connection;
    if (conn?.saveData) {
      return;
    }
    
    // Only prefetch core routes to keep bundle small
    if (pathname === "/login") {
       prefetchRoute("/");
       prefetchRoute("/produtos");
    } else if (pathname === "/") {
       prefetchRoute("/produtos");
       prefetchRoute("/orcamentos");
    } else if (pathname === "/produtos" || pathname === "/filtros") {
       prefetchRoute("/orcamentos/novo");
       prefetchRoute("/favoritos");
       prefetchRoute("/comparar");
    } else if (pathname.startsWith("/orcamentos")) {
       prefetchRoute("/orcamentos/novo");
    }
  }, [pathname]);
  
  return null;
}

const AppContent = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/approve/:token" element={<PublicQuoteApproval />} />
      <Route path="/proposta/:token" element={<PublicQuoteApproval />} />
      <Route path="/kit/:token" element={<PublicKitView />} />
      <Route path="/lista-publica/:token" element={<PublicFavoriteList />} />
      <Route path="/colecao-publica/:token" element={<PublicCollectionPage />} />
      <Route path="/comparar-publica/:token" element={<PublicComparisonPage />} />
      <Route path="/dossie/:token" element={<PublicDossierPage />} />
      <Route path="/auth/callback" element={<SSOCallbackPage />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protected Layout Route */}
      <Route element={<ProtectedRoute />}>
        {/* Home */}
        <Route path="/" element={<Index />} />
        <Route path="/dashboard" element={<CustomizableDashboard />} />

        {/* Products */}
        <Route path="/produtos" element={<Index />} />
        <Route path="/produto" element={<Navigate to="/produtos" replace />} />
        <Route path="/produto/:id" element={<ProductDetail />} />
        <Route path="/filtros" element={<FiltersPage />} />
        <Route path="/novidades" element={<NoveltiesPage />} />
        <Route path="/reposicao" element={<ReplenishmentsPage />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
        <Route path="/estoque" element={<StockDashboardPage />} />
        <Route path="/carrinhos" element={<SellerCartsPage />} />
        
        <Route path="/carrinhos/:cartId" element={<SellerCartsPage />} />
        <Route path="/comparar" element={<ComparePage />} />
        <Route path="/colecoes" element={<CollectionsPage />} />
        <Route path="/colecoes/:id" element={<CollectionDetailPage />} />

        {/* Quotes */}
        <Route path="/orcamentos" element={<QuotesListPage />} />
        <Route path="/orcamentos/dashboard" element={<QuotesDashboardPage />} />
        <Route path="/orcamentos/lista" element={<QuotesListPage />} />
        <Route path="/orcamentos/kanban" element={<QuotesKanbanPage />} />
        <Route path="/orcamentos/templates" element={<QuoteTemplatesPage />} />
        <Route path="/orcamentos/novo" element={<QuoteBuilderPage />} />
        <Route path="/orcamentos/:id/editar" element={<QuoteBuilderPage />} />
        <Route path="/orcamentos/:id" element={<QuoteViewPage />} />

        {/* Skins / Temas — disponível para todos os usuários autenticados (preferência local). */}
        <Route path="/admin/temas" element={<AdminTemasPage />} />

        {/* Admin Layout Route — supervisor + dev (gestão de negócio) */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
          <Route path="/admin/usuarios/promover" element={<AdminPromoverUsuarioPage />} />
          <Route path="/admin/limites-desconto" element={<SellerDiscountLimitsAdminPage />} />
          <Route path="/admin/rls-denials" element={<RlsDenialsAdminPage />} />
          <Route path="/admin/auditoria-propriedade" element={<OwnershipAuditAdminPage />} />
          <Route path="/admin/compliance" element={<ComplianceEvidencePage />} />
          <Route path="/admin/cadastros" element={<AdminCadastrosPage />} />
          <Route path="/admin/cadastros/produto/:id" element={<AdminProductFormPage />} />
          <Route path="/admin/permissoes" element={<PermissionsPage />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/role-permissoes" element={<RolePermissionsPage />} />
          <Route path="/admin/video-variantes" element={<AdminVideoVariantsPage />} />
          <Route path="/admin/kit-templates" element={<KitTemplatesAdminPage />} />
          <Route path="/admin/kit-templates/metricas" element={<KitTemplatesMetricsPage />} />
          <Route path="/admin/aprovacoes-desconto" element={<DeprecatedRoute message="A gestão de descontos foi movida para a aba 'Descontos' em Usuários." redirectTo="/admin/usuarios?tab=discounts" />} />
          <Route path="/admin/performance" element={<DeprecatedRoute message="O módulo de Performance foi descontinuado. Use o BI Comercial para análises." redirectTo="/ferramentas/bi" />} />
          <Route path="/admin/performance-comercial" element={<DeprecatedRoute message="O módulo de Performance Comercial foi descontinuado. Use o BI Comercial para análises." redirectTo="/ferramentas/bi" />} />
          <Route path="/admin/comissoes" element={<DeprecatedRoute message="O módulo de Comissões foi descontinuado nesta plataforma." redirectTo="/admin/usuarios" />} />
          <Route path="/tendencias" element={<TrendsPage />} />

          {/* DEV-ONLY — páginas técnicas com risco elevado (telemetria, conexões, secrets, MCP, audit técnico, prompts IA) */}
          <Route element={<DevRoute />}>
            <Route path="/admin/seguranca" element={<AdminSegurancaPage />} />
            <Route path="/admin/seguranca-acesso" element={<AdminSegurancaAcessoPage />} />
            <Route path="/admin/seguranca/chaves" element={<AdminSegurancaChavesPage />} />
            <Route path="/admin/seguranca/exemplos-challenge" element={<DevChallengeExamplesPage />} />
            <Route path="/admin/seguranca/migracao-papeis" element={<AdminMigracaoPapeisPage />} />
            <Route path="/admin/prompts-ia" element={<AdminPromptsIAPage />} />
            <Route path="/admin/validade-precos" element={<PriceFreshnessSettingsPage />} />
            <Route path="/admin/telemetria" element={<AdminTelemetriaPage />} />
            <Route path="/admin/design-tokens" element={<AdminDesignTokensPage />} />
            <Route path="/admin/rate-limit" element={<RateLimitDashboard />} />
            <Route path="/admin/workflows" element={<AdminWorkflowsPage />} />
            <Route path="/admin/login-attempts" element={<AdminLoginAttemptsPage />} />
            <Route path="/admin/external-db" element={<AdminExternalDbPage />} />
            <Route path="/admin/conexoes" element={<AdminConexoesPage />} />
            <Route path="/admin/conexoes/status" element={<AdminConexoesStatusPage />} />
            <Route path="/admin/rbac-rotas" element={<AdminRbacRoutesPage />} />
          </Route>
        </Route>

        {/* CRM (Clients) */}
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/clientes/:id" element={<ClientDetailPage />} />
        <Route path="/clientes/comparar" element={<ClientComparatorPage />} />

        {/* Tools */}
        <Route path="/ferramentas/mockup" element={<MockupGenerator />} />
        <Route path="/ferramentas/mockup/historico" element={<MockupHistoryPage />} />
        {/* Aliases legados / atalhos comuns que caíam em 404 */}
        <Route path="/mockup-generator" element={<Navigate to="/ferramentas/mockup" replace />} />
        <Route path="/mockup" element={<Navigate to="/ferramentas/mockup" replace />} />
        <Route path="/ferramentas/magic-up" element={<MagicUp />} />
        <Route path="/magic-up" element={<Navigate to="/ferramentas/magic-up" replace />} />
        <Route path="/ferramentas/simulador" element={<SimuladorWizard />} />
        <Route path="/ferramentas/simulador-precos" element={<PriceSimulatorPage />} />
        <Route path="/ferramentas/estoque" element={<StockDashboardPage />} />
        <Route path="/ferramentas/busca-preco" element={<AdvancedPriceSearchPage />} />
        <Route path="/ferramentas/match" element={<ProductMatchPage />} />
        <Route path="/match" element={<Navigate to="/ferramentas/match" replace />} />
        <Route path="/ferramentas/bi" element={<BusinessIntelligencePage />} />
        <Route path="/ferramentas/bi-comercial" element={<CommercialIntelligencePage />} />
        <Route path="/ferramentas/dropbox" element={<DropboxBrowserPage />} />
        
        <Route path="/ferramentas/personalizacao-sim" element={<PersonalizationSimulator />} />
        
        {/* Kits */}
        <Route path="/montar-kit" element={<KitBuilderPage />} />
        <Route path="/meus-kits" element={<MeusKitsPage />} />
        
        {/* Orders */}
        <Route path="/pedidos" element={<OrdersPage />} />
        <Route path="/pedidos/:id" element={<OrderDetailPage />} />

        {/* System */}
        <Route path="/status" element={<SystemStatusPage />} />
        <Route path="/admin/external-db-test" element={<ExternalDatabaseTest />} />

        {/* Legacy & QA */}
        <Route path="/qa" element={<QAPage />} />
        <Route path="/qa-sidebar" element={<SidebarQAPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeInitializer />
        <AccessibilityProvider>
          <AriaLiveProvider>
            <TooltipProvider>
              <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                <AuthProvider>
                  <AppBootstrapContainer>
                    <AppProviders>
                      <Toaster />
                      <Sonner />
                      <CloudStatusBanner />
                      <BridgeStatusBanner />
                      <GlobalOfflineAlert />
                      <DevOnlyBridgeOverlay />
                      <RouteScrollReset />
                      <RoutePrefetcher />
                      <RouteSuspense>
                        <AppContent />
                      </RouteSuspense>
                    </AppProviders>
                  </AppBootstrapContainer>
                </AuthProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AriaLiveProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
