import { useEffect, useState, lazy, type FC } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-config";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminRoute } from "@/components/layout/AdminRoute";

import { CollectionsProvider } from "@/contexts/CollectionsContext";
import { RouteErrorBoundary } from "@/components/errors/RouteErrorBoundary";
import { AccessibilityProvider, AriaLiveProvider } from "@/components/a11y";

import { ComparisonProvider } from "@/contexts/ComparisonContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { RecentlyViewedProvider } from "@/contexts/RecentlyViewedContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
import LoadingScreen from "@/components/LoadingScreen";
import { useGlobalErrorCatcher } from "@/hooks/useErrorHandler";
import "./App.css";

// Auth Pages - Using lazyWithRetry for chunk loading resilience
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

// Tools Pages
const SimuladorWizard = lazyWithRetry(() => import("./pages/SimuladorWizard"));
const MockupGenerator = lazyWithRetry(() => import("./pages/MockupGenerator"));
const MagicUp = lazyWithRetry(() => import("./pages/MagicUp"));
const PriceSimulatorPage = lazyWithRetry(() => import("./pages/PriceSimulatorPage"));
const StockDashboardPage = lazyWithRetry(() => import("./pages/StockDashboardPage"));
const AdvancedPriceSearchPage = lazyWithRetry(() => import("./pages/AdvancedPriceSearchPage"));
const KitBuilderPage = lazyWithRetry(() => import("./pages/KitBuilderPage"));
const MeusKitsPage = lazyWithRetry(() => import("./pages/MeusKitsPage"));

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
const CustomizableDashboard = lazy(() => import("./pages/CustomizableDashboard"));

// Auth Callbacks
const SSOCallbackPage = lazy(() => import("./pages/SSOCallbackPage"));

const queryClient = createQueryClient();

import { useCatalogPrefetch } from '@/hooks/useCatalogPrefetch';

