import { useEffect, useState, type FC } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-config";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";
import { AppProviders } from "@/components/providers/AppProviders";
import { RouteErrorBoundary } from "@/components/errors/RouteErrorBoundary";
import { AccessibilityProvider, AriaLiveProvider } from "@/components/a11y";
import LoadingScreen from "@/components/LoadingScreen";
import { useGlobalErrorCatcher } from "@/hooks/useErrorHandler";
import { getFallback } from "@/components/layout/SkeletonLoaders";
import "./App.css";

// Auth Pages
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const PublicQuoteApproval = lazyWithRetry(() => import("./pages/PublicQuoteApprovalPage"));
const PublicKitView = lazyWithRetry(() => import("./pages/PublicKitViewPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

// Product Pages
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const FiltersPage = lazyWithRetry(() => import("./pages/FiltersPage"));
const NoveltiesPage = lazyWithRetry(() => import("./pages/NoveltiesPage"));
const FavoritesPage = lazyWithRetry(() => import("./pages/FavoritesPage"));
const SellerCartsPage = lazyWithRetry(() => import("./pages/SellerCartsPage"));
const ComparePage = lazyWithRetry(() => import("./pages/ComparePage"));
const CollectionsPage = lazyWithRetry(() => import("./pages/CollectionsPage"));
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
const AdminSegurancaPage = lazyWithRetry(() => import("./pages/admin/AdminSegurancaPage"));
const AdminCadastrosPage = lazyWithRetry(() => import("./pages/admin/AdminCadastrosPage"));
const AdminPromptsIAPage = lazyWithRetry(() => import("./pages/admin/AdminPromptsIAPage"));
const AdminProductFormPage = lazyWithRetry(() => import("./pages/admin/AdminProductFormPage"));
const AdminTelemetriaPage = lazyWithRetry(() => import("./pages/admin/AdminTelemetriaPage"));
const AdminTemasPage = lazyWithRetry(() => import("./pages/admin/AdminTemasPage"));
const AdminWorkflowsPage = lazyWithRetry(() => import("./pages/admin/AdminWorkflowsPage"));
const AdminLoginAttemptsPage = lazyWithRetry(() => import("./pages/admin/AdminLoginAttemptsPage"));
const AdminExternalDbPage = lazyWithRetry(() => import("./pages/admin/AdminExternalDbPage"));
const AdminVideoVariantsPage = lazyWithRetry(() => import("./pages/admin/AdminVideoVariantsPage"));

// Tools Pages
const SimuladorWizard = lazyWithRetry(() => import("./pages/SimuladorWizard"));
const MockupGenerator = lazyWithRetry(() => import("./pages/MockupGenerator"));
const MagicUp = lazyWithRetry(() => import("./pages/MagicUp"));
const PriceSimulatorPage = lazyWithRetry(() => import("./pages/PriceSimulatorPage"));
const StockDashboardPage = lazyWithRetry(() => import("./pages/StockDashboardPage"));
const AdvancedPriceSearchPage = lazyWithRetry(() => import("./pages/AdvancedPriceSearchPage"));
const KitBuilderPage = lazyWithRetry(() => import("./pages/KitBuilderPage"));
const MeusKitsPage = lazyWithRetry(() => import("./pages/MeusKitsPage"));
const MockupHistoryPage = lazyWithRetry(() => import("./pages/MockupHistoryPage"));
const DropboxBrowserPage = lazyWithRetry(() => import("./pages/DropboxBrowserPage"));
const CommercialIntelligencePage = lazyWithRetry(() => import("./pages/CommercialIntelligencePage"));
const ProductMatchPage = lazyWithRetry(() => import("./pages/ProductMatchPage"));

// Orders Pages
const OrdersPage = lazyWithRetry(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazyWithRetry(() => import("./pages/OrderDetailPage"));

// User Pages
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"));

// Analytics Pages
const BIDashboard = lazyWithRetry(() => import("./pages/BIDashboard"));
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
const SSOCallbackPage = lazyWithRetry(() => import("./pages/SSOCallbackPage"));

const queryClient = createQueryClient();

import { useCatalogPrefetch } from '@/hooks/useCatalogPrefetch';
import { loadThemeConfig, applyThemePreset, applyRadius } from '@/lib/theme-presets';
import { ThemeInitializer } from '@/components/ThemeInitializer';

/** Componente interno que roda hooks que dependem de AuthProvider */
function AppWithAuth({ children }: { children: React.ReactNode }) {
  useCatalogPrefetch();
  return <>{children}</>;
}

/** Location-aware Suspense that renders route-specific skeletons */
function RouteSuspense({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <Suspense fallback={getFallback(pathname)}>{children}</Suspense>;
}

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useGlobalErrorCatcher();

  // Apply saved theme on boot (ThemeInitializer handles re-apply on mode change)
  useEffect(() => {
    const cfg = loadThemeConfig();
    const mode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    applyThemePreset(cfg.presetId, mode);
    applyRadius(cfg.radius);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemeInitializer />
        <AccessibilityProvider>
          <AriaLiveProvider>
            <TooltipProvider>
              <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                <AuthProvider>
                  <AppWithAuth>
                    <AppProviders>
                      <Toaster />
                      <Sonner />
                      <RouteSuspense>
                        <Routes>
                          {/* Public Routes */}
                          <Route path="/login" element={<Auth />} errorElement={<RouteErrorBoundary />} />
                          <Route path="/reset-password" element={<ResetPassword />} errorElement={<RouteErrorBoundary />} />
                          <Route path="/approve/:token" element={<PublicQuoteApproval />} errorElement={<RouteErrorBoundary />} />
                          <Route path="/proposta/:token" element={<PublicQuoteApproval />} errorElement={<RouteErrorBoundary />} />
                          <Route path="/kit/:token" element={<PublicKitView />} errorElement={<RouteErrorBoundary />} />
                          <Route path="/auth/callback" element={<SSOCallbackPage />} errorElement={<RouteErrorBoundary />} />

                          {/* Protected Layout Route */}
                          <Route element={<ProtectedRoute />} errorElement={<RouteErrorBoundary />}>
                            {/* Home */}
                            <Route path="/" element={<Index />} />
                            <Route path="/dashboard" element={<CustomizableDashboard />} />

                            {/* Products */}
                            <Route path="/produtos" element={<FiltersPage />} />
                            <Route path="/produto" element={<Navigate to="/produtos" replace />} />
                            <Route path="/produto/:id" element={<ProductDetail />} />
                            <Route path="/filtros" element={<FiltersPage />} />
                            <Route path="/novidades" element={<NoveltiesPage />} />
                            <Route path="/favoritos" element={<FavoritesPage />} />
                            <Route path="/carrinhos" element={<SellerCartsPage />} />
                            <Route path="/carrinhos/novo" element={<SellerCartsPage />} />
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

                            {/* Admin Layout Route */}
                            <Route element={<AdminRoute />} errorElement={<RouteErrorBoundary />}>
                              <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
                              <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
                              <Route path="/admin/seguranca" element={<AdminSegurancaPage />} />
                              <Route path="/admin/cadastros" element={<AdminCadastrosPage />} />
                              <Route path="/admin/cadastros/produto/:id" element={<AdminProductFormPage />} />
                              <Route path="/admin/prompts-ia" element={<AdminPromptsIAPage />} />
                              <Route path="/admin/telemetria" element={<AdminTelemetriaPage />} />
                              <Route path="/admin/permissoes" element={<PermissionsPage />} />
                              <Route path="/admin/roles" element={<RolesPage />} />
                              <Route path="/admin/role-permissoes" element={<RolePermissionsPage />} />
                              <Route path="/admin/rate-limit" element={<RateLimitDashboard />} />
                              <Route path="/admin/temas" element={<AdminTemasPage />} />
                              <Route path="/admin/workflows" element={<AdminWorkflowsPage />} />
                              <Route path="/admin/login-attempts" element={<AdminLoginAttemptsPage />} />
                              <Route path="/admin/external-db" element={<AdminExternalDbPage />} />
                              <Route path="/admin/video-variantes" element={<AdminVideoVariantsPage />} />
                              <Route path="/bi" element={<BIDashboard />} />
                              <Route path="/tendencias" element={<TrendsPage />} />
                              <Route path="/status" element={<SystemStatusPage />} />
                              <Route path="/external-db-test" element={<ExternalDatabaseTest />} />
                            </Route>

                            {/* Redirects */}
                            <Route path="/configuracoes" element={<Navigate to="/admin/usuarios" replace />} />
                            <Route path="/admin/personalizacao" element={<Navigate to="/admin/cadastros" replace />} />
                            <Route path="/cadastro-produtos" element={<Navigate to="/admin/cadastros" replace />} />
                            <Route path="/cadastro-gravacao" element={<Navigate to="/admin/cadastros" replace />} />

                            {/* Tools */}
                            <Route path="/simulador" element={<SimuladorWizard />} />
                            <Route path="/simulador-precos" element={<PriceSimulatorPage />} />
                            <Route path="/estoque" element={<StockDashboardPage />} />
                            <Route path="/busca-preco" element={<AdvancedPriceSearchPage />} />
                            <Route path="/montar-kit" element={<KitBuilderPage />} />
                            <Route path="/kit-builder" element={<Navigate to="/montar-kit" replace />} />
                            <Route path="/meus-kits" element={<MeusKitsPage />} />
                            <Route path="/mockup" element={<Navigate to="/mockup-generator" replace />} />
                            <Route path="/mockup-generator" element={<MockupGenerator />} />
                            <Route path="/mockups/historico" element={<MockupHistoryPage />} />
                            <Route path="/magic-up" element={<MagicUp />} />
                            <Route path="/inteligencia-comercial" element={<CommercialIntelligencePage />} />
                            <Route path="/match" element={<ProductMatchPage />} />
                            <Route path="/dropbox" element={<DropboxBrowserPage />} />

                            {/* Orders */}
                            <Route path="/pedidos" element={<OrdersPage />} />
                            <Route path="/pedidos/:id" element={<OrderDetailPage />} />

                            {/* User */}
                            <Route path="/perfil" element={<ProfilePage />} />
                            <Route path="/seguranca" element={<Navigate to="/perfil" replace />} />

                            {/* Fallback */}
                            <Route path="*" element={<NotFound />} />
                          </Route>
                        </Routes>
                      </RouteSuspense>
                    </AppProviders>
                  </AppWithAuth>
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
