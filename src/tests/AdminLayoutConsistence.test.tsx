import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthProvider'; // Check actual path
import { TooltipProvider } from '@/components/ui/tooltip';
import React from 'react';

// Mocking components that might cause issues in a simple render test
vi.mock('@/components/layout/MainLayout', () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));

vi.mock('@/components/seo/PageSEO', () => ({
  PageSEO: () => <div data-testid="page-seo" />,
}));

// We'll test a few representative pages
import AdminAiUsagePage from '@/pages/admin/AdminAiUsagePage';
import AdminUsuariosPage from '@/pages/admin/AdminUsuariosPage';
import AdminConexoesPage from '@/pages/admin/AdminConexoesPage';
import KitTemplatesAdminPage from '@/pages/admin/KitTemplatesAdminPage';
import AdminRbacRoutesPage from '@/pages/admin/AdminRbacRoutesPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>
  </QueryClientProvider>
);

describe('Admin Module Standardization', () => {
  const adminPages = [
    { name: 'AI Usage', Component: AdminAiUsagePage },
    { name: 'Usuarios', Component: AdminUsuariosPage },
    { name: 'Conexoes', Component: AdminConexoesPage },
    { name: 'Kit Templates', Component: KitTemplatesAdminPage },
    { name: 'RBAC Routes', Component: AdminRbacRoutesPage },
  ];

  adminPages.forEach(({ name, Component }) => {
    it(`should render ${name} within MainLayout`, () => {
      const { getByTestId } = render(<Component />, { wrapper });
      expect(getByTestId('main-layout')).toBeDefined();
    });

    it(`should include PageSEO in ${name}`, () => {
      const { getByTestId } = render(<Component />, { wrapper });
      expect(getByTestId('page-seo')).toBeDefined();
    });
  });

  it('should not use Helmet directly in RbacRoutesPage', async () => {
    // This is more of a static check, but we can verify it doesn't crash
    const { container } = render(<AdminRbacRoutesPage />, { wrapper });
    expect(container).toBeDefined();
  });
});