/** Componente interno que roda hooks que dependem de AuthProvider */
function AppWithAuth({ children }: { children: React.ReactNode }) {
  useCatalogPrefetch();
  return <>{children}</>;
}

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useGlobalErrorCatcher();

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
        <AccessibilityProvider>
          <AriaLiveProvider>
            <TooltipProvider>
              <AuthProvider>
                <AppWithAuth>
                <OrganizationProvider>
                <ProductsProvider>
                  <CollectionsProvider>
                    <ComparisonProvider>
                      <FavoritesProvider>
                        <RecentlyViewedProvider>
                          <Toaster />
                          <Sonner />
                          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                            <Suspense fallback={<LoadingScreen />}>
                              <Routes>
                                {/* Public Routes */}
                                <Route path="/login" element={<Auth />} errorElement={<RouteErrorBoundary />} />
                                <Route path="/reset-password" element={<ResetPassword />} errorElement={<RouteErrorBoundary />} />
                                <Route path="/approve/:token" element={<PublicQuoteApproval />} errorElement={<RouteErrorBoundary />} />
                                <Route path="/proposta/:token" element={<PublicQuoteApproval />} errorElement={<RouteErrorBoundary />} />
                                <Route path="/kit/:token" element={<PublicKitView />} errorElement={<RouteErrorBoundary />} />
                                <Route path="/auth/callback" element={<SSOCallbackPage />} errorElement={<RouteErrorBoundary />} />

                                {/* Protected Routes */}
                                <Route
                                  path="/*"
                                  element={
                                    <ProtectedRoute>
                                      <Routes>
                                        {/* Home */}
                                        <Route path="/" element={<Index />} />
                                        <Route path="/dashboard" element={<CustomizableDashboard />} />

                                        {/* Products */}
                                        <Route path="/produtos" element={<FiltersPage />} />
                                        <Route path="/produto" element={<Navigate to="/produtos" replace />} />
                                        <Route path="/produto/:id" element={<ProductDetail />} />
                                        <Route path="/filtros" element={<Navigate to="/produtos" replace />} />
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

                                        {/* Admin — protegido por role */}
                                        <Route path="/configuracoes" element={<Navigate to="/admin/usuarios" replace />} />
                                        <Route path="/admin" element={<Navigate to="/admin/usuarios" replace />} />
                                        <Route path="/admin/usuarios" element={<AdminRoute><AdminUsuariosPage /></AdminRoute>} />
                                        <Route path="/admin/seguranca" element={<AdminRoute><AdminSegurancaPage /></AdminRoute>} />
                                        <Route path="/admin/cadastros" element={<AdminRoute><AdminCadastrosPage /></AdminRoute>} />
                                        <Route path="/admin/cadastros/produto/:id" element={<AdminRoute><AdminProductFormPage /></AdminRoute>} />
                                        <Route path="/admin/prompts-ia" element={<AdminRoute><AdminPromptsIAPage /></AdminRoute>} />
                                        <Route path="/admin/telemetria" element={<AdminRoute><AdminTelemetriaPage /></AdminRoute>} />
                                        <Route path="/admin/personalizacao" element={<Navigate to="/admin/cadastros" replace />} />
                                        <Route path="/cadastro-produtos" element={<Navigate to="/admin/cadastros" replace />} />
                                        <Route path="/cadastro-gravacao" element={<Navigate to="/admin/cadastros" replace />} />
                                        <Route path="/admin/permissoes" element={<AdminRoute><PermissionsPage /></AdminRoute>} />
                                        <Route path="/admin/roles" element={<AdminRoute><RolesPage /></AdminRoute>} />
                                        <Route path="/admin/role-permissoes" element={<AdminRoute><RolePermissionsPage /></AdminRoute>} />
                                        <Route path="/admin/rate-limit" element={<AdminRoute><RateLimitDashboard /></AdminRoute>} />

                                        {/* Tools Routes */}
                                        <Route path="/simulador" element={<SimuladorWizard />} />
                                        <Route path="/simulador-precos" element={<PriceSimulatorPage />} />
                                        <Route path="/estoque" element={<StockDashboardPage />} />
                                        <Route path="/busca-preco" element={<AdvancedPriceSearchPage />} />
                                        <Route path="/montar-kit" element={<KitBuilderPage />} />
                                        <Route path="/meus-kits" element={<MeusKitsPage />} />
                                        <Route path="/mockup" element={<Navigate to="/mockup-generator" replace />} />
                                        <Route path="/mockup-generator" element={<MockupGenerator />} />
                                        <Route path="/magic-up" element={<MagicUp />} />

                                        {/* Orders */}
                                        <Route path="/pedidos" element={<OrdersPage />} />
                                        <Route path="/pedidos/:id" element={<OrderDetailPage />} />

                                        {/* User Routes */}
                                        <Route path="/perfil" element={<ProfilePage />} />
                                        <Route path="/seguranca" element={<Navigate to="/perfil" replace />} />

                                        {/* Analytics — admin/manager only */}
                                        <Route path="/bi" element={<AdminRoute><BIDashboard /></AdminRoute>} />
                                        <Route path="/tendencias" element={<AdminRoute><TrendsPage /></AdminRoute>} />

                                        {/* System — admin only */}
                                        <Route path="/status" element={<AdminRoute><SystemStatusPage /></AdminRoute>} />
                                        <Route path="/external-db-test" element={<AdminRoute><ExternalDatabaseTest /></AdminRoute>} />

                                        {/* Fallback */}
                                        <Route path="*" element={<NotFound />} />
                                      </Routes>
                                    </ProtectedRoute>
                                  }
                                />
                              </Routes>
                            </Suspense>
                          </BrowserRouter>
                        </RecentlyViewedProvider>
                      </FavoritesProvider>
                    </ComparisonProvider>
                  </CollectionsProvider>
                </ProductsProvider>
                </OrganizationProvider>
                </AppWithAuth>
              </AuthProvider>
            </TooltipProvider>
          </AriaLiveProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
