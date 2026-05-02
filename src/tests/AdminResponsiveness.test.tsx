import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

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

describe('Admin Layout Responsiveness', () => {
  it('should handle mobile sidebar as a drawer overlay', () => {
    // Mock window.innerWidth for mobile
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<MainLayout>Test Content</MainLayout>, { wrapper });

    // The MainLayout always renders an aside with role navigation
    // Note: MainLayout uses lazy loading for Sidebar, we might need to use findByRole 
    // or just check the presence of the navigation role in the document
    const sidebar = screen.getByRole('navigation');
    
    // In mobile width (375px), it should have the classes for absolute/fixed positioning
    expect(sidebar.className).toContain('fixed');
    // Initially closed on mobile
    expect(sidebar.className).toContain('-translate-x-full');
    // On desktop it should be visible
    expect(sidebar.className).toContain('lg:translate-x-0');

    // Content should not be overlapped (it's flex-1, the sidebar is fixed/absolute in mobile)
    const main = screen.getByRole('main');
    expect(main).toBeDefined();
  });
});
