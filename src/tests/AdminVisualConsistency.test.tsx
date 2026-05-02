import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import React from 'react';
import AdminConexoesPage from '@/pages/admin/AdminConexoesPage';
import AdminUsuariosPage from '@/pages/admin/AdminUsuariosPage';

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

describe('Admin Visual Consistency Snapshot', () => {
  it('Conexoes and Usuarios should have matching container structure', () => {
    const { container: conexoesContainer } = render(<AdminConexoesPage />, { wrapper });
    const { container: usuariosContainer } = render(<AdminUsuariosPage />, { wrapper });
    
    const conexoesMain = conexoesContainer.querySelector('main');
    const usuariosMain = usuariosContainer.querySelector('main');
    
    // MainLayout wraps children in a main element
    expect(conexoesMain).not.toBeNull();
    expect(usuariosMain).not.toBeNull();
    
    // In our padronization, the content is always wrapped in an animate-fade-in div.
    // We look for it by role "main" then its direct children which should contain the layout classes.
    const conexoesContent = conexoesMain?.querySelector('div');
    const usuariosContent = usuariosMain?.querySelector('div');
    
    expect(conexoesContent?.className).toContain('mx-auto');
    expect(conexoesContent?.className).toContain('max-w-');
    expect(usuariosContent?.className).toBe(conexoesContent?.className);
  });
});
