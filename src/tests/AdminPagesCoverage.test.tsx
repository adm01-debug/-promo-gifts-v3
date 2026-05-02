import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';

// Import all admin pages
const adminPageModules = import.meta.glob('@/pages/admin/*.tsx', { eager: true });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>
  </QueryClientProvider>
);

describe('Admin Module Programmatic Coverage', () => {
  Object.entries(adminPageModules).forEach(([path, module]: [string, any]) => {
    const Component = module.default;
    if (typeof Component !== 'function') return;

    const pageName = path.split('/').pop()?.replace('.tsx', '');

    it(`${pageName} should render within MainLayout (programmatic check)`, () => {
      render(<Component />, { wrapper });
      
      // MainLayout contains an element with role="document" or a specific test id
      // From previous code--view of MainLayout, it has role="document"
      const layout = screen.queryByRole('document');
      expect(layout).not.toBeNull();
      
      // Check for Sidebar content which is inside MainLayout
      // We look for the main nav element
      const nav = screen.queryByRole('navigation', { name: /menu principal/i });
      expect(nav).not.toBeNull();
    });

    it(`${pageName} should use standard container classes`, () => {
      render(<Component />, { wrapper });
      // The standard container div we applied to all admin pages
      const mainContent = screen.queryByRole('main');
      expect(mainContent).not.toBeNull();
      
      const standardContainer = mainContent?.querySelector('.max-w-\\[1920px\\]');
      expect(standardContainer).not.toBeNull();
      expect(standardContainer?.className).toContain('mx-auto');
    });
  });
});
