import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';

// Mocks to bypass environment issues in JSDOM
vi.mock('@/components/layout/Header', () => ({
  Header: ({ onMenuToggle }: any) => (
    <header>
      <button onClick={onMenuToggle} aria-label="Abrir menu">Toggle</button>
    </header>
  )
}));

vi.mock('@/components/layout/SidebarReorganized', () => ({
  SidebarReorganized: ({ isOpen, onToggle }: any) => (
    <aside 
      aria-label="Menu principal"
      className={isOpen ? 'translate-x-0' : '-translate-x-full'}
    >
      <button onClick={onToggle} aria-label="Fechar menu">Close</button>
    </aside>
  )
}));

describe('Admin Mobile Interaction', () => {
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

  it('should toggle sidebar correctly in mobile viewport simulation', async () => {
    global.innerWidth = 375;
    global.dispatchEvent(new Event('resize'));

    render(<MainLayout>Content</MainLayout>, { wrapper });

    const sidebar = screen.getByRole('complementary', { hidden: true }) || screen.getByLabelText(/menu principal/i);
    expect(sidebar.className).toContain('-translate-x-full');

    // Open
    const toggleBtn = screen.getByLabelText(/abrir menu/i);
    fireEvent.click(toggleBtn);
    expect(sidebar.className).toContain('translate-x-0');

    // Close
    const closeBtn = screen.getByLabelText(/fechar menu/i);
    fireEvent.click(closeBtn);
    expect(sidebar.className).toContain('-translate-x-full');
  });
});
