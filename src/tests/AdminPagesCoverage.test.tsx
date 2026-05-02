import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';

// Mocking heavy providers/components that require specific context setup
vi.mock('@/contexts/DevChallengeContext', () => ({
  DevChallengeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDevChallenge: () => ({ challenge: null, isLoading: false, markStepCompleted: vi.fn(), isStepCompleted: vi.fn().mockReturnValue(false) }),
}));

// Partially mocking MainLayout to avoid deep provider issues while keeping the structure for testing
vi.mock('@/components/layout/MainLayout', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    MainLayout: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="main-layout" role="document">
        <nav aria-label="Menu principal">Mock Sidebar</nav>
        <main role="main">{children}</main>
      </div>
    ),
  };
});

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
  // Silence console warnings for cleaner output during bulk render tests
  const originalError = console.error;
  const originalWarn = console.warn;
  
  beforeAll(() => {
    console.error = (...args) => {
      if (args[0]?.toString().includes('act(...)') || args[0]?.toString().includes('HelmetProvider')) return;
      originalError(...args);
    };
    console.warn = (...args) => {
      if (args[0]?.toString().includes('React Router Future Flag')) return;
      originalWarn(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  Object.entries(adminPageModules).forEach(([path, module]: [string, any]) => {
    const Component = module.default;
    if (typeof Component !== 'function') return;

    const pageName = path.split('/').pop()?.replace('.tsx', '');

    it(`${pageName} should render within MainLayout`, () => {
      render(<Component />, { wrapper });
      expect(screen.queryByTestId('main-layout')).not.toBeNull();
      expect(screen.queryByRole('navigation', { name: /menu principal/i })).not.toBeNull();
    });

    it(`${pageName} should use standard container classes`, () => {
      render(<Component />, { wrapper });
      const mainContent = screen.queryByRole('main');
      expect(mainContent).not.toBeNull();
      
      // Some pages use specific max-w like max-w-[1400px] or max-w-5xl, but we ensured all use max-w- now
      const standardContainer = mainContent?.querySelector('[class*="max-w-"]');
      expect(standardContainer, `Page ${pageName} missing max-w- container`).not.toBeNull();
    });
  });
});

